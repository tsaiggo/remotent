import { NODES } from '../data/nodes.js';
import { NODE_PINS, state } from '../state/store.js';
import { switchView } from '../state/view.js';
import { escapeHtml } from '../util/dom.js';
import { sparkSvg } from '../util/spark.js';
import { nowClock } from '../util/time.js';
import {
  nodeAggregates,
  nodeEls,
  nodeStatus,
  refreshFleetMeta,
  renderNodeList,
} from './nodes-list.js';

export function renderNodeDetail(name) {
  if (!NODES[name]) return;
  state.currentNodeId = name;
  const n = NODES[name];
  const agg = nodeAggregates(name);
  const status = nodeStatus(name);

  document.querySelectorAll('.node-row').forEach((r) => {
    r.classList.toggle('is-active', r.dataset.nodeId === name);
  });

  if (nodeEls.crumb) nodeEls.crumb.textContent = n.name;
  if (nodeEls.titleSerif) nodeEls.titleSerif.textContent = n.name.replace(/\.node$/, '');
  if (nodeEls.titleSans) nodeEls.titleSans.textContent = '.node';
  if (nodeEls.kicker) {
    const label =
      status === 'live'
        ? 'Streaming'
        : status === 'paused'
          ? 'Paused'
          : status === 'error'
            ? 'Error'
            : 'Idle';
    nodeEls.kicker.innerHTML = `${escapeHtml(n.persona)} <span class="kicker__dot"></span> ${label}`;
  }
  if (nodeEls.lede) nodeEls.lede.innerHTML = n.lede;

  // Status bar — pulse, endpoint, action buttons
  if (nodeEls.statusBar) {
    const pulseClass = `node node--${n.kind}`;
    const pulse =
      status === 'live'
        ? `<span class="${pulseClass}"><span class="node__pulse"></span>${escapeHtml(status)}</span>`
        : `<span class="${pulseClass}">${escapeHtml(status)}</span>`;
    const pauseLabel = n.paused ? 'Resume' : 'Pause';
    nodeEls.statusBar.innerHTML =
      `<span class="node-status">${pulse}` +
      `<span class="node-status__endpoint">${escapeHtml(n.endpoint)}</span>` +
      `</span>` +
      `<span class="node-status__sep" aria-hidden="true"></span>` +
      `<button class="node-status__btn" data-act="toggle-pause" type="button">${pauseLabel}</button>` +
      `<button class="node-status__btn" data-act="restart" type="button">Restart</button>` +
      `<button class="node-status__btn" data-act="clone" type="button">Clone</button>` +
      `<button class="node-status__btn node-status__btn--danger" data-act="archive" type="button">Archive</button>`;
    nodeEls.statusBar.querySelectorAll('button[data-act]').forEach((b) => {
      b.addEventListener('click', () => handleNodeAction(name, b.dataset.act));
    });
  }

  if (nodeEls.meta) {
    nodeEls.meta.innerHTML =
      `<li>model · <b>${escapeHtml(n.model)}</b></li>` +
      `<li>runtime · <b>ACP v0.2</b></li>` +
      `<li>created · <b>${escapeHtml(n.createdAt)}</b></li>` +
      `<li>owner · <b>${escapeHtml(n.owner)}</b></li>`;
  }

  // Sections: Capabilities + Activity
  const toolGrid =
    n.tools
      .map((t) => {
        const acpBits = [
          t.ack ? `ack: ${escapeHtml(t.ack)}` : null,
          t.ttl ? `ttl ${escapeHtml(t.ttl)}` : null,
          t.rate ? escapeHtml(t.rate) : null,
          typeof t.errorRate24h === 'number' ? `err ${t.errorRate24h.toFixed(1)}%` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        const acpLine = acpBits ? `<div class="tool-chip__acp">${acpBits}</div>` : '';
        const paths = (t.resources || []).length
          ? `<div class="tool-chip__paths">` +
            t.resources.map((p) => `<code>${escapeHtml(p)}</code>`).join('') +
            `</div>`
          : '';
        const isRich = acpLine || paths;
        const rowOrFlat = isRich
          ? `<div class="tool-chip__row">` +
            `<span class="tool-chip__name">` +
            `<span class="tool-chip__scope tool-chip__scope--${escapeHtml(t.scope)}">${escapeHtml(t.scope)}</span>` +
            `${escapeHtml(t.name)}` +
            `</span>` +
            `<span class="tool-chip__meta">${t.calls24h} · 24h</span>` +
            `</div>` +
            acpLine +
            paths
          : `<span class="tool-chip__name">` +
            `<span class="tool-chip__scope tool-chip__scope--${escapeHtml(t.scope)}">${escapeHtml(t.scope)}</span>` +
            `${escapeHtml(t.name)}` +
            `</span>` +
            `<span class="tool-chip__meta">${t.calls24h} · 24h</span>`;
        return `<div class="tool-chip${isRich ? ' tool-chip--rich' : ''}">${rowOrFlat}</div>`;
      })
      .join('') || '<div class="empty-hint">No tools granted.</div>';

  const mcpGrid =
    n.mcp
      .map(
        (m) =>
          `<div class="mcp-chip">` +
          `<span class="mcp-chip__name">${escapeHtml(m.name)}</span>` +
          `<span class="mcp-chip__meta">${escapeHtml(m.meta)}</span>` +
          `</div>`,
      )
      .join('') || '<div class="empty-hint">No external resources mounted.</div>';

  const writeList = (n.permissions.writePaths || []).length
    ? n.permissions.writePaths.map((p) => `<code>${escapeHtml(p)}</code>`).join(' ')
    : '<span class="empty-hint">Read-only.</span>';

  const sessionList = agg.sessions.length
    ? `<ul class="node-sessions">` +
      agg.sessions
        .map(
          (s) =>
            `<li><a href="#" data-jump-session="${escapeHtml(s.id)}">` +
            `<span class="node-sessions__title">${escapeHtml(s.title)}</span>` +
            `<span class="node-sessions__meta">${s.live ? 'live · ' : ''}${escapeHtml(s.kicker)}</span>` +
            `</a></li>`,
        )
        .join('') +
      `</ul>`
    : '<div class="empty-hint">No sessions reference this node yet.</div>';

  const turnsList = agg.recentTurns.length
    ? `<ul class="node-turns">` +
      agg.recentTurns
        .map(
          (t) =>
            `<li class="node-turn">` +
            `<span class="node-turn__time">${escapeHtml(t.time || '')}</span>` +
            `<span class="node-turn__body">${t.text || ''}</span>` +
            `</li>`,
        )
        .join('') +
      `</ul>`
    : '<div class="empty-hint">No recent turns recorded.</div>';

  const sparkColor =
    n.kind === 'dev'
      ? 'var(--green-ink)'
      : n.kind === 'design'
        ? 'var(--purple-ink)'
        : n.kind === 'research'
          ? 'var(--blue-ink)'
          : 'var(--ink-2)';

  const telemetry =
    `<div class="telemetry">` +
    `<div class="telemetry__card">` +
    `<div class="telemetry__head"><span class="telemetry__label">tokens / min</span><span class="telemetry__value">${1200 + ((n.name.length * 37) % 800)}</span></div>` +
    sparkSvg(n.name + ':tok', sparkColor) +
    `</div>` +
    `<div class="telemetry__card">` +
    `<div class="telemetry__head"><span class="telemetry__label">tool-call success</span><span class="telemetry__value">${(94 + ((n.name.length * 7) % 5)).toFixed(0)}.${(n.name.length * 3) % 9}%</span></div>` +
    sparkSvg(n.name + ':ok', sparkColor) +
    `</div>` +
    `<div class="telemetry__card">` +
    `<div class="telemetry__head"><span class="telemetry__label">avg turn latency</span><span class="telemetry__value">${(0.8 + (n.name.length % 9) / 10).toFixed(2)}s</span></div>` +
    sparkSvg(n.name + ':lat', sparkColor) +
    `</div>` +
    `</div>`;

  // === ACP-aware extensions ===
  const acp = n.acp || {};
  const att = acp.attestation || {};
  const hs = acp.handshake || {};
  const pol = n.policy || {};
  const ack = acp.ack || {};
  const rl = pol.rateLimit || {};
  const cc = pol.concurrency || {};
  const ret = pol.retry || {};
  const overrideCount = Object.keys(ack.perToolOverrides || {}).length;

  const identityDl =
    `<dl class="dl-stats">` +
    `<div class="dl-stats__row"><dt>acp</dt><dd>v${escapeHtml(acp.version || '0.2')}</dd></div>` +
    `<div class="dl-stats__row"><dt>endpoint</dt><dd><code>${escapeHtml(n.endpoint)}</code></dd></div>` +
    `<div class="dl-stats__row"><dt>key</dt><dd>${escapeHtml(att.keyId || '—')}</dd></div>` +
    `<div class="dl-stats__row"><dt>handshake</dt><dd>${escapeHtml(hs.lastAt || '—')} · ${hs.peerCount ?? 0} peer${hs.peerCount === 1 ? '' : 's'}</dd></div>` +
    `<div class="dl-stats__row"><dt>last signed</dt><dd>${escapeHtml(att.lastSigned || '—')}</dd></div>` +
    `</dl>`;

  const capChips = (acp.capabilities || []).length
    ? `<div class="cap-chips">` +
      acp.capabilities.map((c) => `<span class="cap-chip">${escapeHtml(c)}</span>`).join('') +
      `</div>`
    : '';

  const promptCard =
    `<div class="prompt-card">` +
    `<div class="prompt-card__head">` +
    `<span class="prompt-card__title">System prompt</span>` +
    `<button type="button" class="prompt-card__edit" aria-label="Edit system prompt">Edit</button>` +
    `</div>` +
    `<div class="prompt-card__shell">` +
    `<pre class="prompt-card__body" contenteditable="false">${escapeHtml(n.systemPrompt)}</pre>` +
    `<div class="prompt-card__fade" aria-hidden="true"></div>` +
    `</div>` +
    `</div>`;

  const subsList = (n.subscriptions || []).length
    ? `<ul class="sub-list">` +
      n.subscriptions
        .map(
          (s) =>
            `<li class="sub-row">` +
            `<span class="sub-row__topic">${escapeHtml(s.topic)}</span>` +
            `<span class="sub-row__count">${s.count24h}/24h</span>` +
            `<span class="sub-row__since">since ${escapeHtml(s.since)}</span>` +
            `<span class="sub-row__qos">${escapeHtml(s.qos)}</span>` +
            `</li>`,
        )
        .join('') +
      `</ul>`
    : '<div class="empty-hint">No subscriptions.</div>';

  const outList = (n.outbound || []).length
    ? `<ul class="out-list">` +
      n.outbound
        .map((o) => {
          const known = !!NODES[o.target];
          const target = known
            ? `<a href="#" class="out-row__target" data-jump-node="${escapeHtml(o.target)}">${escapeHtml(o.target)}</a>`
            : `<span class="out-row__target out-row__target--unknown">${escapeHtml(o.target)}</span>`;
          return (
            `<li class="out-row">` +
            `<span class="out-row__arrow" aria-hidden="true">` +
            `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>` +
            `</span>` +
            target +
            `<span class="out-row__contract">${escapeHtml(o.contract)}</span>` +
            `<span class="out-row__calls">${o.calls24h} calls</span>` +
            `<span class="out-row__p50">p50 ${escapeHtml(o.p50)}</span>` +
            `<span class="out-row__qos">${escapeHtml(o.ack)}</span>` +
            `</li>`
          );
        })
        .join('') +
      `</ul>`
    : '<div class="empty-hint">No outbound contracts.</div>';

  const runtimeRow = (label, val) =>
    `<div class="acp-runtime__row">` +
    `<span class="acp-runtime__label">${escapeHtml(label)}</span>` +
    `<span class="acp-runtime__value">${val}</span>` +
    `</div>`;

  const ackDefaultCell = ack.default
    ? `${escapeHtml(ack.default)}` +
      (overrideCount
        ? ` <span class="acp-runtime__hint">· ${overrideCount} override${overrideCount === 1 ? '' : 's'}</span>`
        : '')
    : '—';

  const acpRuntime =
    `<div class="acp-runtime">` +
    runtimeRow('Ack default', ackDefaultCell) +
    runtimeRow('Idempotency', `${escapeHtml(acp.idempotencyWindow || '—')} window`) +
    runtimeRow('Retry', `${escapeHtml(ret.policy || '—')} · max ${ret.max ?? '—'}`) +
    runtimeRow('Timeout', `${escapeHtml(pol.timeout || '—')}`) +
    runtimeRow(
      'Rate limit',
      `${rl.tokensPerMin ?? '—'} tok/min · ${rl.callsPerMin ?? '—'} calls/min`,
    ) +
    runtimeRow('Concurrency', `max ${cc.maxInFlight ?? '—'} in-flight`) +
    runtimeRow('Attestation', `${escapeHtml(att.algo || '—')} · ${escapeHtml(att.keyId || '—')}`) +
    runtimeRow(
      'Last handshake',
      `${escapeHtml(hs.lastAt || '—')} · ${hs.peerCount ?? 0} peer${hs.peerCount === 1 ? '' : 's'}`,
    ) +
    `</div>`;

  const policyRules = pol.humanInLoop || [];
  const allowedAct = { ask: 1, block: 1, log: 1, auto: 1 };
  const policyTable = policyRules.length
    ? `<div class="policy-table" role="table">` +
      `<div class="policy-table__head" role="row">` +
      `<span role="columnheader">trigger</span>` +
      `<span role="columnheader">action</span>` +
      `<span role="columnheader">scope</span>` +
      `</div>` +
      policyRules
        .map((r) => {
          const act = allowedAct[r.action] ? r.action : 'log';
          return (
            `<div class="policy-table__row" role="row">` +
            `<span class="policy-table__trigger">${escapeHtml(r.trigger)}</span>` +
            `<span><span class="policy-chip policy-chip--${escapeHtml(act)}">${escapeHtml(r.action)}</span></span>` +
            `<span class="policy-table__scope">${escapeHtml(r.scope)}</span>` +
            `</div>`
          );
        })
        .join('') +
      `</div>`
    : '<div class="empty-hint">No human-in-loop rules — fully autonomous.</div>';

  nodeEls.detail.innerHTML =
    // ───────── IDENTITY ─────────
    `<span class="band-label">Identity</span>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">ACP coordinates</h3>` +
    `<span class="node-section__hint">${(acp.capabilities || []).length} capabilit${(acp.capabilities || []).length === 1 ? 'y' : 'ies'}</span>` +
    `</div>` +
    identityDl +
    capChips +
    `</section>` +
    // ───────── BRAIN ─────────
    `<span class="band-label">Brain</span>` +
    `<section class="node-section">` +
    promptCard +
    `</section>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Memory &amp; context</h3>` +
    `</div>` +
    `<div class="stat-grid">` +
    `<div class="stat"><div class="stat__label">Context window</div><div class="stat__value">${escapeHtml(n.contextWindow)}</div></div>` +
    `<div class="stat"><div class="stat__label">Long-term memory</div><div class="stat__value">${n.memoryItems}</div><div class="stat__sub">items indexed</div></div>` +
    `</div>` +
    `</section>` +
    // ───────── CAPABILITIES ─────────
    `<span class="band-label">Capabilities</span>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Tools · ACP grants</h3>` +
    `<span class="node-section__hint">${n.tools.length} authorized</span>` +
    `</div>` +
    `<div class="chip-grid">${toolGrid}</div>` +
    `</section>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Resources · MCP &amp; data</h3>` +
    `<span class="node-section__hint">${n.mcp.length} mounted</span>` +
    `</div>` +
    `<div class="chip-grid">${mcpGrid}</div>` +
    `</section>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Subscriptions</h3>` +
    `<span class="node-section__hint">${(n.subscriptions || []).length} topic${(n.subscriptions || []).length === 1 ? '' : 's'}</span>` +
    `</div>` +
    subsList +
    `</section>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Outbound contracts</h3>` +
    `<span class="node-section__hint">${(n.outbound || []).length} peer${(n.outbound || []).length === 1 ? '' : 's'}</span>` +
    `</div>` +
    outList +
    `</section>` +
    // ───────── POLICY ─────────
    `<span class="band-label">Policy</span>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">ACP runtime</h3>` +
    `</div>` +
    acpRuntime +
    `</section>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Human-in-loop · rules</h3>` +
    `<span class="node-section__hint">${policyRules.length} rule${policyRules.length === 1 ? '' : 's'}</span>` +
    `</div>` +
    policyTable +
    `</section>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Write paths</h3>` +
    `</div>` +
    `<div class="write-paths">${writeList}</div>` +
    `</section>` +
    // ───────── ACTIVITY ─────────
    `<span class="band-label">Activity</span>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Sessions · appearances</h3>` +
    `<span class="node-section__hint">${agg.sessions.length} total</span>` +
    `</div>` +
    sessionList +
    `</section>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Recent turns</h3>` +
    `</div>` +
    turnsList +
    `</section>` +
    `<section class="node-section">` +
    `<div class="node-section__head">` +
    `<h3 class="node-section__title">Telemetry · last 60 min</h3>` +
    `</div>` +
    telemetry +
    `</section>`;

  // Wire session jumps
  nodeEls.detail.querySelectorAll('[data-jump-session]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const sid = a.dataset.jumpSession;
      switchView('hub');
      const row = document.querySelector(`.thread[data-session-id="${sid}"]`);
      if (row) row.click();
    });
  });

  // Wire node jumps (outbound contracts → peer node detail)
  nodeEls.detail.querySelectorAll('[data-jump-node]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const nid = a.dataset.jumpNode;
      if (NODES[nid]) renderNodeDetail(nid);
    });
  });
}

export function handleNodeAction(name, act) {
  const n = NODES[name];
  if (!n) return;
  if (act === 'toggle-pause') {
    n.paused = !n.paused;
  } else if (act === 'restart') {
    n.paused = false;
  } else if (act === 'clone') {
    let i = 2;
    const base = name.replace(/\.node$/, '');
    while (NODES[`${base}-${i}.node`]) i++;
    const clone = JSON.parse(JSON.stringify(n));
    clone.name = `${base}-${i}.node`;
    clone.createdAt = nowClock() + ' local';
    clone.paused = true;
    NODES[clone.name] = clone;
    state.currentNodeId = clone.name;
  } else if (act === 'archive') {
    delete NODES[name];
    NODE_PINS.delete(name);
    const remaining = Object.keys(NODES);
    state.currentNodeId = remaining[0] || null;
  }
  refreshFleetMeta();
  renderNodeList();
  if (state.currentNodeId) renderNodeDetail(state.currentNodeId);
  else if (nodeEls.detail)
    nodeEls.detail.innerHTML =
      '<div class="empty-hint">No nodes in fleet. Create one with <strong>+ New</strong>.</div>';
}
