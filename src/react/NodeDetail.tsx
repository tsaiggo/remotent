import { NODES } from '../data/nodes.js';
import { nodeAggregates, nodeStatus } from '../data/aggregates.js';
import type {
  AgentNode,
  HumanInLoopRule,
  McpResource,
  NodeAggregates,
  OutboundContract,
  Subscription,
  ToolGrant,
} from '../types/index.js';
import { sparkSvg } from '../util/spark.js';
import { nowClock } from '../util/time.js';

interface NodeDetailProps {
  nodeId: string | null;
  pinned: ReadonlySet<string>;
  revision: number;
  onJumpSession: (sessionId: string) => void;
  onJumpNode: (nodeId: string) => void;
  onAction: (act: NodeAction) => void;
}

export type NodeAction = 'toggle-pause' | 'restart' | 'clone' | 'archive';

export function NodeDetail({
  nodeId,
  pinned: _pinned,
  revision,
  onJumpSession,
  onJumpNode,
  onAction,
}: NodeDetailProps) {
  void revision;
  if (!nodeId) {
    return (
      <div className="empty-hint">
        No nodes in fleet. Create one with <strong>+ New</strong>.
      </div>
    );
  }
  const n = NODES[nodeId];
  if (!n) {
    return (
      <div className="empty-hint">
        No nodes in fleet. Create one with <strong>+ New</strong>.
      </div>
    );
  }
  const agg = nodeAggregates(nodeId);
  const status = nodeStatus(nodeId);

  return (
    <>
      <header className="canvas__head">
        <div className="canvas__crumbs">
          <span>Fleet</span>
          <span className="canvas__sep">/</span>
          <span className="canvas__crumb-current" id="nodeCrumb">
            {n.name}
          </span>
        </div>
        <StatusBar n={n} status={status} onAction={onAction} />
      </header>

      <div className="canvas__title" id="nodeTitle">
        <p className="kicker">
          {n.persona} <span className="kicker__dot"></span>{' '}
          {status === 'live'
            ? 'Streaming'
            : status === 'paused'
              ? 'Paused'
              : status === 'error'
                ? 'Error'
                : 'Idle'}
        </p>
        <h2 className="display">
          <span className="display__serif">{n.name.replace(/\.node$/, '')}</span>
          <span className="display__sans">.node</span>
        </h2>
        <p className="lede" dangerouslySetInnerHTML={{ __html: n.lede }} />
        <ul className="node-meta" aria-label="Node metadata">
          <li>
            model · <b>{n.model}</b>
          </li>
          <li>
            runtime · <b>ACP v0.2</b>
          </li>
          <li>
            created · <b>{n.createdAt}</b>
          </li>
          <li>
            owner · <b>{n.owner}</b>
          </li>
        </ul>
      </div>

      <div className="node-detail" id="nodeDetail">
        <IdentityBand n={n} />
        <BrainBand n={n} />
        <CapabilitiesBand n={n} onJumpNode={onJumpNode} />
        <PolicyBand n={n} />
        <ActivityBand n={n} agg={agg} onJumpSession={onJumpSession} />
      </div>
    </>
  );
}

function StatusBar({
  n,
  status,
  onAction,
}: {
  n: AgentNode;
  status: ReturnType<typeof nodeStatus>;
  onAction: (act: NodeAction) => void;
}) {
  const pulseClass = `node node--${n.kind}`;
  const pauseLabel = n.paused ? 'Resume' : 'Pause';
  return (
    <div className="canvas__nodes" id="nodeStatus" aria-label="Node status">
      <span className="node-status">
        <span className={pulseClass}>
          {status === 'live' && <span className="node__pulse"></span>}
          {status}
        </span>
        <span className="node-status__endpoint">{n.endpoint}</span>
      </span>
      <span className="node-status__sep" aria-hidden="true"></span>
      <button
        type="button"
        className="node-status__btn"
        onClick={() => {
          onAction('toggle-pause');
        }}
      >
        {pauseLabel}
      </button>
      <button
        type="button"
        className="node-status__btn"
        onClick={() => {
          onAction('restart');
        }}
      >
        Restart
      </button>
      <button
        type="button"
        className="node-status__btn"
        onClick={() => {
          onAction('clone');
        }}
      >
        Clone
      </button>
      <button
        type="button"
        className="node-status__btn node-status__btn--danger"
        onClick={() => {
          onAction('archive');
        }}
      >
        Archive
      </button>
    </div>
  );
}

