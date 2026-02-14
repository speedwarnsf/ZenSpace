import React from 'react';
import ReactDOM from 'react-dom/client';
import './app.css';
import App from './App';
import { NotFound } from './components/NotFound';
import { ThemeProvider } from './components/ThemeContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Valid client-side paths (SPA with no router — only root is valid)
const VALID_PATHS = ['/', '/index.html', ''];
const path = window.location.pathname;
const isValidPath = VALID_PATHS.includes(path) || path.startsWith('/api/');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      {isValidPath ? <App /> : <NotFound />}
    </ThemeProvider>
  </React.StrictMode>
);
