import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { usePrepCountdown } from '../hooks/usePrepCountdown';
import {
  PREP_TIMER_PRESET_MINUTES,
  PREP_TIMER_CLEAR_SECONDS,
  canHavePrepTimer,
  formatCountdown,
  hasPrepTimer,
} from '../utils/prepTimer';

/**
 * Countdown to the backend's scheduled auto-ready, plus the menu for changing
 * it. Rendered only on PREPARING orders — an order that has gone READY,
 * COMPLETED or CANCELLED shows nothing, however stale its timestamps are.
 *
 * Presented as a line of type rather than a filled button: the countdown is
 * information the kitchen reads at a glance, and only occasionally something it
 * acts on, so it should not compete with Mark Ready directly beneath it.
 *
 * Reaching 00:00 sends nothing. The backend sweeper performs the
 * PREPARING -> READY transition and the board picks it up over the existing
 * WebSocket/polling path.
 */
export default function PrepTimerControl({ order, isUpdating, onChange }) {
  const [menuRequested, setMenuRequested] = useState(false);
  const containerRef = useRef(null);

  const timerActive = hasPrepTimer(order);
  const remaining = usePrepCountdown(order?.status, order?.prepAutoReadyAt);

  // A pending write or a status change arriving underneath the open menu both
  // invalidate whatever it was about to do. Deriving "open" rather than closing
  // it from an effect means there is no frame in which a stale menu is offering
  // an action the order can no longer take.
  const editable = canHavePrepTimer(order?.status) && !isUpdating;
  const menuOpen = menuRequested && editable;

  const closeMenu = useCallback(() => setMenuRequested(false), []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeMenu();
      }
    };
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) closeMenu();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen, closeMenu]);

  if (!canHavePrepTimer(order?.status)) return null;

  const handleSelect = (durationSeconds) => {
    closeMenu();
    onChange?.(order.id, durationSeconds);
  };

  const expired = timerActive && remaining === 0;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        className="flex items-center justify-between w-full h-[32px] px-1 rounded-[8px] text-left transition-colors duration-150 hover:bg-card-veil disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setMenuRequested((open) => !open)}
        disabled={isUpdating}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={
          timerActive
            ? `Preparation timer, ready in ${formatCountdown(remaining)}. Change or remove.`
            : 'Set preparation timer'
        }
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-card-ink-3">
          {timerActive ? 'Ready in' : 'Ready timer'}
        </span>

        <span className="flex items-center gap-1.5">
          {isUpdating ? (
            <Loader2 size={15} className="animate-spin text-card-ink-3" />
          ) : timerActive ? (
            // The countdown runs all the way to 00:00 and stays there. Only the
            // colour changes at zero, because a due timer is waiting on the
            // backend rather than on the kitchen.
            <span
              className={`text-[22px] font-semibold leading-none tabular-nums tracking-[-0.03em] ${
                expired ? 'text-card-ink-3' : 'text-card-teal'
              }`}
            >
              {formatCountdown(remaining)}
            </span>
          ) : (
            <span className="text-[13px] font-medium text-card-ink-2">Set</span>
          )}
          <ChevronDown size={14} className="shrink-0 text-card-ink-3" />
        </span>
      </button>

      {/* Announced separately so the countdown itself never spams a screen
          reader once per second. */}
      <span className="sr-only" aria-live="polite">
        {expired ? 'Preparation timer finished, waiting for the kitchen system to mark it ready.' : ''}
      </span>

      {menuOpen && (
        // Opens upward: the card clips its overflow, and the footer sits at the
        // bottom edge.
        <div
          role="menu"
          aria-label="Preparation timer"
          className="absolute bottom-full left-0 right-0 mb-2 z-20 p-1.5 rounded-[14px] bg-card-bg border border-card-line shadow-card-menu"
        >
          {PREP_TIMER_PRESET_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              role="menuitem"
              className="flex items-center justify-between w-full h-[38px] px-3 rounded-[10px] text-[14px] font-medium text-card-ink hover:bg-card-veil transition-colors duration-150"
              onClick={() => handleSelect(minutes * 60)}
            >
              {minutes} min
              <span className="text-[13px] tabular-nums text-card-ink-3">
                {formatCountdown(minutes * 60)}
              </span>
            </button>
          ))}

          {timerActive && (
            <>
              <div className="my-1 mx-3 h-px bg-card-line" />
              <button
                type="button"
                role="menuitem"
                className="flex items-center w-full h-[38px] px-3 rounded-[10px] text-[14px] font-medium text-card-late hover:bg-card-veil transition-colors duration-150"
                onClick={() => handleSelect(PREP_TIMER_CLEAR_SECONDS)}
              >
                Remove timer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Read-only countdown for the customer-facing Dine-In card.
 *
 * Same persisted `prep_auto_ready_at` and same tick as the kitchen control —
 * only the presentation differs, and there is deliberately no way to change or
 * remove the timer from a customer-facing screen.
 */
export function PrepCountdownChip({ order }) {
  const remaining = usePrepCountdown(order?.status, order?.prepAutoReadyAt);

  if (!hasPrepTimer(order)) return null;

  const expired = remaining === 0;

  return (
    <span className="inline-flex items-baseline gap-1.5 shrink-0 whitespace-nowrap">
      <span className="w-px h-3 bg-card-line-2 self-center" aria-hidden="true" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-card-ink-3">
        Ready in
      </span>
      <span
        className={`text-[15px] font-semibold tabular-nums tracking-[-0.02em] ${
          expired ? 'text-card-ink-3' : 'text-card-teal'
        }`}
      >
        {formatCountdown(remaining)}
      </span>
    </span>
  );
}
