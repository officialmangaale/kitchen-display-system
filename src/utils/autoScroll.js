/**
 * Geometry and timing for the board's smart auto-scroll.
 *
 * Everything here is pure and DOM-free so the awkward parts — where a row
 * boundary actually is, when a step is worth taking, how long it should last —
 * can be reasoned about and tested without a browser. The hook that owns the
 * timers and the scroll container lives in `hooks/useSmartAutoScroll.js`.
 *
 * The board is a wall display: readability beats movement. Every constant here
 * is chosen so a cook can finish reading a card before it moves.
 */

/** Stationary time at each row before the next step. */
export const AUTO_SCROLL_DWELL_MS = 5_000;
/** The last row is held slightly longer — it is the end of the queue. */
export const AUTO_SCROLL_BOTTOM_DWELL_MS = 5_500;
/** Settling time after the return to the top, before the cycle restarts. */
export const AUTO_SCROLL_TOP_DWELL_MS = 5_000;
/** Quiet period after any manual interaction before the cycle resumes. */
export const AUTO_SCROLL_RESUME_DELAY_MS = 10_000;
/** A newly arrived ticket holds the board still long enough to be noticed. */
export const AUTO_SCROLL_NEW_ORDER_HOLD_MS = 5_000;
/** A pointer that moved this recently counts as a hand still working a card. */
export const AUTO_SCROLL_HOVER_ACTIVE_MS = 6_000;
/** How often a hold (hover, open menu) is re-checked. */
export const AUTO_SCROLL_HOLD_RECHECK_MS = 750;

export const STEP_DURATION_MIN_MS = 600;
export const STEP_DURATION_MAX_MS = 1_000;
export const RETURN_DURATION_MIN_MS = 900;
export const RETURN_DURATION_MAX_MS = 1_600;

/** Sub-pixel and rounding overflow is not overflow. */
export const OVERFLOW_EPSILON_PX = 8;
/** Two stops closer than this are the same stop. */
export const STOP_MIN_GAP_PX = 32;
/** Tolerance for "already at this stop". */
export const SETTLED_EPSILON_PX = 4;
/** A scroll smaller than this is not a human. */
export const MANUAL_SCROLL_EPSILON_PX = 2;

/** Pixels per millisecond used to scale a step's duration to its distance. */
const STEP_SPEED_PX_PER_MS = 0.9;
/** The return travels further, so it is allowed to move faster. */
const RETURN_SPEED_PX_PER_MS = 2.2;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Is there enough hidden content below the fold to be worth scrolling to?
 */
export function hasBoardOverflow(scrollHeight, clientHeight) {
  return Number(scrollHeight) - Number(clientHeight) > OVERFLOW_EPSILON_PX;
}

/**
 * Turn the measured tops of each card row into the scroll offsets the board is
 * allowed to come to rest at.
 *
 * A stop is a row boundary, never an arbitrary pixel: resting anywhere else
 * would leave a card sliced in half across the top of the viewport with its
 * action buttons cut off. `paddingTop` is subtracted so a row lands with the
 * same inset the first row has at rest rather than flush against the filters.
 *
 * The list always starts at 0 and always ends at `maxScroll`, so the cycle can
 * reach both the first and the last card however the rows divide up.
 *
 * @param {{rowTops?: number[], paddingTop?: number, maxScroll?: number}} input
 * @returns {number[]} ascending, de-duplicated scroll offsets
 */
export function computeRowStops({ rowTops = [], paddingTop = 0, maxScroll = 0 }) {
  const bottom = Math.round(Math.max(0, Number(maxScroll) || 0));
  if (bottom <= 0) return [0];

  const stops = [0];
  for (const rowTop of rowTops) {
    if (!Number.isFinite(rowTop)) continue;
    const target = Math.round(clamp(rowTop - paddingTop, 0, bottom));
    if (target - stops[stops.length - 1] >= STOP_MIN_GAP_PX) stops.push(target);
  }

  const last = stops[stops.length - 1];
  if (bottom - last >= STOP_MIN_GAP_PX) {
    stops.push(bottom);
  } else if (stops.length > 1) {
    // The final row boundary is within a hair of the true bottom: prefer the
    // bottom itself so the last card is never left partly below the fold.
    stops[stops.length - 1] = bottom;
  } else {
    stops.push(bottom);
  }

  return stops;
}

/**
 * The next resting place below the current position, or null at the bottom.
 */
export function nextStopFrom(scrollTop, stops) {
  if (!Array.isArray(stops)) return null;
  for (const stop of stops) {
    if (stop > scrollTop + SETTLED_EPSILON_PX) return stop;
  }
  return null;
}

/**
 * Is this stop the end of the queue?
 */
export function isBottomStop(stop, maxScroll) {
  return stop >= maxScroll - SETTLED_EPSILON_PX;
}

/**
 * Duration for one downward step: scaled to the distance so a short hop does
 * not crawl, then clamped so no step is ever a jump or a drift.
 */
export function stepDurationMs(distance) {
  const travel = Math.abs(Number(distance) || 0);
  return Math.round(
    clamp(travel / STEP_SPEED_PX_PER_MS, STEP_DURATION_MIN_MS, STEP_DURATION_MAX_MS),
  );
}

/**
 * Duration for the run back to the top. Longer than a step because it covers
 * the whole board, and deliberately never instant.
 */
export function returnDurationMs(distance) {
  const travel = Math.abs(Number(distance) || 0);
  return Math.round(
    clamp(travel / RETURN_SPEED_PX_PER_MS, RETURN_DURATION_MIN_MS, RETURN_DURATION_MAX_MS),
  );
}

/** Symmetric ease: no visible start, no visible stop. */
export function easeInOutCubic(t) {
  const progress = clamp(Number(t) || 0, 0, 1);
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

/**
 * Did this board update bring in a ticket that was not there before?
 *
 * Removals do not count: an order leaving the board only shortens the queue,
 * and the cycle simply re-measures. An arrival is what deserves a still board.
 */
export function hasNewOrders(previousIds, nextIds) {
  const previous = new Set(previousIds || []);
  return (nextIds || []).some((id) => !previous.has(id));
}
