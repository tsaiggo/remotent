import { NODES } from '../data/nodes.js';
import { renderNodeDetail } from '../views/nodes-detail.js';
import { refreshFleetMeta, renderNodeList } from '../views/nodes-list.js';
import { state } from './store.js';

export function switchView(view) {
  const shell = document.querySelector('.shell');
  if (!shell) return;
  shell.dataset.view = view;
  document.querySelectorAll('.rail__btn[data-view-target]').forEach((b) => {
    const on = b.dataset.viewTarget === view;
    b.classList.toggle('is-active', on);
  });
  const hubSessions = document.querySelector('.sessions');
  const hubCanvas = document.querySelector('.canvas:not(.canvas--node)');
  const nodePanel = document.querySelector('.nodes-panel');
  const nodeCanvas = document.querySelector('.canvas--node');
  if (hubSessions) hubSessions.hidden = view !== 'hub';
  if (hubCanvas) hubCanvas.hidden = view !== 'hub';
  if (nodePanel) nodePanel.hidden = view !== 'nodes';
  if (nodeCanvas) nodeCanvas.hidden = view !== 'nodes';

  if (view === 'nodes') {
    refreshFleetMeta();
    renderNodeList();
    if (!state.currentNodeId) state.currentNodeId = Object.keys(NODES)[0];
    if (state.currentNodeId) renderNodeDetail(state.currentNodeId);
  }
}
