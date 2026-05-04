import React from 'react';

/**
 * ScoreAnnouncer — v0.11.20 GIB-015.
 *
 * Visually-hidden aria-live region for screen readers. Parent components
 * pass a `message` string; when it changes, AT users hear it announced
 * politely (non-interrupting).
 *
 * Why this exists instead of a dumber "announce every score poll"
 * implementation: naive aria-live on a scoreboard that polls every
 * 9–30s becomes screen-reader spam. The audit's GIB-015 recommendation
 * called out the risk; my original Sprint 1 pushback was the same.
 * This component stays dumb (just renders the region); the SIGNIFICANT-
 * EVENT FILTER is the parent's responsibility.
 *
 * Recommended events to announce:
 *   - Game status transition (pre → in = tip-off; in → post = final)
 *   - Lead change (team A trailed, now leads)
 *   - Overtime entry
 *   - Watchlist team scored
 *
 * Not recommended:
 *   - Every single point (too chatty for 30+ minute games)
 *   - Live clock ticks
 *   - Non-follow teams
 *
 * Usage:
 *   const [msg, setMsg] = useState('');
 *   <ScoreAnnouncer message={msg} />
 *   // Later, on a significant event:
 *   setMsg('Final. Lakers 115, Nuggets 108.');
 */
export default function ScoreAnnouncer({ message }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      // Key forces re-render per message so AT picks up every change,
      // even repeated strings (e.g. "Final" announced for two games
      // back-to-back).
      key={message}
    >
      {message || ''}
    </div>
  );
}
