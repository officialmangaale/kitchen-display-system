import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Timer, TimerOff, TimerReset } from 'lucide-react';
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
 * The countdown is presentation only. Reaching 00:00 sends nothing: the backend
 * sweeper performs the PREPARING -> READY transition and the board picks it up
 * over the existing WebSocket/polling path.
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

  let triggerClass =
    'flex items-center justify-center gap-2 w-full h-[36px] rounded-[10px] border text-[14px] font-semibold transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed ';
  if (!timerActive) {
    triggerClass +=
      'bg-transparent border-dashed border-kds-border-2 text-kds-text-2 hover:bg-kds-surface-2 hover:text-kds-text';
  } else if (expired) {
    triggerClass += 'bg-kds-surface-3 border-kds-border text-kds-text-2';
  } else {
    triggerClass += 'bg-kds-cooking-bg border-amber-200 text-amber-700 hover:bg-amber-100';
  }

  // The countdown runs all the way down to 00:00 and stays there. Only the
  // tint changes at zero, because a due timer is waiting on the backend rather
  // than on the kitchen and should stop competing with live tickets.
  const label = timerActive
    ? `Ready in ${formatCountdown(remaining)}`
    : 'Set ready timer';

  const TriggerIcon = !timerActive ? TimerReset : Timer;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        className={triggerClass}
        onClick={() => setMenuRequested((open) => !open)}
        disabled={isUpdating}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={
          timerActive
            ? `Preparation timer, ${label}. Change or remove.`
            : 'Set preparation timer'
        }
      >
        {isUpdating ? (
          <Loader2 size={16} className="animate-spin shrink-0" />
        ) : (
          <TriggerIcon size={16} className="shrink-0" />
        )}
        <span className={timerActive ? 'tabular-nums' : ''}>{label}</span>
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
          className="absolute bottom-full left-0 right-0 mb-2 z-20 p-1.5 rounded-xl bg-kds-surface border border-kds-border shadow-[0_10px_30px_rgba(15,23,42,0.16)]"
        >
          {PREP_TIMER_PRESET_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              role="menuitem"
              className="flex items-center gap-2 w-full h-[36px] px-3 rounded-lg text-[14px] font-medium text-kds-text hover:bg-kds-surface-2 transition-colors duration-150"
              onClick={() => handleSelect(minutes * 60)}
            >
              <Timer size={15} className="shrink-0 text-kds-text-3" />
              {minutes} min
            </button>
          ))}

          {timerActive && (
            <>
              <div className="my-1 h-px bg-kds-border" />
              <button
                type="button"
                role="menuitem"
                className="flex items-center gap-2 w-full h-[36px] px-3 rounded-lg text-[14px] font-medium text-kds-late hover:bg-kds-late-bg transition-colors duration-150"
                onClick={() => handleSelect(PREP_TIMER_CLEAR_SECONDS)}
              >
                <TimerOff size={15} className="shrink-0" />
                Remove Timer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
