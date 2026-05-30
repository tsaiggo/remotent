import { useState, useCallback } from 'react';
import {
  ACP_SESSION_ID,
  cwdBasename,
  formatRelativeTime,
  groupSessionsByDate,
  sessionDisplayTitle,
} from '../acp/adapter.js';
import type { AcpSessionInfo, AcpStatus } from '../acp/index.js';
import { useIntersectionObserver } from './useIntersectionObserver.js';

type FilterKind = 'all' | 'human' | 'agent';

interface SessionsProps {
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  acpStatus: AcpStatus;
  acpAgent: string;
  acpSessions: AcpSessionInfo[];
  acpSessionsLoading: boolean;
}

const PinSvg = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="11"
    height="11"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.4"
    aria-hidden="true"
  >
    <path d="M14 2l8 8-5 1-4 4-1 5-2-2-5 5-1-1 5-5-2-2 5-1 4-4z" />
  </svg>
);

export function Sessions({
  currentSessionId,
  onSelectSession,
  acpStatus,
  acpAgent,
  acpSessions,
  acpSessionsLoading,
}: SessionsProps) {
  const [filterMode, setFilterMode] = useState<FilterKind>('all');
  const [pinnedSet, setPinnedSet] = useState<Set<string>>(() => loadPinned());
  const [limit, setLimit] = useState(50);

  const setFilter = (f: FilterKind) => {
    setFilterMode(f);
    setLimit(50);
  };

  const togglePin = (id: string) => {
    setPinnedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      savePinned(next);
      return next;
    });
  };

  const visibleSessions = acpSessions;
  const pinnedSessions = visibleSessions.filter((s) => pinnedSet.has(s.sessionId));
  const unpinnedSessions = visibleSessions.filter((s) => !pinnedSet.has(s.sessionId));

  const slicedUnpinned = unpinnedSessions.slice(0, limit);
  const hasMore = limit < unpinnedSessions.length;

  const handleLoadMore = useCallback(() => {
    setLimit((prev) => prev + 50);
  }, []);

  const loadMoreRef = useIntersectionObserver(handleLoadMore, { rootMargin: '200px' });

  const groups = groupSessionsByDate(slicedUnpinned);

  const totalCount = visibleSessions.length;
  const isAcpLiveActive = currentSessionId === ACP_SESSION_ID;

  return (
    <>
      <header className="sessions__head">
        <div className="sessions__title">
          <h1>
            <span className="serif">Remot</span>
            <span className="sans">·ent</span>
          </h1>
          <p className="sessions__sub">
            Multi-Agent Console <span className="sep">·</span> ACP v0.2
          </p>
        </div>
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
        <input type="search" placeholder="Search sessions, nodes, threads…" aria-label="Search" />
        <kbd>⌘K</kbd>
      </div>

      <nav className="tabs" role="tablist" aria-label="Filter sessions">
        {(['all', 'human', 'agent'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`tabs__btn${filterMode === f ? ' is-active' : ''}`}
            role="tab"
            aria-selected={filterMode === f}
            data-filter={f}
            onClick={() => {
              setFilter(f);
            }}
          >
            {f === 'all' ? 'All' : f === 'human' ? 'Human' : 'Agent'}{' '}
            <span className="tabs__count">
              {f === 'all' ? String(totalCount).padStart(2, '0') : '00'}
            </span>
          </button>
        ))}
      </nav>

      {acpStatus !== 'idle' && (
        <ThreadGroup label="Live · ACP">
          <ul className="thread-list" role="list">
            <AcpLiveThread
              status={acpStatus}
              agent={acpAgent}
              active={isAcpLiveActive}
              onSelect={() => {
                onSelectSession(ACP_SESSION_ID);
              }}
            />
          </ul>
        </ThreadGroup>
      )}

      {filterMode === 'human' && (
        <EmptyHint message="Human-only filter doesn't apply to opencode sessions. Switch to All or Agent." />
      )}

      {filterMode !== 'human' && pinnedSessions.length > 0 && (
        <ThreadGroup label="Pinned">
          <ul className="thread-list" role="list">
            {pinnedSessions.map((s) => (
              <SessionThread
                key={s.sessionId}
                session={s}
                pinned
                active={currentSessionId === s.sessionId}
                onSelect={() => {
                  onSelectSession(s.sessionId);
                }}
                onTogglePin={() => {
                  togglePin(s.sessionId);
                }}
              />
            ))}
          </ul>
        </ThreadGroup>
      )}

      {filterMode !== 'human' &&
        groups.map((g) => (
          <ThreadGroup key={g.bucket} label={g.label}>
            <ul className="thread-list" role="list">
              {g.sessions.map((s) => (
                <SessionThread
                  key={s.sessionId}
                  session={s}
                  pinned={false}
                  active={currentSessionId === s.sessionId}
                  onSelect={() => {
                    onSelectSession(s.sessionId);
                  }}
                  onTogglePin={() => {
                    togglePin(s.sessionId);
                  }}
                />
              ))}
            </ul>
          </ThreadGroup>
        ))}

      {hasMore && filterMode !== 'human' && (
        <div ref={loadMoreRef} style={{ height: 20, margin: '12px 0' }} aria-hidden="true" />
      )}

      {acpStatus === 'connected' &&
        !acpSessionsLoading &&
        visibleSessions.length === 0 &&
        filterMode !== 'human' && (
          <EmptyHint message="No past sessions yet — start a new chat above." />
        )}

      {(acpStatus === 'idle' || acpStatus === 'error') && (
        <EmptyHint
          message={
            acpStatus === 'error'
              ? 'Sidecar error. Run `bun run server` to see your opencode sessions here.'
              : 'Sidecar offline. Run `bun run server` to see your opencode sessions here.'
          }
        />
      )}
    </>
  );
}

function ThreadGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="group" aria-label={label}>
      <h2 className="group__label">
        <span>{label}</span>
        <span className="group__rule" aria-hidden="true"></span>
      </h2>
      {children}
    </section>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <p
      style={{
        color: 'var(--ink-2, #888)',
        font: '12px/1.5 var(--font-sans, system-ui)',
        margin: '12px 16px',
        padding: '12px',
        border: '1px dashed var(--rule, #e5e5e5)',
        borderRadius: '6px',
      }}
    >
      {message}
    </p>
  );
}

interface SessionThreadProps {
  session: AcpSessionInfo;
  pinned: boolean;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
}

function SessionThread({ session, pinned, active, onSelect, onTogglePin }: SessionThreadProps) {
  const title = sessionDisplayTitle(session);
  const time = formatRelativeTime(session.updatedAt);
  const project = cwdBasename(session.cwd);
  return (
    <li
      className={`thread${active ? ' is-active' : ''}`}
      data-kind="agent"
      data-session-id={session.sessionId}
      title={`${session.sessionId} · ${session.cwd}`}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="thread__dot" aria-hidden="true"></span>
      <div className="thread__body">
        <div className="thread__row">
          <span className="thread__title">{title}</span>
          <time className="thread__time">{time}</time>
        </div>
        <p className="thread__snippet">
          <span className="tag tag--dev">{project}</span> <em>opencode session</em>
        </p>
      </div>
      <button
        className={`thread__pin${pinned ? ' is-on' : ''}`}
        type="button"
        aria-label={pinned ? 'Unpin' : 'Pin'}
        title={pinned ? 'Pinned' : 'Pin'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
      >
        <PinSvg filled={pinned} />
      </button>
    </li>
  );
}

interface AcpLiveThreadProps {
  status: AcpStatus;
  agent: string;
  active: boolean;
  onSelect: () => void;
}

function AcpLiveThread({ status, agent, active, onSelect }: AcpLiveThreadProps) {
  const dotClass =
    status === 'connected'
      ? 'is-live'
      : status === 'connecting'
        ? 'is-warn'
        : status === 'error'
          ? 'is-err'
          : '';
  const snippet =
    status === 'connected'
      ? 'Streaming over Agent Client Protocol.'
      : status === 'connecting'
        ? 'Handshaking with sidecar…'
        : status === 'error'
          ? 'Connection error — check `bun run server`.'
          : 'Idle.';
  return (
    <li
      className={`thread${active ? ' is-active' : ''}`}
      data-kind="agent"
      data-session-id={ACP_SESSION_ID}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span className={`thread__dot ${dotClass}`} aria-hidden="true"></span>
      <div className="thread__body">
        <div className="thread__row">
          <span className="thread__title">{agent}</span>
          <time className="thread__time">{status}</time>
        </div>
        <p className="thread__snippet">
          <span className="tag tag--agent">acp</span> {snippet}
        </p>
      </div>
    </li>
  );
}

const PINNED_STORAGE_KEY = 'remotent.acp.pinnedSessions';

function loadPinned(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function savePinned(set: Set<string>) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* quota / private mode */
  }
}
