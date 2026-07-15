import { useState, useMemo } from 'react';
import { Loader2, StickyNote, Utensils } from 'lucide-react';
import TimerBadge, { TimerProgressBar } from './TimerBadge';
import OrderItems from './OrderItems';
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
  void clock;

  const isLate = isOrderLate(order);
  const actions = STATUS_ACTIONS[order.status];
  const displayNumber = order.order_number || order.orderNumber || order.number || order.id;

  // Local state for ticked items
  const [tickedItems, setTickedItems] = useState({});

  const toggleTick = (itemId) => {
    setTickedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const allItemsTicked = useMemo(() => {
    if (!order.items || order.items.length === 0) return true;
    return order.items.every(item => tickedItems[item.id]);
  }, [order.items, tickedItems]);

  // Determine border, shadow, and badge color based on status
  let cardClass = "relative flex flex-col bg-kds-surface rounded-kds-lg border overflow-hidden transition-all duration-300 transform w-full h-full max-h-full flex-1 ";
  let topStripClass = "absolute top-0 bottom-0 left-0 w-1.5 z-10 ";
  let headerClass = "flex justify-between items-start px-5 py-4 bg-kds-surface-2 border-b border-kds-border relative ";

  switch (order.status) {
    case 'CONFIRMED':
      cardClass += isLate ? "border-kds-late shadow-kds-late " : "border-kds-new shadow-kds-new animate-slide-in ";
      topStripClass += "bg-kds-new";
      break;
    case 'PREPARING':
      cardClass += isLate ? "border-kds-late shadow-kds-late " : "border-kds-cooking shadow-kds-cooking ";
      topStripClass += "bg-kds-cooking";
      break;
    case 'READY':
      cardClass += "border-kds-ready shadow-kds-ready ";
      topStripClass += "bg-kds-ready";
      break;
    default:
      cardClass += "border-kds-border shadow-kds-card ";
      topStripClass += "bg-kds-border";
  }

  return (
    <article className={cardClass} aria-label={`Order ${displayNumber}`}>
      <div className={topStripClass} />

      {/* Header */}
      <div className={headerClass}>
        <div className="flex flex-col gap-1 z-10 ml-2">
          <div className="text-[32px] font-black text-kds-text leading-none tracking-tight">
            #{displayNumber}
          </div>
          <div className="flex items-center gap-1.5 text-[14px] font-bold text-kds-text-2 uppercase tracking-wide">
            {order.table ? `TABLE ${order.table}` : <><Utensils size={14}/> TAKEAWAY</>}
          </div>
        </div>
        
        <div className="z-10">
          <TimerBadge
            placedAt={order.placedAt}
            slaMinutes={order.slaMinutes}
            stoppedAt={order.timerStoppedAt}
            status={order.status}
          />
        </div>
      </div>

      <TimerProgressBar placedAt={order.placedAt} slaMinutes={order.slaMinutes} stoppedAt={order.timerStoppedAt} />

      {(order.customer_name || order.customerName || order.special_instructions) && (
        <div className="px-5 py-3 bg-kds-surface-3/50 border-b border-kds-border text-[14px] font-medium shrink-0">
          {(order.customer_name || order.customerName) && (
            <div className="text-kds-text mb-1">
              <span className="text-kds-text-3 uppercase tracking-wider text-[11px] font-bold mr-2">Customer</span>
              {order.customer_name || order.customerName}
            </div>
          )}
          {order.special_instructions && (
            <div className="text-kds-cooking">
              <span className="text-kds-cooking/60 uppercase tracking-wider text-[11px] font-bold mr-2">Note</span>
              {order.special_instructions}
            </div>
          )}
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-[150px]">
        <OrderItems items={order.items} tickedItems={tickedItems} toggleTick={toggleTick} />
      </div>

      {/* Staff Notes */}
      {order.notes?.length > 0 && (
        <div className="px-4 py-3 bg-kds-surface-2 border-t border-kds-border space-y-2 max-h-[100px] overflow-y-auto no-scrollbar shrink-0">
          {order.notes.map((n, i) => (
            <div key={i} className="flex items-start gap-2 text-[13px] text-kds-text-2">
              <StickyNote size={14} className="mt-0.5 shrink-0 text-kds-text-3" />
              <span>{typeof n === 'string' ? n : n.note || JSON.stringify(n)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex flex-col p-4 bg-kds-surface-2 border-t border-kds-border gap-2 shrink-0">
        {actions?.primary && (
          <button
            className={`relative flex items-center justify-center w-full h-[60px] rounded-kds text-[20px] font-black uppercase tracking-widest transition-all duration-200 active:scale-[0.98] ${
              allItemsTicked 
                ? 'bg-kds-ready text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400' 
                : 'bg-kds-surface-3 text-kds-text hover:bg-kds-border border border-kds-border'
            }`}
            onClick={() => onStatusChange(order.id, actions.primary.next)}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 size={24} className="animate-spin" /> : actions.primary.label}
          </button>
        )}

        <button
          className="flex items-center justify-center gap-2 w-full h-[40px] rounded-kds bg-transparent text-kds-text-3 text-[14px] font-bold uppercase tracking-wider hover:bg-kds-surface-3 hover:text-kds-text transition-colors"
          onClick={() => onAddNote(order)}
          disabled={isUpdating}
        >
          <StickyNote size={16} />
          ADD NOTE
        </button>
      </div>
    </article>
  );
}