function IdentityBand({ n }: { n: AgentNode }) {
  const acp = n.acp;
  const att = acp.attestation;
  const hs = acp.handshake;
  const caps = acp.capabilities;
  return (
    <>
      <span className="band-label">Identity</span>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">ACP coordinates</h3>
          <span className="node-section__hint">
            {caps.length} capabilit{caps.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
        <dl className="dl-stats">
          <DlRow term="acp" def={`v${acp.version}`} />
          <DlRow term="endpoint" def={<code>{n.endpoint}</code>} />
          <DlRow term="key" def={att.keyId} />
          <DlRow
            term="handshake"
            def={`${hs.lastAt} · ${String(hs.peerCount)} peer${hs.peerCount === 1 ? '' : 's'}`}
          />
          <DlRow term="last signed" def={att.lastSigned} />
        </dl>
        {caps.length > 0 && (
          <div className="cap-chips">
            {caps.map((c) => (
              <span key={c} className="cap-chip">
                {c}
              </span>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function DlRow({ term, def }: { term: string; def: React.ReactNode }) {
  return (
    <div className="dl-stats__row">
      <dt>{term}</dt>
      <dd>{def}</dd>
    </div>
  );
}

function BrainBand({ n }: { n: AgentNode }) {
  return (
    <>
      <span className="band-label">Brain</span>
      <section className="node-section">
        <div className="prompt-card">
          <div className="prompt-card__head">
            <span className="prompt-card__title">System prompt</span>
            <button type="button" className="prompt-card__edit" aria-label="Edit system prompt">
              Edit
            </button>
          </div>
          <div className="prompt-card__shell">
            <pre className="prompt-card__body" contentEditable={false}>
              {n.systemPrompt}
            </pre>
            <div className="prompt-card__fade" aria-hidden="true"></div>
          </div>
        </div>
      </section>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Memory &amp; context</h3>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat__label">Context window</div>
            <div className="stat__value">{n.contextWindow}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Long-term memory</div>
            <div className="stat__value">{n.memoryItems}</div>
            <div className="stat__sub">items indexed</div>
          </div>
        </div>
      </section>
    </>
  );
}

function CapabilitiesBand({ n, onJumpNode }: { n: AgentNode; onJumpNode: (id: string) => void }) {
  return (
    <>
      <span className="band-label">Capabilities</span>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Tools · ACP grants</h3>
          <span className="node-section__hint">{n.tools.length} authorized</span>
        </div>
        <div className="chip-grid">
          {n.tools.length > 0 ? (
            n.tools.map((t) => <ToolChipView key={t.name} t={t} />)
          ) : (
            <div className="empty-hint">No tools granted.</div>
          )}
        </div>
      </section>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Resources · MCP &amp; data</h3>
          <span className="node-section__hint">{n.mcp.length} mounted</span>
        </div>
        <div className="chip-grid">
          {n.mcp.length > 0 ? (
            n.mcp.map((m) => <McpChipView key={m.name} m={m} />)
          ) : (
            <div className="empty-hint">No external resources mounted.</div>
          )}
        </div>
      </section>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Subscriptions</h3>
          <span className="node-section__hint">
            {n.subscriptions.length} topic{n.subscriptions.length === 1 ? '' : 's'}
          </span>
        </div>
        {n.subscriptions.length > 0 ? (
          <ul className="sub-list">
            {n.subscriptions.map((s) => (
              <SubRow key={s.topic} s={s} />
            ))}
          </ul>
        ) : (
          <div className="empty-hint">No subscriptions.</div>
        )}
      </section>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Outbound contracts</h3>
          <span className="node-section__hint">
            {n.outbound.length} peer{n.outbound.length === 1 ? '' : 's'}
          </span>
        </div>
        {n.outbound.length > 0 ? (
          <ul className="out-list">
            {n.outbound.map((o) => (
              <OutRow key={o.target} o={o} onJump={onJumpNode} />
            ))}
          </ul>
        ) : (
          <div className="empty-hint">No outbound contracts.</div>
        )}
      </section>
    </>
  );
}

function ToolChipView({ t }: { t: ToolGrant }) {
  const acpBits = [
    t.ack ? `ack: ${t.ack}` : null,
    t.ttl ? `ttl ${t.ttl}` : null,
    t.rate || null,
    typeof t.errorRate24h === 'number' ? `err ${t.errorRate24h.toFixed(1)}%` : null,
  ].filter((x): x is string => Boolean(x));
  const paths = t.resources;
  const isRich = acpBits.length > 0 || paths.length > 0;
  const nameSpan = (
    <span className="tool-chip__name">
      <span className={`tool-chip__scope tool-chip__scope--${t.scope}`}>{t.scope}</span>
      {t.name}
    </span>
  );
  const metaSpan = <span className="tool-chip__meta">{t.calls24h} · 24h</span>;
  return (
    <div className={`tool-chip${isRich ? ' tool-chip--rich' : ''}`}>
      {isRich ? (
        <>
          <div className="tool-chip__row">
            {nameSpan}
            {metaSpan}
          </div>
          {acpBits.length > 0 && <div className="tool-chip__acp">{acpBits.join(' · ')}</div>}
          {paths.length > 0 && (
            <div className="tool-chip__paths">
              {paths.map((p) => (
                <code key={p}>{p}</code>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {nameSpan}
          {metaSpan}
        </>
      )}
    </div>
  );
}

function McpChipView({ m }: { m: McpResource }) {
  return (
    <div className="mcp-chip">
      <span className="mcp-chip__name">{m.name}</span>
      <span className="mcp-chip__meta">{m.meta}</span>
    </div>
  );
}

function SubRow({ s }: { s: Subscription }) {
  return (
    <li className="sub-row">
      <span className="sub-row__topic">{s.topic}</span>
      <span className="sub-row__count">{s.count24h}/24h</span>
      <span className="sub-row__since">since {s.since}</span>
      <span className="sub-row__qos">{s.qos}</span>
    </li>
  );
}

function OutRow({ o, onJump }: { o: OutboundContract; onJump: (id: string) => void }) {
  const known = o.target in NODES;
  return (
    <li className="out-row">
      <span className="out-row__arrow" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
      {known ? (
        <a
          href="#"
          className="out-row__target"
          onClick={(e) => {
            e.preventDefault();
            onJump(o.target);
          }}
        >
          {o.target}
        </a>
      ) : (
        <span className="out-row__target out-row__target--unknown">{o.target}</span>
      )}
      <span className="out-row__contract">{o.contract}</span>
      <span className="out-row__calls">{o.calls24h} calls</span>
      <span className="out-row__p50">p50 {o.p50}</span>
      <span className="out-row__qos">{o.ack}</span>
    </li>
  );
}

function PolicyBand({ n }: { n: AgentNode }) {
  const acp = n.acp;
  const pol = n.policy;
  const ack = acp.ack;
  const overrideCount = Object.keys(ack.perToolOverrides).length;
  const writePaths = n.permissions.writePaths;

  return (
    <>
      <span className="band-label">Policy</span>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">ACP runtime</h3>
        </div>
        <div className="acp-runtime">
          <RuntimeRow label="Ack default">
            {ack.default}
            {overrideCount > 0 && (
              <span className="acp-runtime__hint">
                {' '}
                · {overrideCount} override{overrideCount === 1 ? '' : 's'}
              </span>
            )}
          </RuntimeRow>
          <RuntimeRow label="Idempotency">{acp.idempotencyWindow} window</RuntimeRow>
          <RuntimeRow label="Retry">
            {pol.retry.policy} · max {pol.retry.max}
          </RuntimeRow>
          <RuntimeRow label="Timeout">{pol.timeout}</RuntimeRow>
          <RuntimeRow label="Rate limit">
            {pol.rateLimit.tokensPerMin} tok/min · {pol.rateLimit.callsPerMin} calls/min
          </RuntimeRow>
          <RuntimeRow label="Concurrency">max {pol.concurrency.maxInFlight} in-flight</RuntimeRow>
          <RuntimeRow label="Attestation">
            {acp.attestation.algo} · {acp.attestation.keyId}
          </RuntimeRow>
          <RuntimeRow label="Last handshake">
            {acp.handshake.lastAt} · {acp.handshake.peerCount} peer
            {acp.handshake.peerCount === 1 ? '' : 's'}
          </RuntimeRow>
        </div>
      </section>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Human-in-loop · rules</h3>
          <span className="node-section__hint">
            {pol.humanInLoop.length} rule{pol.humanInLoop.length === 1 ? '' : 's'}
          </span>
        </div>
        {pol.humanInLoop.length > 0 ? (
          <PolicyTable rules={pol.humanInLoop} />
        ) : (
          <div className="empty-hint">No human-in-loop rules — fully autonomous.</div>
        )}
      </section>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Write paths</h3>
        </div>
        <div className="write-paths">
          {writePaths.length > 0 ? (
            writePaths.map((p) => <code key={p}>{p}</code>)
          ) : (
            <span className="empty-hint">Read-only.</span>
          )}
        </div>
      </section>
    </>
  );
}

function RuntimeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="acp-runtime__row">
      <span className="acp-runtime__label">{label}</span>
      <span className="acp-runtime__value">{children}</span>
    </div>
  );
}

const POLICY_CHIP_ACTIONS = new Set<string>(['ask', 'block', 'log', 'auto']);

function PolicyTable({ rules }: { rules: HumanInLoopRule[] }) {
  return (
    <div className="policy-table" role="table">
      <div className="policy-table__head" role="row">
        <span role="columnheader">trigger</span>
        <span role="columnheader">action</span>
        <span role="columnheader">scope</span>
      </div>
      {rules.map((r, i) => {
        const act = POLICY_CHIP_ACTIONS.has(r.action) ? r.action : 'log';
        return (
          <div key={`${r.trigger}-${String(i)}`} className="policy-table__row" role="row">
            <span className="policy-table__trigger">{r.trigger}</span>
            <span>
              <span className={`policy-chip policy-chip--${act}`}>{r.action}</span>
            </span>
            <span className="policy-table__scope">{r.scope}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityBand({
  n,
  agg,
  onJumpSession,
}: {
  n: AgentNode;
  agg: NodeAggregates;
  onJumpSession: (id: string) => void;
}) {
  const sparkColor =
    n.kind === 'dev'
      ? 'var(--green-ink)'
      : n.kind === 'design'
        ? 'var(--purple-ink)'
        : n.kind === 'research'
          ? 'var(--blue-ink)'
          : 'var(--ink-2)';

  return (
    <>
      <span className="band-label">Activity</span>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Sessions · appearances</h3>
          <span className="node-section__hint">{agg.sessions.length} total</span>
        </div>
        {agg.sessions.length > 0 ? (
          <ul className="node-sessions">
            {agg.sessions.map((s) => (
              <li key={s.id}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onJumpSession(s.id);
                  }}
                >
                  <span className="node-sessions__title">{s.title}</span>
                  <span className="node-sessions__meta">
                    {s.live ? 'live · ' : ''}
                    {s.kicker}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-hint">No sessions reference this node yet.</div>
        )}
      </section>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Recent turns</h3>
        </div>
        {agg.recentTurns.length > 0 ? (
          <ul className="node-turns">
            {agg.recentTurns.map((t, i) => (
              <li key={`${String(t.time ?? '')}-${String(i)}`} className="node-turn">
                <span className="node-turn__time">{t.time ?? ''}</span>
                <span
                  className="node-turn__body"
                  dangerouslySetInnerHTML={{ __html: t.text ?? '' }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-hint">No recent turns recorded.</div>
        )}
      </section>
      <section className="node-section">
        <div className="node-section__head">
          <h3 className="node-section__title">Telemetry · last 60 min</h3>
        </div>
        <div className="telemetry">
          <TelemetryCard
            label="tokens / min"
            value={String(1200 + ((n.name.length * 37) % 800))}
            seed={n.name + ':tok'}
            color={sparkColor}
          />
          <TelemetryCard
            label="tool-call success"
            value={`${(94 + ((n.name.length * 7) % 5)).toFixed(0)}.${String((n.name.length * 3) % 9)}%`}
            seed={n.name + ':ok'}
            color={sparkColor}
          />
          <TelemetryCard
            label="avg turn latency"
            value={`${(0.8 + (n.name.length % 9) / 10).toFixed(2)}s`}
            seed={n.name + ':lat'}
            color={sparkColor}
          />
        </div>
      </section>
    </>
  );
}

function TelemetryCard({
  label,
  value,
  seed,
  color,
}: {
  label: string;
  value: string;
  seed: string;
  color: string;
}) {
  return (
    <div className="telemetry__card">
      <div className="telemetry__head">
        <span className="telemetry__label">{label}</span>
        <span className="telemetry__value">{value}</span>
      </div>
      <span dangerouslySetInnerHTML={{ __html: sparkSvg(seed, color) }} />
    </div>
  );
}

export function applyNodeAction(
  nodeId: string,
  act: NodeAction,
  pinned: Set<string>,
): string | null {
  const n = NODES[nodeId];
  if (!n) return nodeId;
  if (act === 'toggle-pause') {
    n.paused = !n.paused;
    return nodeId;
  }
  if (act === 'restart') {
    n.paused = false;
    return nodeId;
  }
  if (act === 'clone') {
    let i = 2;
    const base = nodeId.replace(/\.node$/, '');
    while (NODES[`${base}-${String(i)}.node`]) i++;
    const clone = JSON.parse(JSON.stringify(n)) as AgentNode;
    clone.name = `${base}-${String(i)}.node`;
    clone.createdAt = nowClock() + ' local';
    clone.paused = true;
    NODES[clone.name] = clone;
    return clone.name;
  }
  if (act === 'archive') {
    delete NODES[nodeId];
    pinned.delete(nodeId);
    const remaining = Object.keys(NODES);
    return remaining[0] ?? null;
  }
  return nodeId;
}
