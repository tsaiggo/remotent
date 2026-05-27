import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SESSIONS } from '../data/sessions.js';
import { state } from '../state/store.js';
import type { Turn } from '../types/index.js';
import { Canvas } from './Canvas.js';
import { Sessions } from './Sessions.js';

const INITIAL_SESSION_ID = 'orbital';
const sessionsEl = document.querySelector('.sessions');
const canvasEl = document.querySelector('.canvas:not(.canvas--node)');
state.currentSessionId = INITIAL_SESSION_ID;

export function App() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(INITIAL_SESSION_ID);
  const [revision, setRevision] = useState(0);

  const selectSession = (id: string | null) => {
    state.currentSessionId = id;
    setCurrentSessionId(id);
  };

  const appendTurn = (turn: Turn) => {
    if (!currentSessionId) return;
    const s = SESSIONS[currentSessionId];
    if (!s) return;
    s.turns.push(turn);
    setRevision((n) => n + 1);
  };

  return (
    <>
      {sessionsEl &&
        createPortal(
          <Sessions currentSessionId={currentSessionId} onSelectSession={selectSession} />,
          sessionsEl,
        )}
      {canvasEl &&
        createPortal(
          <Canvas
            currentSessionId={currentSessionId}
            revision={revision}
            appendTurn={appendTurn}
          />,
          canvasEl,
        )}
    </>
  );
}
