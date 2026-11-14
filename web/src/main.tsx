import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { hidePageLoader, armPageLoaderSafetyTimeout } from './lib/pageLoader'
import { initOfflineReadingOnBoot } from './lib/serviceWorker'

// T3-2a: page-loader.js's 5s safety-timeout, ported as-is — armed before
// the first render so it's counting down even if something goes wrong
// before React ever gets to mount (see lib/pageLoader.ts).
armPageLoaderSafetyTimeout()

// P5-1 (Offline Mode), now opt-in: Offline Reading defaults OFF for
// every new visitor (see lib/serviceWorker.ts's own header for the
// full redesign rationale — no service worker at all until a student
// explicitly turns this on in Settings). This call only re-registers
// if a PREVIOUS visit already turned it on, so the setting survives a
// reload without ever silently opting a first-time visitor in.
initOfflineReadingOnBoot()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Matches vite.config.ts's `base: '/ResourcesV2/'` — GitHub Pages
        project sites live at /ResourcesV2/, not at root, so React Router
        needs to know to strip that prefix before matching route paths. */}
    <BrowserRouter basename="/ResourcesV2">
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// page-loader.js hid #pageLoader on window's `load` event — the closest
// React equivalent is "the initial render has committed", i.e. right
// after createRoot().render() returns (render() itself is synchronous).
hidePageLoader()
