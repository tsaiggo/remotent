import { escapeHtml } from '../util/dom.js';
import type { Session, Turn } from '../types/index.js';
import type { AcpMessage, AcpSnapshot } from './client.js';

export const ACP_SESSION_ID = 'acp-live';

const pad = (n: number): string => String(n).padStart(2, '0');

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

function acpMessageToTurn(msg: AcpMessage): Turn {
  if (msg.role === 'user') {
    const text = msg.chunks.map((c) => c.text).join('');
    return {
      kind: 'human',
      who: 'You',
      role: 'human',
      time: formatTime(msg.createdAt),
      text: escapeHtml(text),
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
  return {
    crumb: 'OpenCode · live',
    kicker: `acp session ${shortId} · ${snap.status}`,
    titleSerif: 'OpenCode',
    titleSans: ' · live ACP',
    lede:
      snap.status === 'connected'
        ? `Real <code>${snap.agent}</code> session via Agent Client Protocol. Prompts go straight to the agent; replies stream back live.`
        : snap.status === 'connecting'
          ? `Connecting to <code>${snap.agent}</code>…`
          : snap.status === 'error'
            ? `Connection error: ${snap.error ?? 'unknown'}. Start the sidecar with <code>bun run server</code>.`
            : `ACP sidecar offline. Start it with <code>bun run server</code> in another terminal.`,
    nodes: [],
    turns: snap.messages.map(acpMessageToTurn),
  };
}
