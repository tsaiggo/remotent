import { useEffect, useRef } from 'react';
import { NODES } from '../data/nodes.js';
import { SESSIONS } from '../data/sessions.js';
import { state } from '../state/store.js';
import { switchView } from '../state/view.js';
import type { Session, SessionNodeRef, Turn as TurnType } from '../types/index.js';
import { Composer } from './Composer.js';
import { Turn } from './Turn.js';

interface CanvasProps {
  currentSessionId: string | null;
  revision: number;
  appendTurn: (turn: TurnType) => void;
}

export function Canvas({ currentSessionId, revision, appendTurn }: CanvasProps) {
  const session: Session | undefined = currentSessionId ? SESSIONS[currentSessionId] : undefined;
  const timelineRef = useRef<HTMLOListElement>(null);
  void revision;

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [currentSessionId, revision]);

  return (
    <>
      <header className="canvas__head">
        <div className="canvas__crumbs">
          <span>User Hub</span>
          <span className="canvas__sep">/</span>
          <span>Sessions</span>
          <span className="canvas__sep">/</span>
          <span className="canvas__crumb-current" id="crumbCurrent">
            {session?.crumb ?? '—'}
          </span>
        </div>

        <div className="canvas__nodes" id="canvasNodes" aria-label="Active nodes">
          {(session?.nodes ?? []).map((chip) => (
            <CanvasNodeChip key={chip.name} chip={chip} />
          ))}
          <span className="canvas__divider" aria-hidden="true"></span>
          <button className="canvas__icon" type="button" aria-label="Share">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" />
            </svg>
          </button>
          <button className="canvas__icon" type="button" aria-label="Branch">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <circle cx="6" cy="6" r="2" />
              <circle cx="6" cy="18" r="2" />
              <circle cx="18" cy="8" r="2" />
              <path d="M6 8v8M8 6h6a4 4 0 0 1 4 4" />
            </svg>
          </button>
          <button className="canvas__icon" type="button" aria-label="More">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="5" cy="12" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="canvas__title" id="canvasTitle">
        {session?.kicker !== undefined && <p className="kicker">{session.kicker}</p>}
        <h2 className="display">
          <span className="display__serif">{session?.titleSerif ?? '—'}</span>
          <span className="display__sans">{session?.titleSans ?? ''}</span>
        </h2>
        {session?.lede !== undefined && (
          <p className="lede" dangerouslySetInnerHTML={{ __html: session.lede }} />
        )}
      </div>

      <ol className="timeline" id="timeline" aria-label="Collaboration timeline" ref={timelineRef}>
        {(session?.turns ?? []).map((turn, i) => (
          <Turn key={`${currentSessionId ?? 'none'}-${String(i)}`} turn={turn} />
        ))}
      </ol>

      <Composer appendTurn={appendTurn} />
    </>
  );
}

function CanvasNodeChip({ chip }: { chip: SessionNodeRef }) {
  const id = `${chip.name}.node`;
  const exists = id in NODES;
  const onClick = exists
    ? () => {
        state.currentNodeId = id;
        switchView('nodes');
      }
    : undefined;
  const kindClass = chip.kind ? `node--${chip.kind}` : '';
  const className = `node ${kindClass}`.trim();
  return (
    <span
      className={className}
      title={chip.title ?? `${chip.name} node`}
      style={exists ? { cursor: 'pointer' } : undefined}
      onClick={onClick}
    >
      {chip.live && <span className="node__pulse"></span>}
      {chip.name}
    </span>
  );
}
