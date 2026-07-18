import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import '@fontsource-variable/geist';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/base.css';

import App from './app/App.jsx';
import { initWebVitals } from './lib/webVitals.js';

// Real-user CWV → GA4. No-op without VITE_GA_MEASUREMENT_ID; the web-vitals
// library itself is dynamically imported at idle, so this costs nothing on load.
initWebVitals();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
