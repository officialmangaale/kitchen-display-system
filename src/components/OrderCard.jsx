import { useState } from 'react';
import { Loader2, Utensils, Bike } from 'lucide-react';
import TimerBadge, { TimerProgressBar } from './TimerBadge';
import PrepTimerControl, { PrepCountdownChip } from './PrepTimerControl';
import OrderItems from './OrderItems';
import DineInItems from './DineInItems';
import { STATUS_ACTIONS } from '../utils/constants';
import { isOrderLate } from '../utils/orderUtils';

/** Wall-clock time the order was placed, e.g. "10:38 am". */
function formatClockTime(placedAt) {
  if (!placedAt) return '';
  const date = new Date(placedAt);
  if (Number.isNaN(date.getTime())) return '';
  return date
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
}

// Status is carried by a small mark and a word, never by a filled block. Colour
// appears in exactly two places on a card — this dot and the countdown — so it
// stays a signal instead of decoration.
const STATUS_PRESENTATION = {
  CONFIRMED: { label: 'New', dot: 'bg-card-new', text: 'text-card-new' },
  PREPARING: { label: 'Preparing', dot: 'bg-card-cooking', text: 'text-card-cooking' },
  READY: { label: 'Ready', dot: 'bg-card-ready', text: 'text-card-ready' },
};

const STATUS_FALLBACK = {
  label: 'Received',
  dot: 'bg-card-ink-3',
  text: 'text-card-ink-2',
};

const LATE_PRESENTATION = {
  label: 'Late',
  dot: 'bg-card-late',
  text: 'text-card-late',
};

/** Shared status mark: a dot and a word, sized for a wall-mounted screen. */
function StatusMark({ presentation, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap ${presentation.text} ${className}`}
    >
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${presentation.dot}`} />
      {presentation.label}
    </span>
  );
}

/** Uppercase, letterspaced micro-label used for the card's meta lines. */
const META_CLASS =
  'text-[10px] font-semibold uppercase tracking-[0.14em] text-card-ink-3';

