import { createRoot } from 'react-dom/client';
import { App } from './react/App.js';
import { bindRailButtons } from './state/view.js';

const reactRoot = document.getElementById('react-root');
if (reactRoot) createRoot(reactRoot).render(<App />);

bindRailButtons();
