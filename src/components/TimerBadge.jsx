import { formatTimer, isOrderLate } from '../utils/orderUtils';

export default function TimerBadge({ placedAt, slaMinutes }) {
  const isLate = isOrderLate(placedAt, slaMinutes);
  const display = formatTimer(placedAt, slaMinutes);

  if (isLate) {
    return (
      <div className="timer-badge timer-badge--late">
        <span className="timer-badge__val">{display}</span>
        <span className="timer-badge__lbl">LATE</span>
      </div>
    );
  }

  return (
    <div className="timer-badge timer-badge--normal">
      <span className="timer-badge__val">{display}</span>
      <span className="timer-badge__lbl">TIMER</span>
    </div>
  );
}
