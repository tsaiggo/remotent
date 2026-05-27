import type { Store } from '../types/index.js';

export const state: Store = {
  currentSessionId: null,
  currentNodeId: null,
  currentNodeFilter: 'all',
  currentNodeSearch: '',
  newCounter: 0,
};

export const NODE_PINS = new Set<string>(['dev.node']);
