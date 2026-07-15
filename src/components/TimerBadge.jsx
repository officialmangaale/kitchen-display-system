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
  else if (timerLevel === 'fire') colorClass = 'text-kds-timer-fire animate-pulse-urgent';

  return (
    <div className={`flex flex-col items-end justify-center ${colorClass}`}>
      <span className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums flex items-baseline">
        {displayNum}
        <span className="text-[14px] font-bold ml-0.5">{displayUnit}</span>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
        {statusLabel}
      </span>
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
    <div className="w-full h-1 bg-kds-border overflow-hidden shrink-0">
      <div
        className={`h-full ${colorClass} transition-all duration-1000 ease-linear animate-progress-fill`}
        style={{ width: `${progressPct}%` }}
      />
    </div>
  );
}
