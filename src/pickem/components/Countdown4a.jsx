/**
 * Countdown4a — the one place that ticks (doc 17 S2: "1 Hz tick moved into
 * a Countdown leaf"). Renders LockBadge for a lock time and re-renders
 * itself once a second; the parent screen never holds a `now` state for it.
 */
import { useEffect, useState } from 'react';
import { LockBadge } from './primitives4a.jsx';

export default function Countdown4a({ lockAt, locked = false, lang = 'en', style }) {
  const lockMs = lockAt ? new Date(lockAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (locked || lockMs == null || lockMs <= Date.now()) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked, lockMs]);
  if (lockMs == null) return null;
  const secondsLeft = Math.max(0, Math.floor((lockMs - now) / 1000));
  return <LockBadge secondsLeft={secondsLeft} locked={locked || secondsLeft <= 0} lang={lang} style={style} />;
}
