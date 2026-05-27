import { NODES } from '../data/nodes.js';
import type { View } from '../types/index.js';
import { renderNodeDetail } from '../views/nodes-detail.js';
import { refreshFleetMeta, renderNodeList } from '../views/nodes-list.js';
import { state } from './store.js';

export function switchView(view: View): void {
  const shell = document.querySelector<HTMLElement>('.shell');
  if (!shell) return;
  shell.dataset['view'] = view;
  document.querySelectorAll<HTMLElement>('.rail__btn[data-view-target]').forEach((b) => {
    const on = b.dataset['viewTarget'] === view;
    b.classList.toggle('is-active', on);
  });
  const hubSessions = document.querySelector<HTMLElement>('.sessions');
  const hubCanvas = document.querySelector<HTMLElement>('.canvas:not(.canvas--node)');
  const nodePanel = document.querySelector<HTMLElement>('.nodes-panel');
  const nodeCanvas = document.querySelector<HTMLElement>('.canvas--node');
  if (hubSessions) hubSessions.hidden = view !== 'hub';
  if (hubCanvas) hubCanvas.hidden = view !== 'hub';
  if (nodePanel) nodePanel.hidden = view !== 'nodes';
  if (nodeCanvas) nodeCanvas.hidden = view !== 'nodes';

  if (view === 'nodes') {
    refreshFleetMeta();
    renderNodeList();
    if (!state.currentNodeId) {
      const first = Object.keys(NODES)[0];
      if (first) state.currentNodeId = first;
    }
    if (state.currentNodeId) renderNodeDetail(state.currentNodeId);
  }
}
