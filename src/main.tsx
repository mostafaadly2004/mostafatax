import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe global error & unhandled rejection handlers
// Prevents development-only Vite HMR WebSocket closures from causing unhandled exceptions
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Check if the rejection is from benign development WebSocket / HMR closures
    const reason = event.reason;
    const isViteHmrError = 
      reason?.message?.includes('WebSocket') ||
      reason?.message?.includes('vite') ||
      reason?.target instanceof WebSocket ||
      (typeof reason === 'string' && (reason.includes('WebSocket') || reason.includes('vite')));

    if (isViteHmrError) {
      // Suppress unhandled promise rejection for dev-only HMR WebSocket closures
      event.preventDefault();
      return;
    }
  });

  window.addEventListener('error', (event) => {
    // Suppress benign WebSocket error events from development HMR
    if (event.target instanceof WebSocket || (event.message && event.message.includes('WebSocket'))) {
      event.preventDefault();
      return;
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

