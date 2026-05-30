import { escapeHtml } from '../util/dom.js';
import type { Session, Turn } from '../types/index.js';
import type { AcpMessage, AcpSessionInfo, AcpSnapshot } from './client.js';

export const ACP_SESSION_ID = 'acp-live';

const pad = (n: number): string => String(n).padStart(2, '0');

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

function sanitizeUserPrompt(raw: string): string {
  let cleaned = raw;
  cleaned = cleaned.replace(/<system-reminder>[\s\S]*?<\/system-reminder>\s*/gi, '');
  cleaned = cleaned.replace(
    /<!-- OMO_INTERNAL_INITIATOR -->[\s\S]*?(?:Continue if you have next steps, or stop and ask for clarification if you are unsure how to proceed\.?)\s*/gi,
    '',
  );
  cleaned = cleaned.replace(/<!-- OMO_INTERNAL_INITIATOR -->\s*/gi, '');
  cleaned = cleaned.replace(/\[Pasted ~?[^<\]]*(?=<|$)/gi, '');
  return cleaned.trim();
}

function acpMessageToTurn(msg: AcpMessage): Turn {
  if (msg.role === 'user') {
    const text = msg.chunks.map((c) => c.text).join('');
    return {
      kind: 'human',
      who: 'You',
      role: 'human',
      time: formatTime(msg.createdAt),
      text: escapeHtml(sanitizeUserPrompt(text)),
    };
  }
  const textChunks = msg.chunks.filter((c) => c.type === 'agent');
  const thoughtChunks = msg.chunks.filter((c) => c.type === 'thought');
  const toolChunks = msg.chunks.filter((c) => c.type === 'tool');
  const bodyText = escapeHtml(textChunks.map((c) => c.text).join(''));
  const thoughtText = escapeHtml(thoughtChunks.map((c) => c.text).join(''));
  const body = thoughtText
    ? (bodyText ? bodyText + '\n\n' : '') + `<em class="acp-thought">${thoughtText}</em>`
    : bodyText;
  const tools = toolChunks.map((t) => t.text);
  const turn: Turn = {
    kind: 'agent',
    who: 'opencode',
    role: 'agent · ACP',
    roleClass: 'dev',
    node: 'dev',
    time: formatTime(msg.createdAt),
    streaming: msg.streaming,
  };
  if (body) turn.text = body;
  if (tools.length > 0) turn.tools = tools;
  return turn;
}

export function acpToSession(snap: AcpSnapshot): Session {
  const shortId = snap.sessionId ? snap.sessionId.slice(0, 8) : '—';
  const isLoading = snap.loadingSessionId !== null;
  const loadedMeta = snap.loadingSessionId
    ? snap.sessions.find((s) => s.sessionId === snap.loadingSessionId)
    : undefined;
  const loadedTitle = loadedMeta ? sessionDisplayTitle(loadedMeta) : null;

  const crumb = isLoading ? 'OpenCode · loading' : 'OpenCode · live';
  const kicker = isLoading
    ? `loading ${snap.loadingSessionId?.slice(0, 8) ?? ''}…`
    : `acp session ${shortId} · ${snap.status}`;
  const titleSans = isLoading ? ' · loading' : ' · live ACP';
  const lede = isLoading
    ? `Replaying <code>${escapeHtml(loadedTitle ?? snap.loadingSessionId ?? '')}</code> from opencode… (text replay is upstream-pending in opencode; tool calls will appear)`
    : snap.status === 'connected'
      ? `Real <code>${snap.agent}</code> session via Agent Client Protocol. Prompts go straight to the agent; replies stream back live.`
      : snap.status === 'connecting'
        ? `Connecting to <code>${snap.agent}</code>…`
        : snap.status === 'error'
          ? `Connection error: ${snap.error ?? 'unknown'}. Start the sidecar with <code>bun run server</code>.`
          : `ACP sidecar offline. Start it with <code>bun run server</code> in another terminal.`;

  return {
    crumb,
    kicker,
    titleSerif: 'OpenCode',
    titleSans,
    lede,
    nodes: [],
    turns: snap.messages.map(acpMessageToTurn),
  };
}

export type SessionBucket = 'today' | 'yesterday' | 'thisWeek' | 'pastWeek' | 'older';

export interface SessionGroup {
  bucket: SessionBucket;
  label: string;
  sessions: AcpSessionInfo[];
}

const BUCKET_LABELS: Record<SessionBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  pastWeek: 'Past Week',
  older: 'Older',
};

const BUCKET_ORDER: SessionBucket[] = ['today', 'yesterday', 'thisWeek', 'pastWeek', 'older'];

function dateBucket(updatedMs: number, nowMs: number): SessionBucket {
  const startOfDay = (ms: number): number => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const today = startOfDay(nowMs);
  const oneDay = 24 * 60 * 60 * 1000;
  const sessionDay = startOfDay(updatedMs);
  const dayDiff = Math.round((today - sessionDay) / oneDay);
  if (dayDiff <= 0) return 'today';
  if (dayDiff === 1) return 'yesterday';
  if (dayDiff < 7) return 'thisWeek';
  if (dayDiff < 14) return 'pastWeek';
  return 'older';
}

export function groupSessionsByDate(
  sessions: readonly AcpSessionInfo[],
  nowMs: number = Date.now(),
): SessionGroup[] {
  const buckets = new Map<SessionBucket, AcpSessionInfo[]>();
  for (const s of sessions) {
    const ts = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
    if (!Number.isFinite(ts) || ts === 0) continue;
    const bucket = dateBucket(ts, nowMs);
    const list = buckets.get(bucket) ?? [];
    list.push(s);
    buckets.set(bucket, list);
  }
  const groups: SessionGroup[] = [];
  for (const bucket of BUCKET_ORDER) {
    const list = buckets.get(bucket);
    if (!list || list.length === 0) continue;
    const sorted = list.slice().sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
    groups.push({ bucket, label: BUCKET_LABELS[bucket], sessions: sorted });
  }
  return groups;
}

export function formatRelativeTime(iso: string | null, nowMs: number = Date.now()): string {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diffMs = Math.max(0, nowMs - ts);
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `${String(Math.max(1, minutes))}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${String(days)}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${String(weeks)}w`;
  const months = Math.round(days / 30);
  return `${String(months)}mo`;
}

export function cwdBasename(cwd: string): string {
  const trimmed = cwd.replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return '/';
  const last = trimmed.split('/').pop();
  return last ?? cwd;
}

const DEFAULT_TITLE_RE = /^(New|Child) session - /;

export function sessionDisplayTitle(s: AcpSessionInfo): string {
  if (s.title && !DEFAULT_TITLE_RE.test(s.title)) return s.title;
  return `Session ${s.sessionId.slice(4, 12)}`;
}
