import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initTheme } from './lib/theme';
import { ThemeColorProvider } from './components/ThemeColorProvider';

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeColorProvider>
      <App />
    </ThemeColorProvider>
  </StrictMode>,
);
