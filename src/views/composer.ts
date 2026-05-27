import { SESSIONS } from '../data/sessions.js';
import { state } from '../state/store.js';
import type { Turn } from '../types/index.js';
import { escapeHtml } from '../util/dom.js';
import { nowClock, pad } from '../util/time.js';
import { els, turnHtml } from './session.js';

/* ============================================================
   Composer — append a human turn to the current session,
   then schedule a mock agent reply.
   ============================================================ */
const form = document.getElementById('composer');
const input = document.getElementById('composerInput');

function appendTurn(turn: Turn): void {
  if (!state.currentSessionId) return;
  const s = SESSIONS[state.currentSessionId];
  if (!s) return;
  s.turns.push(turn);
  if (els.timeline) {
    els.timeline.insertAdjacentHTML('beforeend', turnHtml(turn));
    els.timeline.scrollTop = els.timeline.scrollHeight;
  }
}

const AGENT_REPLIES: Turn[] = [
  {
    kind: 'agent',
    node: 'dev',
    who: 'dev.node',
    role: 'agent · gpt-codex',
    roleClass: 'dev',
    text: 'Acknowledged. Drafting a patch and running the affected suite in the background.',
  },
  {
    kind: 'agent',
    node: 'design',
    who: 'design.node',
    role: 'agent · claude-opus',
    roleClass: 'design',
    text: 'Got it — I’ll stage a visual diff on the operator console and surface anything that drifts from the token contract.',
  },
  {
    kind: 'agent',
    node: 'research',
    who: 'research.node',
    role: 'agent · gemini',
    text: 'On it. I’ll surface the top citations and flag any that contradict the current direction.',
  },
];

export function initComposer(): void {
  /* ============================================================
     Live clock + simulated streaming text. These re-resolve their
     DOM targets every tick so they keep working as sessions swap.
     ============================================================ */
  setInterval(() => {
    const clock = document.getElementById('liveClock');
    if (!clock) return;
    const d = new Date();
    clock.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }, 1000);

  const STREAM_PHRASES = [
    'Patch ready. Splitting fan-in into runtime.NumCPU() workers, draining via context cancellation, and gating commits behind the new ack primitive.',
    'Verifying packet integrity across 14 partitions — loss currently 0.004 %, well under target.',
    'Drafting the migration brief now. Three sections: rationale, rollout windows, fallback paths.',
    'Design node is staging the updated operator console — preview will land in this thread momentarily.',
  ];
  let sPi = 0,
    sCi = 0,
    sMode = 'type',
    sHold = 0;
  setInterval(() => {
    const el = document.getElementById('streamText');
    if (!el) return;
    const target = STREAM_PHRASES[sPi];
    if (!target) return;
    if (sMode === 'type') {
      sCi++;
      if (sCi >= target.length) {
        sMode = 'hold';
        sHold = 0;
      }
    } else if (sMode === 'hold') {
      sHold++;
      if (sHold > 40) sMode = 'erase';
    } else {
      sCi = Math.max(0, sCi - 3);
      if (sCi === 0) {
        sPi = (sPi + 1) % STREAM_PHRASES.length;
        sMode = 'type';
      }
    }
    const text = target
      .slice(0, sCi)
      .replace(/runtime\.NumCPU\(\)/g, '<code>runtime.NumCPU()</code>');
    el.innerHTML = text + '<span class="caret">▍</span>';
  }, 55);

  if (form && input instanceof HTMLInputElement) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      input.value = '';

      appendTurn({
        kind: 'human',
        who: 'Wen',
        role: 'human',
        time: nowClock(),
        text: escapeHtml(value),
      });

      const reply = AGENT_REPLIES[Math.floor(Math.random() * AGENT_REPLIES.length)];
      if (!reply) return;
      const replyForSession = state.currentSessionId;
      setTimeout(() => {
        const queued: Turn = { ...reply, time: nowClock() };
        // Only deliver the reply if the user is still viewing that session.
        if (state.currentSessionId !== replyForSession) {
          // Still record it in the session's data so it appears when revisited.
          if (replyForSession) SESSIONS[replyForSession]?.turns.push(queued);
          return;
        }
        appendTurn(queued);
      }, 900);
    });

    // ⌘K / Ctrl+K to focus search.
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.sessions__search input')?.focus();
      }
    });
  }
}
