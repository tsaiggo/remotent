import { useMemo } from 'react';
import { NODES } from '../data/nodes.js';
import { nodeStatus } from '../data/aggregates.js';
import { nodeAggregates } from '../data/aggregates.js';
import type { NodeKind, NodeStatusFilter } from '../types/index.js';
import { nowClock } from '../util/time.js';

const ALL_FILTERS: NodeStatusFilter[] = ['all', 'live', 'idle', 'paused', 'error'];

const PinIcon = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="12"
    height="12"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <path d="M14 2l8 8-5 1-4 4-1 5-2-2-5 5-1-1 5-5-2-2 5-1 4-4z" />
  </svg>
);

interface NodesPanelProps {
  currentNodeId: string | null;
  filter: NodeStatusFilter;
  search: string;
  pinned: ReadonlySet<string>;
  revision: number;
  onSelectNode: (id: string) => void;
  onChangeFilter: (f: NodeStatusFilter) => void;
  onChangeSearch: (q: string) => void;
  onTogglePin: (id: string) => void;
  onNewNode: () => void;
}

export function NodesPanel({
  currentNodeId,
  filter,
  search,
  pinned,
  revision,
  onSelectNode,
  onChangeFilter,
  onChangeSearch,
  onTogglePin,
  onNewNode,
}: NodesPanelProps) {
  void revision;
  const { counts, pinnedList, fleetList } = useMemo(() => {
    const names = Object.keys(NODES);
    const c: Record<NodeStatusFilter, number> = {
      all: names.length,
      live: 0,
      idle: 0,
      paused: 0,
      error: 0,
    };
    names.forEach((n) => {
      c[nodeStatus(n)] += 1;
    });
    const q = search.trim().toLowerCase();
    const matches = (name: string): boolean => {
      if (filter !== 'all' && nodeStatus(name) !== filter) return false;
      if (!q) return true;
      const n = NODES[name];
      if (!n) return false;
      const hay = [name, n.model, n.kind, ...n.tools.map((t) => t.name)].join(' ').toLowerCase();
      return hay.includes(q);
    };
    return {
      counts: c,
      pinnedList: names.filter((n) => pinned.has(n) && matches(n)),
      fleetList: names.filter((n) => !pinned.has(n) && matches(n)),
    };
    // `revision` is an invalidation signal: NODES is mutated in place by
    // applyNodeAction / createBlankNode; bumping revision tells the memo
    // to re-derive. Not used inside the closure body, so both lint rules
    // mistakenly flag it as unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-x/exhaustive-deps
  }, [filter, search, pinned, revision]);

  return (
    <>
      <header className="sessions__head">
        <div className="sessions__title">
          <h1>
            <span className="serif">Nod</span>
            <span className="sans">·es</span>
          </h1>
          <p className="sessions__sub" id="nodesFleetMeta">
            ACP fleet · {counts.live} online / {counts.all} total
          </p>
        </div>

        <button className="sessions__new" type="button" aria-label="New node" onClick={onNewNode}>
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>New</span>
        </button>
      </header>

      <div className="sessions__search">
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder="Search nodes, models, tools…"
          aria-label="Search nodes"
          value={search}
          onChange={(e) => {
            onChangeSearch(e.target.value);
          }}
        />
        <kbd>⌘K</kbd>
      </div>

      <nav className="tabs" role="tablist" aria-label="Filter nodes">
        {ALL_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`tabs__btn${filter === f ? ' is-active' : ''}`}
            role="tab"
            aria-selected={filter === f}
            onClick={() => {
              onChangeFilter(f);
            }}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}{' '}
            <span className="tabs__count">{String(counts[f]).padStart(2, '0')}</span>
          </button>
        ))}
      </nav>

      <section className="group" aria-label="Pinned">
        <h2 className="group__label">
          <span>Pinned</span>
          <span className="group__rule" aria-hidden="true"></span>
        </h2>
        <ul className="thread-list node-list" role="list">
          {pinnedList.length > 0 ? (
            pinnedList.map((name) => (
              <NodeRow
                key={name}
                name={name}
                active={name === currentNodeId}
                pinned
                onSelect={() => {
                  onSelectNode(name);
                }}
                onTogglePin={() => {
                  onTogglePin(name);
                }}
              />
            ))
          ) : (
            <li className="empty-hint" style={{ padding: '6px 8px' }}>
              No pinned nodes.
            </li>
          )}
        </ul>
      </section>

      <section className="group" aria-label="Fleet">
        <h2 className="group__label">
          <span>Fleet</span>
          <span className="group__rule" aria-hidden="true"></span>
        </h2>
        <ul className="thread-list node-list" role="list">
          {fleetList.length > 0 ? (
            fleetList.map((name) => (
              <NodeRow
                key={name}
                name={name}
                active={name === currentNodeId}
                pinned={false}
                onSelect={() => {
                  onSelectNode(name);
                }}
                onTogglePin={() => {
                  onTogglePin(name);
                }}
              />
            ))
          ) : (
            <li className="empty-hint" style={{ padding: '6px 8px' }}>
              No nodes match this filter.
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

interface NodeRowProps {
  name: string;
  active: boolean;
  pinned: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
}

function NodeRow({ name, active, pinned, onSelect, onTogglePin }: NodeRowProps) {
  const n = NODES[name];
  if (!n) return null;
  const agg = nodeAggregates(name);
  const status = nodeStatus(name);
  const sessCount = agg.sessions.length;
  const toolCount = n.tools.length;
  const last = agg.recentTurns[0]?.time ?? '—';

  return (
    <li
      className={`node-row${active ? ' is-active' : ''}`}
      data-node-id={name}
      data-status={status}
      tabIndex={0}
      aria-label={`${name} · ${status}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span
        className={`node-row__dot is-${status} node-row__dot--${n.kind}`}
        aria-hidden="true"
      ></span>
      <div className="node-row__body">
        <div className="node-row__head">
          <span className="node-row__name">{n.name}</span>
          <span className="node-row__role">{n.model}</span>
        </div>
        <p className="node-row__meta">
          <span className={`tag tag--${n.kind}`}>{n.kind}</span>
          <span>
            {sessCount} session{sessCount === 1 ? '' : 's'}
          </span>
          <span className="sep">·</span>
          <span>
            {toolCount} tool{toolCount === 1 ? '' : 's'}
          </span>
          <span className="sep">·</span>
          <span>{last}</span>
        </p>
      </div>
      <button
        type="button"
        className={`node-row__pin${pinned ? ' is-on' : ''}`}
        aria-label={pinned ? 'Unpin' : 'Pin'}
        title={pinned ? 'Pinned' : 'Pin'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
      >
        <PinIcon filled={pinned} />
      </button>
    </li>
  );
}

const KINDS: NodeKind[] = ['dev', 'design', 'research'];

export function createBlankNode(counter: number): {
  id: string;
  node: ReturnType<typeof buildBlank>;
} {
  const kind = KINDS[(counter - 1) % KINDS.length] ?? 'dev';
  const id = `node-${String(Date.now())}-${String(counter)}.node`;
  return { id, node: buildBlank(id, kind, counter) };
}

function buildBlank(id: string, kind: NodeKind, counter: number) {
  return {
    name: id,
    kind,
    model: 'unconfigured',
    role: 'agent · unconfigured',
    persona: 'New agent — configure persona, tools, and permissions.',
    lede: 'A blank node. Open the system prompt and grant tools to bring it online.',
    createdAt: nowClock() + ' local',
    owner: 'Wen',
    endpoint: `acp://fleet.local/${kind}-${String(counter)}`,
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
      ack: { default: 'at-most-once' as const, perToolOverrides: {} },
      idempotencyWindow: '5m',
      attestation: { algo: 'ed25519', keyId: 'fp:pending', lastSigned: '—' },
      handshake: { lastAt: '—', peerCount: 0 },
    },
    policy: {
      humanInLoop: [{ trigger: '*', action: 'ask' as const, scope: 'all' }],
      rateLimit: { tokensPerMin: 1000, callsPerMin: 10 },
      concurrency: { maxInFlight: 1 },
      retry: { policy: 'expo', max: 1 },
      timeout: '30s',
    },
    subscriptions: [],
    outbound: [],
  };
}
