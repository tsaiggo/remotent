import { useState } from 'react';

type ThreadKind = 'human' | 'agent';
type DotState = '' | 'is-live' | 'is-warn';

interface Tag {
  label: string;
  kind: string;
}

interface ThreadMeta {
  id: string;
  kind: ThreadKind;
  pinned?: boolean;
  dot: DotState;
  title: string;
  time: string;
  tags: Tag[];
  snippet?: string;
  emText?: string;
}

const PINNED_THREADS: ThreadMeta[] = [
  {
    id: 'orbital',
    kind: 'agent',
    pinned: true,
    dot: 'is-live',
    title: 'Orbital telemetry refactor',
    time: '02:14',
    tags: [
      { label: 'dev', kind: 'dev' },
      { label: 'design', kind: 'design' },
    ],
    emText: '3 agents streaming · 14 turns',
  },
  {
    id: 'q3-brief',
    kind: 'human',
    pinned: true,
    dot: '',
    title: 'Q3 research brief — Wen',
    time: 'Yesterday',
    tags: [{ label: 'human', kind: 'human' }],
    snippet: 'Draft outline approved, awaiting citations.',
  },
];

const TODAY_THREADS: ThreadMeta[] = [
  {
    id: 'design-audit',
    kind: 'agent',
    dot: 'is-warn',
    title: 'Design system audit',
    time: '11:02',
    tags: [{ label: 'design', kind: 'design' }],
    snippet: 'Awaiting human review on token diff.',
  },
  {
    id: 'citation-crawler',
    kind: 'agent',
    dot: '',
    title: 'Citation crawler · arxiv-2411',
    time: '09:47',
    tags: [{ label: 'research', kind: 'research' }],
    snippet: '142 sources indexed.',
  },
  {
    id: 'pair-hana',
    kind: 'human',
    dot: '',
    title: 'Pair review — Hana',
    time: '08:30',
    tags: [{ label: 'human', kind: 'human' }],
    snippet: '"Let\u2019s revisit the routing layer tomorrow."',
  },
];

const EARLIER_THREADS: ThreadMeta[] = [
  {
    id: 'build-triage',
    kind: 'agent',
    dot: '',
    title: 'Build pipeline triage',
    time: 'Mon',
    tags: [{ label: 'dev', kind: 'dev' }],
    snippet: 'Resolved · 4 patches merged.',
  },
  {
    id: 'onboarding-mira',
    kind: 'human',
    dot: '',
    title: 'Onboarding — Mira',
    time: 'Sun',
    tags: [{ label: 'human', kind: 'human' }],
    snippet: 'Access provisioned, welcome doc sent.',
  },
];

type FilterKind = 'all' | 'human' | 'agent';

