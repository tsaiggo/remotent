import { createRoot } from 'react-dom/client';
import { App } from './react/App.js';
import { bindRailButtons } from './state/view.js';
import { acp } from './acp/index.js';

const reactRoot = document.getElementById('react-root');
if (reactRoot) createRoot(reactRoot).render(<App />);

bindRailButtons();

void acp.connect().catch((e: unknown) => {
  console.warn('[acp] connect failed (sidecar not running?)', e);
});
