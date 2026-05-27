import { useEffect, useRef, useState } from 'react';
import type { Turn } from '../types/index.js';
import { nowClock } from '../util/time.js';

const AGENT_REPLIES: Turn[] = [
  {
    kind: 'agent',
    who: 'dev.node',
    role: 'agent · gpt-codex',
    roleClass: 'dev',
    node: 'dev',
    tools: ['repo.read'],
    text: 'Working on it — gating the rollout behind <code>ingest.v2</code>. Will report when canary is green.',
  },
  {
    kind: 'agent',
    who: 'design.node',
    role: 'agent · claude-opus',
    roleClass: 'design',
    node: 'design',
    text: 'Aligning the sparkline strip on the operator console. Pushing the diff to the staging surface in a moment.',
  },
  {
    kind: 'agent',
    who: 'research.node',
    role: 'agent · gemini',
    node: 'research',
    quiet: true,
    text: 'Pinning Pulsar exactly-once references to the working library — <a href="#">expand 3 refs</a>.',
  },
];

interface ComposerProps {
  appendTurn: (turn: Turn) => void;
}

export function Composer({ appendTurn }: ComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('.sessions__search input');
        search?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    appendTurn({
      kind: 'human',
      who: 'Wen',
      role: 'human',
      time: nowClock(),
      text,
    });
    setValue('');
    const reply = AGENT_REPLIES[Math.floor(Math.random() * AGENT_REPLIES.length)];
    if (!reply) return;
    setTimeout(() => {
      appendTurn({ ...reply, time: nowClock() });
    }, 1200);
  };

  return (
    <footer className="composer">
      <div className="composer__rail" aria-hidden="true"></div>
      <div className="composer__box">
        <div className="composer__toolbar">
          <button className="composer__chip" type="button">
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Attach
          </button>
          <button className="composer__chip" type="button">
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <path d="M4 6h16M4 12h10M4 18h16" />
            </svg>
            Prompt
          </button>
          <button className="composer__chip" type="button">
            @ mention
          </button>
          <span className="composer__spacer"></span>
          <span className="composer__model">
            <span className="composer__dot"></span> dev · design · research
          </span>
        </div>

        <form className="composer__form" id="composer" onSubmit={onSubmit}>
          <span className="composer__prompt" aria-hidden="true">
            ▸
          </span>
          <input
            ref={inputRef}
            id="composerInput"
            className="composer__input"
            type="text"
            autoComplete="off"
            placeholder="Direct the swarm — type a command, or / for tools…"
            aria-label="Command input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
          <kbd className="composer__kbd">⌘ ⏎</kbd>
          <button className="composer__send" type="submit" aria-label="Send">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
      <p className="composer__hint">
        ACP stream secured · end-to-end · <em>your turn shapes the swarm.</em>
      </p>
    </footer>
  );
}
