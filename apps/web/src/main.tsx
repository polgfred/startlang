import './layout.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app.jsx';
import { EditorProvider } from './editor-context.jsx';

function revealApp() {
  document.documentElement.classList.remove('fonts-loading');
}

document.fonts.ready.finally(revealApp);
setTimeout(revealApp, 3000);

const container = document.getElementById('root');

if (!container) {
  throw new Error('could not find root element');
}

createRoot(container).render(
  <StrictMode>
    <EditorProvider>
      <App />
    </EditorProvider>
  </StrictMode>
);
