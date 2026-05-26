import { NODES } from '../data/nodes.js';
import { SESSIONS } from '../data/sessions.js';
import { NODE_PINS, state } from '../state/store.js';
import { switchView } from '../state/view.js';
import { escapeHtml } from '../util/dom.js';
import { nowClock } from '../util/time.js';
import { renderNodeDetail } from './nodes-detail.js';

/* Aggregate session-level info into a per-node view: live in any
   session? which sessions referenced it? recent turns? */
export function nodeAggregates(nodeName) {
  const kind = NODES[nodeName]?.kind;
  const sessions = [];
  const recentTurns = [];
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
        recentTurns.push({ time: t.time, text: t.text, who: t.who });
      }
    });
  });

  return { sessions, recentTurns: recentTurns.slice(-4).reverse(), live };
}

export function nodeStatus(name) {
  const n = NODES[name];
  if (!n) return 'error';
  if (n.paused) return 'paused';
  const agg = nodeAggregates(name);
  return agg.live ? 'live' : 'idle';
}

/* ---------- Rendering: node list ---------- */
function nodeRowHtml(name) {
  const n = NODES[name];
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

export const nodeEls = {
  panel: document.querySelector('.nodes-panel'),
  canvas: document.querySelector('.canvas--node'),
  listPinned: document.getElementById('nodeListPinned'),
  listAll: document.getElementById('nodeListAll'),
  fleetMeta: document.getElementById('nodesFleetMeta'),
  search: document.getElementById('nodesSearch'),
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

export function refreshFleetMeta() {
  const all = Object.keys(NODES);
  const counts = { all: all.length, live: 0, idle: 0, paused: 0, error: 0 };
  all.forEach((n) => {
    counts[nodeStatus(n)] += 1;
  });
  if (nodeEls.fleetMeta) {
    nodeEls.fleetMeta.textContent = `ACP fleet · ${counts.live} online / ${counts.all} total`;
  }
  document.querySelectorAll('[data-count-for]').forEach((el) => {
    const k = el.dataset.countFor;
    el.textContent = String(counts[k] || 0).padStart(2, '0');
  });
}

export function renderNodeList() {
  if (!nodeEls.listAll || !nodeEls.listPinned) return;
  const names = Object.keys(NODES);
  const q = state.currentNodeSearch.trim().toLowerCase();
  const matches = (name) => {
    if (state.currentNodeFilter !== 'all' && nodeStatus(name) !== state.currentNodeFilter)
      return false;
    if (!q) return true;
    const n = NODES[name];
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
    ul.querySelectorAll('.node-row').forEach(bindNodeRow);
  });
  // Mark the active row
  document.querySelectorAll('.node-row').forEach((r) => {
    r.classList.toggle('is-active', r.dataset.nodeId === state.currentNodeId);
  });
}

function bindNodeRow(row) {
  row.addEventListener('click', () => {
    renderNodeDetail(row.dataset.nodeId);
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
      if (NODE_PINS.has(id)) NODE_PINS.delete(id);
      else NODE_PINS.add(id);
      renderNodeList();
    });
  }
}

export function initNodesList() {
  document.querySelectorAll('.rail__btn[data-view-target]').forEach((b) => {
    b.addEventListener('click', () => switchView(b.dataset.viewTarget));
  });

  /* Wire filters + search + new-node */
  document.querySelectorAll('[data-node-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-node-filter]').forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      state.currentNodeFilter = tab.dataset.nodeFilter;
      renderNodeList();
    });
  });
  if (nodeEls.search) {
    nodeEls.search.addEventListener('input', () => {
      state.currentNodeSearch = nodeEls.search.value;
      renderNodeList();
    });
  }
  if (nodeEls.newBtn) {
    let nNew = 0;
    nodeEls.newBtn.addEventListener('click', () => {
      nNew += 1;
      const kinds = ['dev', 'design', 'research'];
      const kind = kinds[(nNew - 1) % kinds.length];
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
