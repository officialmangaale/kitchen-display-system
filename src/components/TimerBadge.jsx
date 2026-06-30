import { formatTimer, isOrderLate } from '../utils/orderUtils';

export default function TimerBadge({ placedAt, slaMinutes, stoppedAt, status }) {
  const isFrozen = status === 'READY' && Boolean(stoppedAt);
  const isLate = isOrderLate(placedAt, slaMinutes, stoppedAt);
  const display = formatTimer(placedAt, slaMinutes, stoppedAt);

  if (isLate) {
    return (
      <div className="timer-badge timer-badge--late">
        <span className="timer-badge__val">{display}</span>
        <span className="timer-badge__lbl">{isFrozen ? 'READY' : 'LATE'}</span>
      </div>
    );
  }

  return (
    <div className="timer-badge timer-badge--normal">
      <span className="timer-badge__val">{display}</span>
      <span className="timer-badge__lbl">{isFrozen ? 'READY' : 'TIMER'}</span>
    </div>
  );
}
