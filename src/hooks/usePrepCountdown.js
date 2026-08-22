import { useState, useEffect } from 'react';
import { getPrepRemainingSeconds } from '../utils/prepTimer';

/**
 * Ticking countdown derived from an order's persisted `prep_auto_ready_at`.
 *
 * The interval never calls the backend, and never holds the remaining time
 * itself: it only nudges a render, and the value is recomputed from the
 * timestamp each time. A throttled background tab, a dropped tick or a device
 * clock nudge therefore self-corrects on the next tick instead of drifting away
 * from what the Restaurant App shows.
 *
 * The interval runs only while a countdown is live and stops at zero: expiry is
 * the backend's to act on, and the board waits for the WebSocket frame — or the
 * existing polling reconciliation — to move the order to READY.
 *
 * @returns {number|null} seconds remaining, or null when no timer applies.
 */
export function usePrepCountdown(status, prepAutoReadyAt) {
  const [, setTick] = useState(0);

  const remaining = getPrepRemainingSeconds({ status, prepAutoReadyAt });
  const running = remaining !== null && remaining > 0;

  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  return remaining;
}
