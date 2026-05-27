import { useEffect, useRef } from 'react';
import { AGENT_AVATAR, HUMAN_AVATAR_URL, SVG } from '../data/avatars.js';
import { nowClock } from '../util/time.js';
import type { TerminalSegment, Turn as TurnType } from '../types/index.js';

const STREAM_PHRASES = [
  'drafting patch',
  'compiling test matrix',
  'gating commits behind ack',
  'staging migration brief',
];

type TurnProps = { turn: TurnType };

export function Turn({ turn }: TurnProps) {
  const isHuman = turn.kind === 'human';
  const liveClockRef = useRef<HTMLTimeElement>(null);
  const streamTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!turn.streaming) return;
    const clockTimer = setInterval(() => {
      if (liveClockRef.current) liveClockRef.current.textContent = nowClock();
    }, 1000);

    let pi = 0;
    let ci = 0;
    let mode: 'type' | 'hold' = 'type';
    let hold = 0;
    const streamTimer = setInterval(() => {
      const target = STREAM_PHRASES[pi];
      const el = streamTextRef.current;
      if (!target || !el) return;
      if (mode === 'type') {
        if (ci < target.length) {
          el.textContent = target.slice(0, ci + 1);
          ci += 1;
        } else {
          mode = 'hold';
          hold = 12;
        }
      } else if (hold > 0) {
        hold -= 1;
      } else {
        ci = 0;
        pi = (pi + 1) % STREAM_PHRASES.length;
        mode = 'type';
      }
    }, 80);

    return () => {
      clearInterval(clockTimer);
      clearInterval(streamTimer);
    };
  }, [turn.streaming]);

  const node = turn.node ?? '';
  const avatarSrc = isHuman
    ? HUMAN_AVATAR_URL
    : (AGENT_AVATAR[node] ?? AGENT_AVATAR['agent'] ?? HUMAN_AVATAR_URL);
  const avatarClass = isHuman
    ? 'turn__avatar'
    : `turn__avatar turn__avatar--${node}${turn.streaming ? ' is-live' : ''}`;

  const classes = ['turn', isHuman ? 'turn--human' : 'turn--agent'];
  if (turn.quiet) classes.push('turn--quiet');
  if (turn.streaming) classes.push('turn--streaming');

  const proseClass = turn.quiet ? 'prose prose--quiet' : 'prose';
  const roleClass = turn.roleClass ? ` turn__role--${turn.roleClass}` : '';

  return (
    <li className={classes.join(' ')} data-node={turn.node ?? undefined}>
      <div className="turn__gutter">
        <span className={avatarClass} aria-hidden="true">
          <img className="turn__avatar-img" src={avatarSrc} alt="" />
        </span>
        {!turn.streaming && <span className="turn__rail" aria-hidden="true"></span>}
      </div>
      <div className="turn__body">
        <header className="turn__head">
          <span className="turn__who">{turn.who}</span>
          {turn.role !== undefined && <span className={`turn__role${roleClass}`}>{turn.role}</span>}
          {turn.streaming && <span className="live-dot" aria-hidden="true"></span>}
          <time
            className="turn__time"
            ref={turn.streaming ? liveClockRef : undefined}
            id={turn.streaming ? 'liveClock' : undefined}
          >
            {turn.time ?? ''}
          </time>
          {turn.tools && turn.tools.length > 0 && (
            <span className="turn__tools">
              {turn.tools.map((tool) => (
                <span key={tool} className="chip">
                  {tool}
                </span>
              ))}
            </span>
          )}
        </header>
        {turn.streaming ? (
          <p className={proseClass} id="streamText">
            <span ref={streamTextRef}></span>
            <span className="caret">▍</span>
          </p>
        ) : (
          turn.text !== undefined && (
            <p className={proseClass} dangerouslySetInnerHTML={{ __html: turn.text }} />
          )
        )}
        {turn.terminal && turn.terminal.length > 0 && (
          <pre className="terminal" aria-label={`${turn.who} terminal`}>
            {turn.terminal.map((seg, i) => (
              <TerminalLineView
                key={`${seg.type}-${String(i)}`}
                seg={seg}
                who={turn.who}
                last={i === (turn.terminal?.length ?? 0) - 1}
              />
            ))}
          </pre>
        )}
        {turn.artifact && (
          <figure className="artifact">
            <div
              className="artifact__chart"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: SVG['sparkline'] ?? '' }}
            />
            <figcaption>
              <span>{turn.artifact.caption}</span>
              <span className="artifact__meta">{turn.artifact.meta}</span>
            </figcaption>
          </figure>
        )}
      </div>
    </li>
  );
}

function TerminalLineView({
  seg,
  who,
  last,
}: {
  seg: TerminalSegment;
  who: string;
  last: boolean;
}) {
  const newline = last ? '' : '\n';
  if (seg.type === 'prompt') {
    return (
      <>
        <span className="t-prompt">{who} ▸</span> <span className="t-cmd">{seg.cmd}</span>
        {newline}
      </>
    );
  }
  if (seg.type === 'line') {
    return (
      <>
        <span className="t-line">{seg.text}</span>
        {newline}
      </>
    );
  }
  if (seg.type === 'out') {
    return (
      <>
        <span className="t-out">{seg.text}</span>
        {newline}
      </>
    );
  }
  if (seg.type === 'stream') {
    return (
      <>
        <span className="t-prompt">{who} ▸</span>{' '}
        <span className="t-stream">
          {seg.text}
          <span className="t-caret">▍</span>
        </span>
        {newline}
      </>
    );
  }
  return null;
}
