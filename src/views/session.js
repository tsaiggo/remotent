import { AGENT_AVATAR, HUMAN_AVATAR_URL, SVG } from '../data/avatars.js';
import { SESSIONS } from '../data/sessions.js';
import { state } from '../state/store.js';
import { escapeHtml } from '../util/dom.js';

/* Render a single turn to an HTML string. */
export function turnHtml(turn) {
  const isHuman = turn.kind === 'human';
  const node = turn.node || '';
  const humanAvatarImg = `<img class="turn__avatar-img" src="${HUMAN_AVATAR_URL}" alt="">`;
  const agentAvatarUrl = AGENT_AVATAR[node] || AGENT_AVATAR.agent;
  const agentAvatarImg = `<img class="turn__avatar-img" src="${agentAvatarUrl}" alt="">`;
  const avatarInner = isHuman ? humanAvatarImg : agentAvatarImg;
  const avatarClass = isHuman
    ? 'turn__avatar'
    : `turn__avatar turn__avatar--${node}${turn.live ? ' is-live' : ''}`;

  const classes = ['turn', isHuman ? 'turn--human' : 'turn--agent'];
  if (turn.quiet) classes.push('turn--quiet');
  if (turn.streaming) classes.push('turn--streaming');

  const roleClass = turn.roleClass ? ` turn__role--${turn.roleClass}` : '';
  const live = turn.streaming ? '<span class="live-dot" aria-hidden="true"></span>' : '';

  const tools =
    turn.tools && turn.tools.length
      ? `<span class="turn__tools">${turn.tools.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}</span>`
      : '';

  let extra = '';
  if (turn.terminal) {
    const lines = turn.terminal
      .map((seg) => {
        if (seg.type === 'prompt')
          return `<span class="t-prompt">${escapeHtml(turn.who || 'node')} ▸</span> <span class="t-cmd">${escapeHtml(seg.cmd)}</span>`;
        if (seg.type === 'line') return `<span class="t-line">${escapeHtml(seg.text)}</span>`;
        if (seg.type === 'out') return `<span class="t-out">${escapeHtml(seg.text)}</span>`;
        if (seg.type === 'stream')
          return `<span class="t-prompt">${escapeHtml(turn.who || 'node')} ▸</span> <span class="t-stream">${escapeHtml(seg.text)}<span class="t-caret">▍</span></span>`;
        return '';
      })
      .join('\n');
    extra += `<pre class="terminal" aria-label="${escapeHtml(turn.who || 'terminal')}">${lines}</pre>`;
  }
  if (turn.artifact) {
    extra +=
      `<figure class="artifact">` +
      `<div class="artifact__chart" aria-hidden="true">${SVG.sparkline}</div>` +
      `<figcaption><span>${escapeHtml(turn.artifact.caption)}</span>` +
      `<span class="artifact__meta">${escapeHtml(turn.artifact.meta)}</span></figcaption>` +
      `</figure>`;
  }

  const caret = turn.streaming ? '<span class="caret">▍</span>' : '';
  const proseClass = turn.quiet ? 'prose prose--quiet' : 'prose';
  const timeId = turn.streaming ? ' id="liveClock"' : '';
  const proseId = turn.streaming ? ' id="streamText"' : '';

  return `
      <li class="${classes.join(' ')}"${node ? ` data-node="${node}"` : ''}>
        <div class="turn__gutter">
          <span class="${avatarClass}" aria-hidden="true">${avatarInner}</span>
          ${turn.streaming ? '' : '<span class="turn__rail" aria-hidden="true"></span>'}
        </div>
        <div class="turn__body">
          <header class="turn__head">
            <span class="turn__who">${escapeHtml(turn.who || '')}</span>
            <span class="turn__role${roleClass}">${escapeHtml(turn.role || '')}</span>
            ${live}
            <time class="turn__time"${timeId}>${escapeHtml(turn.time || '')}</time>
            ${tools}
          </header>
          <p class="${proseClass}"${proseId}>${turn.text || ''}${caret}</p>
          ${extra}
        </div>
      </li>`;
}

/* ============================================================
   Canvas renderer
   ============================================================ */
export const els = {
  crumb: document.getElementById('crumbCurrent'),
  title: document.getElementById('canvasTitle'),
  nodes: document.getElementById('canvasNodes'),
  timeline: document.getElementById('timeline'),
};

// Preserve the trailing icon buttons (share/branch/more) of canvasNodes.
const NODE_TRAILING = els.nodes
  ? Array.from(els.nodes.children).filter(
      (c) => c.classList.contains('canvas__divider') || c.classList.contains('canvas__icon'),
    )
  : [];

