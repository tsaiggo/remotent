import { NODES } from '../data/nodes.js';
import { SESSIONS } from '../data/sessions.js';
import { NODE_PINS, state } from '../state/store.js';
import { switchView } from '../state/view.js';
import type { NodeAggregates, NodeKind, NodeStatus, NodeStatusFilter } from '../types/index.js';
import { escapeHtml } from '../util/dom.js';
import { nowClock } from '../util/time.js';
import { renderNodeDetail } from './nodes-detail.js';

/* Aggregate session-level info into a per-node view: live in any
   session? which sessions referenced it? recent turns? */
export function nodeAggregates(nodeName: string): NodeAggregates {
  const sessions: NodeAggregates['sessions'] = [];
  const recentTurns: NodeAggregates['recentTurns'] = [];
  let live = false;

  Object.entries(SESSIONS).forEach(([sid, s]) => {
    const usedHere = (s.nodes || []).find(
      (n) => `${n.name}.node` === nodeName || n.name === nodeName.replace(/\.node$/, ''),
    );
    if (!usedHere) return;
    if (usedHere.live) live = true;
    sessions.push({
      id: sid,
      title: s.crumb || sid,
      kicker: s.kicker || '',
      live: !!usedHere.live,
    });
    (s.turns || []).forEach((t) => {
      const tnode = t.node ? `${t.node}.node` : null;
      if (tnode === nodeName) {
        const entry: NodeAggregates['recentTurns'][number] = { who: t.who };
        if (t.time !== undefined) entry.time = t.time;
        if (t.text !== undefined) entry.text = t.text;
        recentTurns.push(entry);
      }
    });
  });

  return { sessions, recentTurns: recentTurns.slice(-4).reverse(), live };
}

export function nodeStatus(name: string): NodeStatus {
  const n = NODES[name];
  if (!n) return 'error';
  if (n.paused) return 'paused';
  const agg = nodeAggregates(name);
  return agg.live ? 'live' : 'idle';
}

/* ---------- Rendering: node list ---------- */
function nodeRowHtml(name: string): string {
  const n = NODES[name];
  if (!n) return '';
  const agg = nodeAggregates(name);
  const status = nodeStatus(name);
  const dotClass = `node-row__dot is-${status} node-row__dot--${n.kind}`;
  const sessCount = agg.sessions.length;
  const toolCount = n.tools.length;
  const last = agg.recentTurns[0]?.time || '—';
  const pinned = NODE_PINS.has(name) ? ' is-on' : '';
  return (
    `<li class="node-row" data-node-id="${escapeHtml(name)}" data-status="${status}" tabindex="0" aria-label="${escapeHtml(name)} · ${status}">` +
    `<span class="${dotClass}" aria-hidden="true"></span>` +
    `<div class="node-row__body">` +
    `<div class="node-row__head">` +
    `<span class="node-row__name">${escapeHtml(n.name)}</span>` +
    `<span class="node-row__role">${escapeHtml(n.model)}</span>` +
    `</div>` +
    `<p class="node-row__meta">` +
    `<span class="tag tag--${escapeHtml(n.kind)}">${escapeHtml(n.kind)}</span>` +
    `<span>${sessCount} session${sessCount === 1 ? '' : 's'}</span>` +
    `<span class="sep">·</span>` +
    `<span>${toolCount} tool${toolCount === 1 ? '' : 's'}</span>` +
    `<span class="sep">·</span>` +
    `<span>${escapeHtml(last)}</span>` +
    `</p>` +
    `</div>` +
    `<button class="node-row__pin${pinned}" aria-label="${pinned ? 'Unpin' : 'Pin'}" title="${pinned ? 'Pinned' : 'Pin'}">` +
    `<svg viewBox="0 0 24 24" width="12" height="12" fill="${pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.4"><path d="M14 2l8 8-5 1-4 4-1 5-2-2-5 5-1-1 5-5-2-2 5-1 4-4z"/></svg>` +
    `</button>` +
    `</li>`
  );
}

interface NodeEls {
  panel: HTMLElement | null;
  canvas: HTMLElement | null;
  listPinned: HTMLElement | null;
  listAll: HTMLElement | null;
  fleetMeta: HTMLElement | null;
  search: HTMLInputElement | null;
  newBtn: HTMLElement | null;
  crumb: HTMLElement | null;
  statusBar: HTMLElement | null;
  titleSerif: HTMLElement | null;
  titleSans: HTMLElement | null;
  kicker: HTMLElement | null;
  lede: HTMLElement | null;
  meta: HTMLElement | null;
  detail: HTMLElement | null;
}

function asInput(el: HTMLElement | null): HTMLInputElement | null {
  return el instanceof HTMLInputElement ? el : null;
}

export const nodeEls: NodeEls = {
  panel: document.querySelector<HTMLElement>('.nodes-panel'),
  canvas: document.querySelector<HTMLElement>('.canvas--node'),
  listPinned: document.getElementById('nodeListPinned'),
  listAll: document.getElementById('nodeListAll'),
  fleetMeta: document.getElementById('nodesFleetMeta'),
  search: asInput(document.getElementById('nodesSearch')),
  newBtn: document.getElementById('newNodeBtn'),
  crumb: document.getElementById('nodeCrumb'),
  statusBar: document.getElementById('nodeStatus'),
  titleSerif: document.getElementById('nodeNameSerif'),
  titleSans: document.getElementById('nodeNameSans'),
  kicker: document.getElementById('nodeKicker'),
  lede: document.getElementById('nodeLede'),
  meta: document.getElementById('nodeMeta'),
  detail: document.getElementById('nodeDetail'),
};

