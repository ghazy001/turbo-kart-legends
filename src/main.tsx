import { lazy, Suspense, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/game.css';

const Preview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('asset-preview')
  ? lazy(() => import('./game/dev/AssetPreview').then(module => ({ default: module.AssetPreview })))
  : null;

createRoot(document.getElementById('root')!).render(<StrictMode>{Preview
  ? <Suspense fallback={<p>Loading asset workshop…</p>}><Preview /></Suspense>
  : <App />}</StrictMode>);