export default function OrderCard({
  order,
  isUpdating,
  isTimerUpdating,
  onStatusChange,
  onAddNote,
  onPrepTimerChange,
  clock, // unused but triggers re-render
  dineIn = false,
}) {
  const safeOrder = order || { items: [] };
  void clock;

  const isLate = isOrderLate(safeOrder);
  const isDelivery = String(safeOrder.orderType || safeOrder.order_type || safeOrder.type || '')
    .trim()
    .toLowerCase() === 'delivery';
  const actions = safeOrder.status === 'READY' && isDelivery
    ? null
    : STATUS_ACTIONS[safeOrder.status];
  const displayNumber = safeOrder.order_number || safeOrder.orderNumber || safeOrder.number || safeOrder.id;

  // Local state for ticked items
  const [tickedItems, setTickedItems] = useState({});

  const toggleTick = (itemId) => {
    setTickedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  if (!order) return null;

  const presentation = STATUS_PRESENTATION[order.status] || STATUS_FALLBACK;
  const customerName = order.customer_name || order.customerName || null;
  const orderType = order.table ? `Table ${order.table}` : 'Takeaway';

  // Dine-In: read-only customer display — order ID, status, items, quantity.
  if (dineIn) {
    // Every section is a fixed height, so all Dine-In cards render at exactly
    // the same size no matter how many items an order carries.
    const placedTime = formatClockTime(order.placedAt);

    return (
      <article
        className="relative flex flex-col h-[232px] bg-card-bg rounded-[18px] border border-card-line shadow-card-rest overflow-hidden w-full min-w-0"
        aria-label={`Order ${displayNumber}, ${presentation.label}${isLate ? ', late' : ''}`}
      >
        {/* Order number + time placed */}
        <div className="card-wash shrink-0 flex items-baseline justify-between gap-3 min-w-0 px-6 pt-6 pb-3">
          <span className="min-w-0 text-[30px] font-semibold text-card-ink leading-none tracking-[-0.035em] tabular-nums truncate">
            {displayNumber}
          </span>
          {placedTime && (
            <span className="text-[13px] font-medium text-card-ink-3 tabular-nums whitespace-nowrap shrink-0">
              {placedTime}
            </span>
          )}
        </div>

        {/* Status line. Late is an additional mark, never a replacement. */}
        <div className="shrink-0 flex items-center gap-3 px-6 pb-4 min-w-0 h-[28px] text-[14px] font-semibold">
          {isLate && <StatusMark presentation={LATE_PRESENTATION} className="shrink-0" />}
          <StatusMark presentation={presentation} className="min-w-0" />

          {/* Read-only countdown, same value the kitchen card shows. Shares this
              row because the card is a fixed height and an extra row would
              clip the section below it. */}
          <PrepCountdownChip order={order} />
        </div>

        <div className="shrink-0 border-t border-card-line mx-6" />

        <DineInItems items={order.items} />

        {/* Absorbs the remainder so every card ends at the same height */}
        <div className="flex-1 min-h-0" />
      </article>
    );
  }

  // Fixed height so every kitchen card in a row aligns regardless of item count.
  // The flex spacer below absorbs whatever the sections above don't use.
  const cardClass =
    'relative flex flex-col h-[400px] bg-card-bg rounded-[18px] border border-card-line shadow-card-rest overflow-hidden w-full min-w-0 ' +
    (order.status === 'CONFIRMED' && !isLate ? 'animate-slide-in' : '');

  const headerPresentation = isLate ? LATE_PRESENTATION : presentation;

  return (
    <article className={cardClass} aria-label={`Order ${displayNumber}`}>
      {/* Header — the order's identity and its state, nothing else.
          Customer and table now live on the meta line rather than in a
          separate tinted strip, which is what keeps the card within its
          fixed height once a countdown is present. */}
      {/* A whisper of the brand ramp behind the order's identity. It fades to
          nothing before the item list, so it tints the card without ever
          sitting behind text that has to be read quickly. */}
      <div className="card-wash shrink-0 px-6 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3 min-w-0 h-[14px]">
          <span className={`${META_CLASS} min-w-0 flex items-center gap-1.5 truncate`}>
            {!order.table && <Utensils size={11} className="shrink-0" />}
            <span className="truncate">
              {orderType}
              {customerName ? ` · ${customerName}` : ''}
            </span>
          </span>
          <StatusMark
            presentation={headerPresentation}
            className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em]"
          />
        </div>

        <div className="mt-2.5 flex items-baseline justify-between gap-3 min-w-0">
          <span className="min-w-0 text-[36px] font-semibold text-card-ink leading-none tracking-[-0.04em] tabular-nums truncate">
            {displayNumber}
          </span>
          <TimerBadge
            placedAt={order.placedAt}
            slaMinutes={order.slaMinutes}
            stoppedAt={order.timerStoppedAt}
          />
        </div>
      </div>

      <TimerProgressBar
        placedAt={order.placedAt}
        slaMinutes={order.slaMinutes}
        stoppedAt={order.timerStoppedAt}
      />

      {/* Fixed two-row viewport; extra items, instructions and kitchen notes
          scroll inside it rather than growing the card. */}
      <OrderItems
        items={order.items}
        tickedItems={tickedItems}
        toggleTick={toggleTick}
        notes={order.notes}
        instructions={order.special_instructions}
      />

      {/* Absorbs the remainder so actions stay pinned across every card */}
      <div className="flex-1 min-h-0" />

      {/* Footer actions */}
      <div className="flex flex-col px-6 pt-3 pb-4 border-t border-card-line gap-1.5 shrink-0 mt-auto">
        <PrepTimerControl
          order={order}
          isUpdating={isTimerUpdating}
          onChange={onPrepTimerChange}
        />

        {order.status === 'READY' && isDelivery && (
          <div className="flex items-center justify-center gap-2 w-full h-[48px] rounded-[12px] bg-card-veil text-card-ready text-[14px] font-semibold">
            <Bike size={16} className="shrink-0" />
            Waiting for rider pickup
          </div>
        )}

        {actions?.primary && (
          <button
            className="card-cta flex items-center justify-center w-full h-[48px] rounded-[12px] text-white text-[15px] font-semibold tracking-[-0.01em] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onStatusChange(order.id, actions.primary.next)}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 size={18} className="animate-spin" /> : actions.primary.label}
          </button>
        )}

        <button
          className="flex items-center justify-center w-full h-[30px] rounded-[10px] text-card-ink-2 text-[13px] font-medium hover:bg-card-veil hover:text-card-ink transition-colors duration-150 disabled:opacity-50"
          onClick={() => onAddNote(order)}
          disabled={isUpdating}
        >
          Add Note
        </button>
      </div>
    </article>
  );
}