export function refreshFleetMeta(): void {
  const all = Object.keys(NODES);
  const counts: Record<NodeStatusFilter, number> = {
    all: all.length,
    live: 0,
    idle: 0,
    paused: 0,
    error: 0,
  };
  all.forEach((n) => {
    counts[nodeStatus(n)] += 1;
  });
  if (nodeEls.fleetMeta) {
    nodeEls.fleetMeta.textContent = `ACP fleet · ${counts.live} online / ${counts.all} total`;
  }
  document.querySelectorAll<HTMLElement>('[data-count-for]').forEach((el) => {
    const k = el.dataset.countFor as NodeStatusFilter | undefined;
    const c = k && k in counts ? counts[k] : 0;
    el.textContent = String(c).padStart(2, '0');
  });
}

export function renderNodeList(): void {
  if (!nodeEls.listAll || !nodeEls.listPinned) return;
  const names = Object.keys(NODES);
  const q = state.currentNodeSearch.trim().toLowerCase();
  const matches = (name: string): boolean => {
    if (state.currentNodeFilter !== 'all' && nodeStatus(name) !== state.currentNodeFilter)
      return false;
    if (!q) return true;
    const n = NODES[name];
    if (!n) return false;
    const hay = [name, n.model, n.kind, ...(n.tools || []).map((t) => t.name)]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  };
  const pinned = names.filter((n) => NODE_PINS.has(n) && matches(n));
  const rest = names.filter((n) => !NODE_PINS.has(n) && matches(n));
  nodeEls.listPinned.innerHTML =
    pinned.map(nodeRowHtml).join('') ||
    '<li class="empty-hint" style="padding:6px 8px">No pinned nodes.</li>';
  nodeEls.listAll.innerHTML =
    rest.map(nodeRowHtml).join('') ||
    '<li class="empty-hint" style="padding:6px 8px">No nodes match this filter.</li>';
  [nodeEls.listPinned, nodeEls.listAll].forEach((ul) => {
    ul.querySelectorAll<HTMLElement>('.node-row').forEach(bindNodeRow);
  });
  // Mark the active row
  document.querySelectorAll<HTMLElement>('.node-row').forEach((r) => {
    r.classList.toggle('is-active', r.dataset.nodeId === state.currentNodeId);
  });
}

function bindNodeRow(row: HTMLElement): void {
  row.addEventListener('click', () => {
    const id = row.dataset.nodeId;
    if (id) renderNodeDetail(id);
  });
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      row.click();
    }
  });
  const pin = row.querySelector('.node-row__pin');
  if (pin) {
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = row.dataset.nodeId;
      if (!id) return;
      if (NODE_PINS.has(id)) NODE_PINS.delete(id);
      else NODE_PINS.add(id);
      renderNodeList();
    });
  }
}

export function initNodesList(): void {
  document.querySelectorAll<HTMLElement>('.rail__btn[data-view-target]').forEach((b) => {
    b.addEventListener('click', () => {
      const target = b.dataset.viewTarget;
      if (target === 'hub' || target === 'nodes') switchView(target);
    });
  });

  /* Wire filters + search + new-node */
  document.querySelectorAll<HTMLElement>('[data-node-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-node-filter]').forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      const f = tab.dataset.nodeFilter as NodeStatusFilter | undefined;
      if (f) state.currentNodeFilter = f;
      renderNodeList();
    });
  });
  if (nodeEls.search) {
    const searchEl = nodeEls.search;
    searchEl.addEventListener('input', () => {
      state.currentNodeSearch = searchEl.value;
      renderNodeList();
    });
  }
  if (nodeEls.newBtn) {
    let nNew = 0;
    const kinds: NodeKind[] = ['dev', 'design', 'research'];
    nodeEls.newBtn.addEventListener('click', () => {
      nNew += 1;
      const kind = kinds[(nNew - 1) % kinds.length] ?? 'dev';
      const id = `node-${Date.now()}-${nNew}.node`;
      NODES[id] = {
        name: id,
        kind,
        model: 'unconfigured',
        role: 'agent · unconfigured',
        persona: 'New agent — configure persona, tools, and permissions.',
        lede: 'A blank node. Open the system prompt and grant tools to bring it online.',
        createdAt: nowClock() + ' local',
        owner: 'Wen',
        endpoint: `acp://fleet.local/${kind}-${nNew}`,
        contextWindow: '—',
        memoryItems: 0,
        paused: true,
        systemPrompt: 'You are a new Remotent agent. Awaiting persona.',
        tools: [],
        mcp: [],
        permissions: { humanInLoop: 'ask · everywhere by default', writePaths: [] },
        acp: {
          version: '0.2',
          capabilities: ['turn.stream'],
          ack: { default: 'at-most-once', perToolOverrides: {} },
          idempotencyWindow: '5m',
          attestation: { algo: 'ed25519', keyId: 'fp:pending', lastSigned: '—' },
          handshake: { lastAt: '—', peerCount: 0 },
        },
        policy: {
          humanInLoop: [{ trigger: '*', action: 'ask', scope: 'all' }],
          rateLimit: { tokensPerMin: 1000, callsPerMin: 10 },
          concurrency: { maxInFlight: 1 },
          retry: { policy: 'expo', max: 1 },
          timeout: '30s',
        },
        subscriptions: [],
        outbound: [],
      };
      state.currentNodeId = id;
      refreshFleetMeta();
      renderNodeList();
      renderNodeDetail(id);
    });
  }
}