export function renderNodes(nodes) {
  if (!els.nodes) return;
  els.nodes.innerHTML = '';
  nodes.forEach((n) => {
    const span = document.createElement('span');
    span.className = `node node--${n.kind}`;
    span.title = n.title || '';
    if (n.live) span.innerHTML = `<span class="node__pulse"></span>${escapeHtml(n.name)}`;
    else span.textContent = n.name;
    els.nodes.appendChild(span);
  });
  NODE_TRAILING.forEach((el) => els.nodes.appendChild(el));
}

function renderTitle(s) {
  if (!els.title) return;
  els.title.innerHTML =
    `<p class="kicker">${escapeHtml(s.kicker || '')} <span class="kicker__dot"></span></p>` +
    `<h2 class="display"><span class="display__serif">${escapeHtml(s.titleSerif || '')}</span>` +
    `<span class="display__sans">${escapeHtml(s.titleSans || '')}</span></h2>` +
    (s.lede ? `<p class="lede">${s.lede}</p>` : '');
}

export function renderSession(id) {
  const s = SESSIONS[id];
  if (!s) return;
  state.currentSessionId = id;
  if (els.crumb) els.crumb.textContent = s.crumb || '';
  renderNodes(s.nodes || []);
  renderTitle(s);
  if (els.timeline) {
    els.timeline.innerHTML = s.turns.map(turnHtml).join('');
    els.timeline.scrollTop = 0;
  }
}

function bindThread(row) {
  row.addEventListener('click', () => {
    document.querySelectorAll('.thread').forEach((r) => r.classList.remove('is-active'));
    row.classList.add('is-active');
    const id = row.dataset.sessionId;
    if (id) renderSession(id);
  });
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      row.click();
    }
  });
  const pin = row.querySelector('.thread__pin');
  if (pin) {
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      pin.classList.toggle('is-on');
      const on = pin.classList.contains('is-on');
      pin.setAttribute('aria-label', on ? 'Unpin' : 'Pin');
      pin.title = on ? 'Pinned' : 'Pin';
    });
  }
}

export function initSession() {
  /* ============================================================
     Sidebar wiring — tabs, pin, click-to-navigate, New session
     ============================================================ */
  const tabs = document.querySelectorAll('.tabs__btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      const filter = tab.dataset.filter;
      document.querySelectorAll('.thread').forEach((row) => {
        const kind = row.dataset.kind;
        const show = filter === 'all' || filter === kind;
        row.style.display = show ? '' : 'none';
      });
    });
  });

  document.querySelectorAll('.thread').forEach(bindThread);

  /* New session button — prepend a fresh session into Today. */
  const newBtn = document.getElementById('newSessionBtn');
  const todayList = document.getElementById('todayList');
  if (newBtn && todayList) {
    newBtn.addEventListener('click', () => {
      state.newCounter += 1;
      const id = `draft-${Date.now()}-${state.newCounter}`;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      SESSIONS[id] = {
        crumb: `New session ${state.newCounter}`,
        kicker: `Session draft · started ${hhmm}`,
        titleSerif: 'New session',
        titleSans: ` ${state.newCounter}.`,
        lede: 'A blank canvas. Direct the swarm from the composer below — your first turn shapes the session.',
        nodes: [],
        turns: [],
      };

      const li = document.createElement('li');
      li.className = 'thread';
      li.dataset.kind = 'human';
      li.dataset.sessionId = id;
      li.tabIndex = 0;
      li.innerHTML =
        '<span class="thread__dot is-live" aria-hidden="true"></span>' +
        '<div class="thread__body">' +
        '<div class="thread__row">' +
        `<span class="thread__title">New session ${state.newCounter}</span>` +
        `<time class="thread__time">${hhmm}</time>` +
        '</div>' +
        '<p class="thread__snippet"><span class="tag tag--human">human</span>Draft — empty timeline.</p>' +
        '</div>' +
        '<button class="thread__pin" aria-label="Pin"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 2l8 8-5 1-4 4-1 5-2-2-5 5-1-1 5-5-2-2 5-1 4-4z"/></svg></button>';
      todayList.prepend(li);
      bindThread(li);
      li.click();
    });
  }

  /* ============================================================
     Initial paint — render the active session (matches markup).
     ============================================================ */
  const initial = document.querySelector('.thread.is-active')?.dataset.sessionId || 'orbital';
  renderSession(initial);
}
