import { createRoot } from 'react-dom/client';
import { state } from './state/store.js';
import { initNodesList, refreshFleetMeta } from './views/nodes-list.js';
import { App } from './react/App.js';

state.currentSessionId = 'orbital';

const reactRoot = document.getElementById('react-root');
if (reactRoot) createRoot(reactRoot).render(<App />);

initNodesList();
refreshFleetMeta();
