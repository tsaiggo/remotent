import { NODES } from '../data/nodes.js';
import { state } from '../state/store.js';
import { switchView } from '../state/view.js';
import { els, renderNodes } from './session.js';

export function initChipJumps() {
  /* Canvas node chips → jump to node overview detail. We re-run after
     every renderNodes() call by wrapping it. */
  const _origRenderNodes = renderNodes;
  function renderNodesWithLinks(nodes) {
    _origRenderNodes(nodes);
    if (!els.nodes) return;
    els.nodes.querySelectorAll('.node').forEach((chip, i) => {
      const meta = nodes[i];
      if (!meta) return;
      const id = `${meta.name}.node`;
      if (!NODES[id]) return;
      chip.dataset.nodeLink = id;
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', () => {
        state.currentNodeId = id;
        switchView('nodes');
      });
    });
  }
  // Monkey-patch the renderer used by renderSession.
  // (renderSession is a closure over `renderNodes`; instead of touching it,
  // hook into the live DOM by re-binding chips whenever the chips change.)
  const nodesObserver = els.nodes
    ? new MutationObserver(() => {
        els.nodes.querySelectorAll('.node').forEach((chip) => {
          if (chip.classList.contains('canvas__divider') || chip.classList.contains('canvas__icon'))
            return;
          // Derive node kind from class to construct the registry key.
          const kindMatch = Array.from(chip.classList).find((c) => c.startsWith('node--'));
          if (!kindMatch) return;
          const text = (chip.textContent || '').trim();
          if (!text) return;
          const id = `${text}.node`;
          if (!NODES[id] || chip.dataset.nodeLink === id) return;
          chip.dataset.nodeLink = id;
          chip.addEventListener('click', () => {
            state.currentNodeId = id;
            switchView('nodes');
          });
        });
      })
    : null;
  if (nodesObserver && els.nodes) {
    nodesObserver.observe(els.nodes, { childList: true });
    // Initial pass for the markup already in the DOM.
    nodesObserver.takeRecords();
    els.nodes.querySelectorAll('.node').forEach((chip) => {
      const kindMatch = Array.from(chip.classList).find((c) => c.startsWith('node--'));
      if (!kindMatch) return;
      const text = (chip.textContent || '').trim();
      const id = `${text}.node`;
      if (!NODES[id]) return;
      chip.dataset.nodeLink = id;
      chip.addEventListener('click', () => {
        state.currentNodeId = id;
        switchView('nodes');
      });
    });
  }
  // Silence unused-var warning for the helper kept for documentation.
  void renderNodesWithLinks;
}
