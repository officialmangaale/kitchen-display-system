import { STATUS_COLORS } from '../utils/constants';

const STATUS_LABELS = {
  NEW: 'New',
  ACCEPTED: 'Accepted',
  PREPARING: 'Cooking',
  READY: 'Ready',
  SERVED: 'Served',
};

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'var(--muted)';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`status-badge status-badge--${(status || '').toLowerCase()}`}
      style={{ '--badge-color': color }}
      aria-label={`Status: ${label}`}
    >
      <span className="status-badge__dot" />
      {label}
    </span>
  );
}
