import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';

// Initialize React when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('react-root');
  const root = createRoot(container);
  root.render(<App />);
});