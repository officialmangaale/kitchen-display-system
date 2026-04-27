import { AlertTriangle, Zap } from 'lucide-react';

export default function PriorityBadge({ priority }) {
  if (!priority || priority === 'NORMAL') return null;

  const isRush = priority === 'RUSH';

  return (
    <span
      className={`priority-badge priority-badge--${priority.toLowerCase()}`}
      aria-label={`Priority: ${priority}`}
    >
      {isRush ? <Zap size={12} /> : <AlertTriangle size={12} />}
      {priority}
    </span>
  );
}
