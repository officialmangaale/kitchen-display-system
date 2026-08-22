/**
 * Preparation ("auto-ready") timer helpers.
 *
 * The backend owns this timer. `prep_auto_ready_at` (migration 042) is the one
 * persisted value, and a server-side sweeper — never this screen — flips
 * PREPARING -> READY once it elapses. Everything below is pure arithmetic
 * against that timestamp, so the countdown ticks locally and the KDS only
 * talks to the backend when the timer is actually set, changed or removed.
 */

/** Durations offered when staff open the timer menu. */
export const PREP_TIMER_PRESET_MINUTES = [5, 10, 15];

/** Sent as the duration to cancel a scheduled auto-ready. */
export const PREP_TIMER_CLEAR_SECONDS = 0;

// Aliases cover both the snake_case the services emit and the camelCase a
// normalized order carries, so the same reader works on a REST payload, a
// WebSocket frame and an already-normalized order.
const PREP_TIMER_FIELDS = [
  { key: 'prepTimerStart', aliases: ['prep_timer_start', 'prepTimerStart'], numeric: false },
  { key: 'prepDurationSeconds', aliases: ['prep_duration_seconds', 'prepDurationSeconds'], numeric: true },
  { key: 'prepAutoReadyAt', aliases: ['prep_auto_ready_at', 'prepAutoReadyAt'], numeric: false },
];

/** Milliseconds for an ISO timestamp, or null when absent/unparseable. */
export function parsePrepTimestamp(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Only a PREPARING order may show a countdown. This is what keeps a timer off
 * an order that has already gone READY, COMPLETED or CANCELLED, no matter what
 * timestamp is still sitting on the record.
 */
export function canHavePrepTimer(status) {
  return status === 'PREPARING';
}

export function hasPrepTimer(order) {
  return (
    canHavePrepTimer(order?.status) &&
    parsePrepTimestamp(order?.prepAutoReadyAt) !== null
  );
}

/**
 * Seconds until auto-ready, clamped at zero. Returns null when no countdown
 * applies, which callers use to fall back to a plain PREPARING presentation.
 */
export function getPrepRemainingSeconds(order, now = Date.now()) {
  if (!canHavePrepTimer(order?.status)) return null;
  const target = parsePrepTimestamp(order?.prepAutoReadyAt);
  if (target === null) return null;
  return Math.max(0, Math.round((target - now) / 1000));
}

/**
 * MM:SS, widening to H:MM:SS past an hour so a long timer stays unambiguous.
 */
export function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

// A timer response may arrive bare or wrapped in the shared `{ data: ... }`
// envelope the order endpoints use.
function pickTimerSource(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [payload, payload.data, payload.order];
  return (
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === 'object' &&
        PREP_TIMER_FIELDS.some(({ aliases }) =>
          aliases.some((alias) => Object.prototype.hasOwnProperty.call(candidate, alias)),
        ),
    ) || null
  );
}

/**
 * Extract the persisted timer fields from any order-shaped payload.
 *
 * Presence is tested by key, not truthiness, because clearing a timer returns
 * explicit nulls that must overwrite the previous values. Returns null when the
 * payload carries no timer information at all — the caller then reconciles
 * through the normal refresh rather than guessing.
 */
export function readPrepTimerFields(payload) {
  const source = pickTimerSource(payload);
  if (!source) return null;

  const fields = {};
  PREP_TIMER_FIELDS.forEach(({ key, aliases, numeric }) => {
    const alias = aliases.find((name) =>
      Object.prototype.hasOwnProperty.call(source, name),
    );
    if (alias === undefined) return;
    const raw = source[alias];
    if (raw === null || raw === undefined || raw === '') {
      fields[key] = null;
      return;
    }
    if (numeric) {
      const value = Number(raw);
      fields[key] = Number.isFinite(value) ? value : null;
      return;
    }
    fields[key] = String(raw);
  });

  return fields;
}
