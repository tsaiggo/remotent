import { useState } from 'react';
import { createPortal } from 'react-dom';
import { acp, useAcp } from '../acp/index.js';
import { ACP_SESSION_ID, acpToSession } from '../acp/adapter.js';
import { NODES } from '../data/nodes.js';
import { SESSIONS } from '../data/sessions.js';
import { NODE_PINS, state } from '../state/store.js';
import { switchView } from '../state/view.js';
import type { NodeStatusFilter, Turn } from '../types/index.js';
import { Canvas } from './Canvas.js';
import { NodeDetail, applyNodeAction, type NodeAction } from './NodeDetail.js';
import { NodesPanel, createBlankNode } from './NodesPanel.js';
import { Sessions } from './Sessions.js';

const INITIAL_SESSION_ID = 'orbital';
const INITIAL_NODE_ID = 'dev.node';

const sessionsEl = document.querySelector('.sessions');
const canvasEl = document.querySelector('.canvas:not(.canvas--node)');
const nodesPanelEl = document.querySelector('.nodes-panel');
const nodeCanvasEl = document.querySelector('.canvas--node');

state.currentSessionId = INITIAL_SESSION_ID;
state.currentNodeId = INITIAL_NODE_ID;

export function App() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(INITIAL_SESSION_ID);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(INITIAL_NODE_ID);
  const [nodeFilter, setNodeFilter] = useState<NodeStatusFilter>('all');
  const [nodeSearch, setNodeSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [nodesRevision, setNodesRevision] = useState(0);
  const [pinned, setPinned] = useState<ReadonlySet<string>>(() => new Set(NODE_PINS));
  const [newNodeCounter, setNewNodeCounter] = useState(0);
  const acpSnap = useAcp();
  const acpSession = acpToSession(acpSnap);

  const acpDelta = acpSnap.messages.reduce(
    (sum, m) => sum + m.chunks.reduce((c, k) => c + k.text.length, 0),
    0,
  );
  const effectiveRevision = revision + acpDelta;

  const selectSession = (id: string | null) => {
    state.currentSessionId = id;
    setCurrentSessionId(id);
  };

  const selectNode = (id: string | null) => {
    state.currentNodeId = id;
    setCurrentNodeId(id);
  };

  const isAcpSession = currentSessionId === ACP_SESSION_ID;

  const appendTurn = (turn: Turn) => {
    if (!currentSessionId) return;
    if (isAcpSession) return;
    const s = SESSIONS[currentSessionId];
    if (!s) return;
    s.turns.push(turn);
    setRevision((n) => n + 1);
  };

  const submitAcpPrompt = (text: string) => {
    void acp.sendPrompt(text);
  };

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        NODE_PINS.delete(id);
      } else {
        next.add(id);
        NODE_PINS.add(id);
      }
      return next;
    });
  };

  const handleNewNode = () => {
    const nextCount = newNodeCounter + 1;
    setNewNodeCounter(nextCount);
    const { id, node } = createBlankNode(nextCount);
    NODES[id] = node;
    selectNode(id);
    setNodesRevision((n) => n + 1);
  };

  const handleAction = (act: NodeAction) => {
    if (!currentNodeId) return;
    const mutablePinned = new Set(pinned);
    const next = applyNodeAction(currentNodeId, act, mutablePinned);
    if (mutablePinned.size !== pinned.size) {
      setPinned(mutablePinned);
      NODE_PINS.clear();
      mutablePinned.forEach((p) => NODE_PINS.add(p));
    }
    selectNode(next);
    setNodesRevision((n) => n + 1);
  };

  const handleJumpSession = (sid: string) => {
    switchView('hub');
    selectSession(sid);
  };

  const handleJumpNode = (nid: string) => {
    if (NODES[nid]) selectNode(nid);
  };

  return (
    <>
      {sessionsEl &&
        createPortal(
          <Sessions
            currentSessionId={currentSessionId}
            onSelectSession={selectSession}
            acpStatus={acpSnap.status}
            acpAgent={acpSnap.agent}
            acpSessions={acpSnap.sessions}
            acpSessionsLoading={acpSnap.sessionsLoading}
            liveSessionId={acpSnap.sessionId}
          />,
          sessionsEl,
        )}
      {canvasEl &&
        createPortal(
          <Canvas
            currentSessionId={currentSessionId}
            revision={effectiveRevision}
            appendTurn={appendTurn}
            isAcpSession={isAcpSession}
            onAcpPrompt={submitAcpPrompt}
            sessionOverride={isAcpSession ? acpSession : null}
          />,
          canvasEl,
        )}
      {nodesPanelEl &&
        createPortal(
          <NodesPanel
            currentNodeId={currentNodeId}
            filter={nodeFilter}
            search={nodeSearch}
            pinned={pinned}
            revision={nodesRevision}
            onSelectNode={selectNode}
            onChangeFilter={setNodeFilter}
            onChangeSearch={setNodeSearch}
            onTogglePin={togglePin}
            onNewNode={handleNewNode}
          />,
          nodesPanelEl,
        )}
      {nodeCanvasEl &&
        createPortal(
          <NodeDetail
            nodeId={currentNodeId}
            pinned={pinned}
            revision={nodesRevision}
            onJumpSession={handleJumpSession}
            onJumpNode={handleJumpNode}
            onAction={handleAction}
          />,
          nodeCanvasEl,
        )}
    </>
  );
}
