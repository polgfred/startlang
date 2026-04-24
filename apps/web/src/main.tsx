import './layout.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';

const container = document.getElementById('root');

if (!container) {
  throw new Error('could not find root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
