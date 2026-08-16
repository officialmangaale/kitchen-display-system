import { getElapsedMinutes, getSlaSeverity } from '../utils/orderUtils';

function getTimerLevel(minutes) {
  if (minutes >= 15) return 'fire';
  if (minutes >= 10) return 'hot';
  if (minutes >= 5)  return 'warm';
  return 'fresh';
}

function getStatusLabel(status, isLate) {
  if (isLate) return 'LATE';
  switch (status) {
    case 'CONFIRMED': return 'NEW';
    case 'PREPARING': return 'COOKING';
    case 'READY':     return 'READY';
    default:          return '';
  }
}

export default function TimerBadge({ placedAt, slaMinutes, stoppedAt, status }) {
  const elapsed = getElapsedMinutes(placedAt, stoppedAt);
  const severity = getSlaSeverity(placedAt, slaMinutes, stoppedAt);
  const isLate = severity === 'breached';
  const timerLevel = getTimerLevel(elapsed);
  const statusLabel = getStatusLabel(status, isLate);

  let displayNum, displayUnit;
  if (elapsed > 999) {
    displayNum = '999+';
    displayUnit = 'm';
  } else if (elapsed >= 60) {
    const hours = Math.floor(elapsed / 60);
    const mins = elapsed % 60;
    displayNum = `${hours}h${mins}`;
    displayUnit = 'm';
  } else {
    displayNum = String(elapsed);
    displayUnit = 'm';
  }

  // Timer level styles
  let colorClass = '';
  if (timerLevel === 'fresh') colorClass = 'text-kds-timer-fresh';
  else if (timerLevel === 'warm') colorClass = 'text-kds-timer-warm';
  else if (timerLevel === 'hot') colorClass = 'text-kds-timer-hot';
  else if (timerLevel === 'fire') colorClass = 'text-kds-timer-fire';

  // Status badge tint — soft tinted chip, never a flooded block
  let badgeClass = 'bg-kds-surface-3 text-kds-text-2 border-kds-border';
  if (isLate) badgeClass = 'bg-kds-late-bg text-red-700 border-red-200';
  else if (status === 'CONFIRMED') badgeClass = 'bg-kds-new-bg text-kds-new border-blue-200';
  else if (status === 'PREPARING') badgeClass = 'bg-kds-cooking-bg text-amber-700 border-amber-200';
  else if (status === 'READY') badgeClass = 'bg-kds-ready-bg text-green-700 border-green-200';

  return (
    <div className={`flex flex-col items-end justify-center gap-1.5 ${isLate ? 'px-2.5 py-1.5 -mr-1 rounded-xl bg-kds-late-bg' : ''}`}>
      <span className={`text-[25px] font-bold leading-none tracking-[-0.03em] tabular-nums flex items-baseline ${colorClass}`}>
        {displayNum}
        <span className="text-[14px] font-semibold ml-0.5">{displayUnit}</span>
      </span>
      {statusLabel && (
        <span className={`inline-flex items-center h-[20px] px-2 rounded-md border text-[10px] font-bold uppercase tracking-[0.06em] ${badgeClass}`}>
          {statusLabel}
        </span>
      )}
    </div>
  );
}

export function TimerProgressBar({ placedAt, slaMinutes, stoppedAt }) {
  const elapsed = getElapsedMinutes(placedAt, stoppedAt);
  const sla = slaMinutes || 15;
  const progressPct = Math.min((elapsed / sla) * 100, 100);
  const timerLevel = getTimerLevel(elapsed);

  let colorClass = '';
  if (timerLevel === 'fresh') colorClass = 'bg-kds-timer-fresh';
  else if (timerLevel === 'warm') colorClass = 'bg-kds-timer-warm';
  else if (timerLevel === 'hot') colorClass = 'bg-kds-timer-hot';
  else if (timerLevel === 'fire') colorClass = 'bg-kds-timer-fire';

  return (
    <div className="w-full h-[3px] bg-kds-surface-3 overflow-hidden shrink-0">
      <div
        className={`h-full ${colorClass} rounded-r-full transition-all duration-1000 ease-linear`}
        style={{ width: `${progressPct}%` }}
      />
    </div>
  );
}
