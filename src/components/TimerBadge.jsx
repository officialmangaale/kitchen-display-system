import { getElapsedMinutes, getSlaSeverity } from '../utils/orderUtils';

// Elapsed time earns colour only once it starts to matter. A ticket inside its
// SLA reads as quiet grey; the ramp to red is the card's way of raising its
// hand, so it stays meaningful instead of decorating every ticket.
const SEVERITY_TEXT = {
  safe: 'text-card-ink-3',
  warning: 'text-card-ink-2',
  urgent: 'text-card-cooking',
  breached: 'text-card-late',
};

const SEVERITY_BAR = {
  safe: 'bg-card-line-2',
  warning: 'bg-card-ink-3',
  urgent: 'bg-card-cooking',
  breached: 'bg-card-late',
};

/** Elapsed minutes since the ticket was placed, e.g. "12m" or "1h 05m". */
function formatElapsed(elapsed) {
  if (elapsed > 999) return '999m+';
  if (elapsed >= 60) {
    const hours = Math.floor(elapsed / 60);
    const mins = elapsed % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${elapsed}m`;
}

export default function TimerBadge({ placedAt, slaMinutes, stoppedAt }) {
  const elapsed = getElapsedMinutes(placedAt, stoppedAt);
  const severity = getSlaSeverity(placedAt, slaMinutes, stoppedAt);

  return (
    <span
      className={`shrink-0 text-[15px] font-medium leading-none tabular-nums whitespace-nowrap ${
        SEVERITY_TEXT[severity] || SEVERITY_TEXT.safe
      }`}
      title={`${elapsed} minutes since the order was placed`}
    >
      {formatElapsed(elapsed)}
    </span>
  );
}

/**
 * Hairline SLA progress along the card's full width. Deliberately 2px and
 * untinted until the ticket is under pressure — at rest it reads as a divider.
 */
export function TimerProgressBar({ placedAt, slaMinutes, stoppedAt }) {
  const elapsed = getElapsedMinutes(placedAt, stoppedAt);
  const severity = getSlaSeverity(placedAt, slaMinutes, stoppedAt);
  const sla = slaMinutes || 15;
  const progressPct = Math.min((elapsed / sla) * 100, 100);

  return (
    <div className="w-full h-[2px] bg-card-line shrink-0" aria-hidden="true">
      <div
        className={`h-full transition-all duration-1000 ease-linear ${
          SEVERITY_BAR[severity] || SEVERITY_BAR.safe
        }`}
        style={{ width: `${progressPct}%` }}
      />
    </div>
  );
}
