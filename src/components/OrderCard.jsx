import { Loader2, StickyNote, Utensils } from 'lucide-react';
import TimerBadge from './TimerBadge';
import { STATUS_ACTIONS } from '../utils/constants';
import { isOrderLate } from '../utils/orderUtils';

export default function OrderCard({
  order,
  isUpdating,
  onStatusChange,
  onAddNote,
  clock, // unused but triggers re-render
}) {
  if (!order) return null;

  const isLate = isOrderLate(order.placedAt, order.slaMinutes);
  const actions = STATUS_ACTIONS[order.status];
  const isServed = order.status === 'SERVED';
  
  // Clean primary button texts
  const getPrimaryLabel = (status) => {
    if (status === 'NEW') return 'ACCEPT';
    if (status === 'ACCEPTED') return 'START COOKING';
    if (status === 'PREPARING') return 'MARK READY';
    if (status === 'READY') return 'SERVED';
    return 'ACTION';
  };

  return (
    <article
      className={`order-card order-card--${(order.status || 'new').toLowerCase()} ${
        isLate && !isServed ? 'order-card--late' : ''
      }`}
      aria-label={`Order ${order.number || order.id}`}
    >
      <div className="order-card__strip" />

      {/* Header */}
      <div className="order-card__header">
        <div className="order-card__id">#{order.number || order.id}</div>
        <div className="order-card__type">
          {order.table ? `Table ${order.table}` : <><Utensils size={18}/> Takeaway</>}
        </div>
        {!isServed && (
          <TimerBadge placedAt={order.placedAt} slaMinutes={order.slaMinutes} />
        )}
      </div>

      {/* Items */}
      <ul className="order-items">
        {order.items?.map((item) => (
          <li key={item.id} className="order-item">
            <div className="order-item__qty-bubble">{item.qty}x</div>
            <div className="order-item__info">
              <span className="order-item__name">{item.name}</span>
              {item.modifiers?.length > 0 && (
                <div className="order-item__mods">
                  {item.modifiers.join(', ')}
                </div>
              )}
              {item.allergens?.length > 0 && (
                <div className="order-item__allergens">
                  {item.allergens.map((a) => (
                    <span key={a} className="allergen-chip">{a}</span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Notes */}
      {order.notes?.length > 0 && (
        <div className="order-notes">
          {order.notes.map((n, i) => (
            <div key={i} className="order-note-item">
              <StickyNote size={16} />
              <span>{typeof n === 'string' ? n : n.note || JSON.stringify(n)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {!isServed && (
        <div className="order-actions">
          {actions?.primary && (
            <button
              className="btn-massive btn-massive--primary"
              onClick={() => onStatusChange(order.id, actions.primary.next)}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 size={24} className="spin" /> : getPrimaryLabel(order.status)}
            </button>
          )}

          {/* Show secondary actions ONLY for NEW to start directly, otherwise just note */}
          <div className="order-actions__secondary">
             {order.status === 'NEW' && actions?.secondary?.map((sec) => (
              <button
                key={sec.next}
                className="btn-secondary"
                onClick={() => onStatusChange(order.id, sec.next)}
                disabled={isUpdating}
              >
                Start Directly
              </button>
            ))}
            <button
              className="btn-secondary btn-secondary--note"
              onClick={() => onAddNote(order)}
              disabled={isUpdating}
            >
              <StickyNote size={18} />
              Add Note
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
