import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { setLanguage } from '@anima/shared';

// Default language — detect from browser or user preference
const browserLang = navigator.language.split('-')[0];
if (browserLang === 'es' || browserLang === 'fr') {
  setLanguage(browserLang as 'es' | 'fr');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