const PinSvg = ({ filled }: { filled: boolean }) => (
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

interface SessionsProps {
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
}

interface DraftThread {
  id: string;
  hhmm: string;
}

export function Sessions({ currentSessionId, onSelectSession }: SessionsProps) {
  const [filter, setFilter] = useState<FilterKind>('all');
  const [drafts, setDrafts] = useState<DraftThread[]>([]);
  const [pinnedSet, setPinnedSet] = useState<Set<string>>(() => new Set(['orbital', 'q3-brief']));

  const togglePin = (id: string) => {
    setPinnedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isVisible = (t: ThreadMeta): boolean => filter === 'all' || filter === t.kind;

  const allThreads = [...PINNED_THREADS, ...TODAY_THREADS, ...EARLIER_THREADS];
  const pinnedView = allThreads.filter((t) => pinnedSet.has(t.id));
  const unpinned = allThreads.filter((t) => !pinnedSet.has(t.id));
  const todayView = unpinned.filter((t) => TODAY_THREADS.some((x) => x.id === t.id));
  const earlierView = unpinned.filter((t) => EARLIER_THREADS.some((x) => x.id === t.id));

  const handleNewSession = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const id = `draft-${String(Date.now())}-${String(drafts.length + 1)}`;
    setDrafts((prev) => [...prev, { id, hhmm: `${hh}:${mm}` }]);
    onSelectSession(id);
  };

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

        <button
          className="sessions__new"
          id="newSessionBtn"
          type="button"
          aria-label="New session"
          onClick={handleNewSession}
        >
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
        <input type="search" placeholder="Search sessions, nodes, threads…" aria-label="Search" />
        <kbd>⌘K</kbd>
      </div>

      <nav className="tabs" role="tablist" aria-label="Filter sessions">
        {(['all', 'human', 'agent'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`tabs__btn${filter === f ? ' is-active' : ''}`}
            role="tab"
            aria-selected={filter === f}
            data-filter={f}
            onClick={() => {
              setFilter(f);
            }}
          >
            {f === 'all' ? 'All' : f === 'human' ? 'Human' : 'Agent'}{' '}
            <span className="tabs__count">{f === 'all' ? '24' : f === 'human' ? '07' : '17'}</span>
          </button>
        ))}
      </nav>

      {pinnedView.length > 0 && (
        <ThreadGroup label="Pinned">
          <ul className="thread-list" role="list">
            {pinnedView.filter(isVisible).map((t) => (
              <Thread
                key={t.id}
                t={t}
                pinned
                active={t.id === currentSessionId}
                onSelect={() => {
                  onSelectSession(t.id);
                }}
                onTogglePin={() => {
                  togglePin(t.id);
                }}
              />
            ))}
          </ul>
        </ThreadGroup>
      )}

      <ThreadGroup label="Today">
        <ul className="thread-list" id="todayList" role="list">
          {todayView.filter(isVisible).map((t) => (
            <Thread
              key={t.id}
              t={t}
              pinned={false}
              active={t.id === currentSessionId}
              onSelect={() => {
                onSelectSession(t.id);
              }}
              onTogglePin={() => {
                togglePin(t.id);
              }}
            />
          ))}
          {drafts.map((d) => (
            <li
              key={d.id}
              className={`thread${d.id === currentSessionId ? ' is-active' : ''}`}
              data-kind="agent"
              data-session-id={d.id}
              tabIndex={0}
              onClick={() => {
                onSelectSession(d.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSession(d.id);
                }
              }}
            >
              <span className="thread__dot" aria-hidden="true"></span>
              <div className="thread__body">
                <div className="thread__row">
                  <span className="thread__title">New session</span>
                  <time className="thread__time">{d.hhmm}</time>
                </div>
                <p className="thread__snippet">
                  <em>Draft · awaiting first turn.</em>
                </p>
              </div>
              <button
                className="thread__pin"
                type="button"
                aria-label="Pin"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <PinSvg filled={false} />
              </button>
            </li>
          ))}
        </ul>
      </ThreadGroup>

      <ThreadGroup label="Earlier this week">
        <ul className="thread-list" role="list">
          {earlierView.filter(isVisible).map((t) => (
            <Thread
              key={t.id}
              t={t}
              pinned={false}
              active={t.id === currentSessionId}
              onSelect={() => {
                onSelectSession(t.id);
              }}
              onTogglePin={() => {
                togglePin(t.id);
              }}
            />
          ))}
        </ul>
      </ThreadGroup>
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

interface ThreadProps {
  t: ThreadMeta;
  pinned: boolean;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
}

function Thread({ t, pinned, active, onSelect, onTogglePin }: ThreadProps) {
  return (
    <li
      className={`thread${active ? ' is-active' : ''}`}
      data-kind={t.kind}
      data-pinned={pinned ? 'true' : undefined}
      data-session-id={t.id}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span className={`thread__dot${t.dot ? ` ${t.dot}` : ''}`} aria-hidden="true"></span>
      <div className="thread__body">
        <div className="thread__row">
          <span className="thread__title">{t.title}</span>
          <time className="thread__time">{t.time}</time>
        </div>
        <p className="thread__snippet">
          {t.tags.map((tag) => (
            <span key={tag.label} className={`tag tag--${tag.kind}`}>
              {tag.label}
            </span>
          ))}{' '}
          {t.snippet}
          {t.emText !== undefined && <em>{t.emText}</em>}
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
