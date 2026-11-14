# lib/

Framework-agnostic shared logic lives here — plain TS functions with no React
imports, no hooks, no DOM assumptions beyond what's passed in.

Per T0-5's forward-compat note: when later tickets (T3-x/T4-x/T5-x) port
swipe-gesture and live-region logic from the vanilla site, the *behavior*
should land here as plain functions (e.g. `createSwipeTracker(el, opts)`,
`announceToLiveRegion(msg)`), not as hooks. A thin `useSwipe()` /
`useLiveRegion()` hook in `src/hooks/` can then wrap the plain function later
without anyone having to reimplement the logic itself.

This keeps the core logic testable without React and reusable if any part of
the vanilla site ever needs the same behavior.
