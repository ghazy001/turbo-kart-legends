import { lazy, Suspense, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
const App = lazy(() => import('./app/App').then(module => ({ default: module.App })));
const Phone = lazy(() => import('./phone/PhoneController').then(module => ({ default: module.PhoneController })));
const phoneRoute = window.location.pathname === '/controller';
import './styles/game.css';

const inspection = import.meta.env.DEV && new URLSearchParams(window.location.search).has('asset-inspect');
const Preview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('results-preview')
  ? lazy(() => import('./game/dev/ResultsPreview').then(module => ({ default: module.ResultsPreview })))
  : inspection
  ? lazy(() => import('./game/dev/AssetInspection').then(module => ({ default: module.AssetInspection })))
  : import.meta.env.DEV && new URLSearchParams(window.location.search).has('asset-preview')
  ? lazy(() => import('./game/dev/AssetPreview').then(module => ({ default: module.AssetPreview })))
  : null;

createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={<p>Loading Turbo Kart Legends…</p>}>{phoneRoute ? <Phone /> : Preview
  ? <Suspense fallback={<p>Loading development preview…</p>}><Preview /></Suspense>
  : <App />}</Suspense></StrictMode>);
