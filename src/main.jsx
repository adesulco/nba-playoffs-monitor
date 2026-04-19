import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW, installInstallPromptCapture } from './lib/pwa.js';

// Capture the install-prompt event before React mounts so we don't miss it.
installInstallPromptCapture();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker after first paint so it doesn't compete with
// hydration bandwidth. Only runs in production (pwa.js guards dev mode).
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW, { once: true });
}
