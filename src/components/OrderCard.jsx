import { useState } from 'react';
import { Loader2, StickyNote, Utensils, ChefHat, BellRing, Check, Bike, Clock, CircleCheck } from 'lucide-react';
import TimerBadge, { TimerProgressBar } from './TimerBadge';
import PrepTimerControl from './PrepTimerControl';
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

// Primary action styling follows the kitchen workflow, not the card status tint.
// Always solid: this is the main operational control and a tinted variant read
// as disabled on the floor.
const PRIMARY_ACTION_STYLES = {
  CONFIRMED: {
    Icon: ChefHat,
    solid: 'bg-kds-new text-white shadow-[0_4px_14px_rgba(37,99,235,0.24)] hover:bg-blue-700',
  },
  PREPARING: {
    Icon: BellRing,
    solid: 'bg-kds-cooking text-white shadow-[0_4px_14px_rgba(245,158,11,0.26)] hover:bg-amber-600',
  },
  READY: {
    Icon: Check,
    solid: 'bg-kds-ready text-white shadow-[0_4px_14px_rgba(22,163,74,0.24)] hover:bg-green-700',
  },
};

const DEFAULT_PRIMARY_ACTION = {
  Icon: Check,
  solid: 'bg-kds-text text-white hover:bg-slate-800',
};

// Customer-facing status presentation. Derived from the same order.status the
// kitchen uses — no separate Dine-In state is ever created or stored.
const DINE_IN_STATUS = {
  CONFIRMED: {
    label: 'New',
    chip: 'bg-kds-new-bg text-kds-new border-blue-200',
    dot: 'bg-kds-new',
    accent: 'bg-kds-new',
  },
  PREPARING: {
    label: 'Preparing',
    chip: 'bg-orange-50 text-amber-700 border-amber-200',
    dot: 'bg-kds-cooking',
    accent: 'bg-kds-cooking',
  },
  READY: {
    label: 'Ready',
    chip: 'bg-kds-ready-bg text-green-700 border-green-200',
    dot: 'bg-kds-ready',
    accent: 'bg-kds-ready',
  },
};

const DINE_IN_STATUS_FALLBACK = {
  label: 'Received',
  chip: 'bg-kds-surface-3 text-kds-text-2 border-kds-border',
  dot: 'bg-kds-text-3',
  accent: 'bg-kds-border-2',
};

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

  // Dine-In: read-only customer display — order ID, status, items, quantity.
  if (dineIn) {
    // Accent always follows the kitchen status, never the late flag, so a late
    // Preparing ticket still reads as Preparing with Late shown as an extra badge.
    const presentation = DINE_IN_STATUS[order.status] || DINE_IN_STATUS_FALLBACK;
    const placedTime = formatClockTime(order.placedAt);

    return (
      // Every section below is a fixed height, so all Dine-In cards render at
      // exactly the same size no matter how many items an order carries.
      <article
        className="relative flex flex-col h-[232px] bg-kds-surface rounded-[16px] border border-kds-border shadow-[0_4px_18px_rgba(15,23,42,0.05)] overflow-hidden w-full min-w-0"
        aria-label={`Order ${displayNumber}, ${presentation.label}${isLate ? ', late' : ''}`}
      >
        {/* Order ID + time placed */}
        <div className="shrink-0 flex items-baseline justify-between gap-2 min-w-0 px-5 pt-5 pb-3">
          <span className="min-w-0 text-[21px] font-bold text-kds-text leading-none tracking-[-0.02em] truncate">
            <span className="text-kds-text-3">#</span>{displayNumber}
          </span>
          {placedTime && (
            <span className="text-[14px] font-medium text-kds-text-3 tabular-nums whitespace-nowrap shrink-0">
              {placedTime}
            </span>
          )}
        </div>

        {/* Status — Late is an additional badge, never a replacement */}
        <div className="shrink-0 flex items-center gap-2 px-5 pb-4 min-w-0">
          {isLate && (
            <span className="inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-lg border border-red-200 bg-kds-late-bg text-kds-late text-[13px] font-semibold whitespace-nowrap shrink-0">
              <Clock size={14} className="shrink-0" />
              Late
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-lg border text-[13px] font-semibold whitespace-nowrap min-w-0 ${presentation.chip}`}
          >
            {order.status === 'READY' ? (
              <CircleCheck size={14} className="shrink-0" />
            ) : (
              <span className={`w-2 h-2 rounded-full shrink-0 ${presentation.dot}`} />
            )}
            <span className="truncate">{presentation.label}</span>
          </span>
        </div>

        <div className="shrink-0 border-t border-kds-border mx-5" />

        <DineInItems items={order.items} />

        {/* Absorbs the remainder so the accent always sits flush at the bottom */}
        <div className="flex-1 min-h-0" />

        {/* Subtle status accent along the bottom edge */}
        <div className={`shrink-0 h-[3px] w-full ${presentation.accent}`} />
      </article>
    );
  }

  // Fixed height so every kitchen card in a row aligns regardless of item count.
  // The flex spacer below absorbs whatever the optional customer strip doesn't use.
  let cardClass = "relative flex flex-col h-[400px] bg-kds-surface rounded-[16px] border border-kds-border shadow-[0_4px_18px_rgba(15,23,42,0.05)] overflow-hidden w-full min-w-0 ";
  let topStripClass = "absolute top-0 bottom-0 left-0 w-1 z-10 ";
  let typeBadgeClass = "inline-flex items-center gap-1.5 self-start h-[24px] px-2.5 rounded-md border text-[10px] font-bold uppercase tracking-[0.06em] ";
  const headerClass = "shrink-0 flex justify-between items-start gap-3 px-5 pt-5 pb-3 relative ";

  // Late keeps its workflow accent — red is carried by the timer and Late badge.
  switch (order.status) {
    case 'CONFIRMED':
      cardClass += isLate ? "" : "animate-slide-in ";
      topStripClass += "bg-kds-new";
      typeBadgeClass += "bg-kds-new-bg text-kds-new border-blue-200";
      break;
    case 'PREPARING':
      topStripClass += "bg-kds-cooking";
      typeBadgeClass += "bg-kds-cooking-bg text-amber-700 border-amber-200";
      break;
    case 'READY':
      topStripClass += "bg-kds-ready";
      typeBadgeClass += "bg-kds-ready-bg text-green-700 border-green-200";
      break;
    default:
      topStripClass += "bg-kds-border-2";
      typeBadgeClass += "bg-kds-surface-3 text-kds-text-2 border-kds-border";
  }

  const primaryAction = PRIMARY_ACTION_STYLES[order.status] || DEFAULT_PRIMARY_ACTION;
  const PrimaryIcon = primaryAction.Icon;

  return (
    <article className={cardClass} aria-label={`Order ${displayNumber}`}>
      <div className={topStripClass} />

      {/* Header */}
      <div className={headerClass}>
        <div className="flex flex-col gap-2 z-10 ml-1 min-w-0">
          <span className={typeBadgeClass}>
            {order.table ? `TABLE ${order.table}` : <><Utensils size={12} className="shrink-0" /> TAKEAWAY</>}
          </span>
          <div className="text-[22px] font-bold text-kds-text leading-none tracking-[-0.02em] tabular-nums truncate">
            <span className="text-kds-text-3">#</span>{displayNumber}
          </div>
        </div>

        <div className="z-10 shrink-0">
          <TimerBadge
            placedAt={order.placedAt}
            slaMinutes={order.slaMinutes}
            stoppedAt={order.timerStoppedAt}
            status={order.status}
          />
        </div>
      </div>

      <TimerProgressBar placedAt={order.placedAt} slaMinutes={order.slaMinutes} stoppedAt={order.timerStoppedAt} />

      {/* Optional customer strip — one line, so it can never change card height */}
      {(order.customer_name || order.customerName || order.special_instructions) && (
        <div className="shrink-0 mx-5 mb-1.5 px-3 py-1.5 rounded-[10px] bg-kds-surface-2 border border-kds-border text-[12px] font-medium flex items-center gap-2 min-w-0">
          {(order.customer_name || order.customerName) && (
            <span className="text-kds-text truncate" title={order.customer_name || order.customerName}>
              <span className="text-kds-text-3 uppercase tracking-[0.06em] text-[10px] font-bold mr-1.5">Cust</span>
              {order.customer_name || order.customerName}
            </span>
          )}
          {order.special_instructions && (
            <span className="text-amber-700 truncate" title={order.special_instructions}>
              <span className="text-kds-text-3 uppercase tracking-[0.06em] text-[10px] font-bold mr-1.5">Note</span>
              {order.special_instructions}
            </span>
          )}
        </div>
      )}

      {/* Fixed two-row viewport; extra items and kitchen notes scroll inside it */}
      <OrderItems
        items={order.items}
        tickedItems={tickedItems}
        toggleTick={toggleTick}
        notes={order.notes}
      />

      {/* Absorbs the remainder so actions stay pinned across every card */}
      <div className="flex-1 min-h-0" />

      {/* Footer Actions */}
      <div className="flex flex-col px-5 pt-3 pb-3.5 border-t border-kds-border gap-1.5 shrink-0 mt-auto">
        {/* Auto-ready countdown. Sits directly above Mark Ready because it is
            the same decision — when this ticket is done — expressed as a
            schedule instead of a tap. Renders nothing unless PREPARING. */}
        <PrepTimerControl
          order={order}
          isUpdating={isTimerUpdating}
          onChange={onPrepTimerChange}
        />

        {order.status === 'READY' && isDelivery && (
          <div className="flex items-center justify-center gap-2 w-full h-[48px] rounded-xl bg-kds-ready-bg text-green-700 text-[13px] font-semibold border border-green-200">
            <Bike size={16} className="shrink-0" />
            Waiting for rider pickup
          </div>
        )}
        {actions?.primary && (
          <button
            className={`relative flex items-center justify-center gap-2 w-full h-[48px] rounded-xl text-[15px] font-semibold transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${primaryAction.solid}`}
            onClick={() => onStatusChange(order.id, actions.primary.next)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <PrimaryIcon size={18} className="shrink-0" />
                {actions.primary.label}
              </>
            )}
          </button>
        )}

        <button
          className="flex items-center justify-center gap-2 w-full h-[32px] rounded-[10px] bg-transparent text-kds-text-2 text-[14px] font-medium hover:bg-kds-surface-2 hover:text-kds-text transition-colors duration-150 disabled:opacity-60"
          onClick={() => onAddNote(order)}
          disabled={isUpdating}
        >
          <StickyNote size={15} className="shrink-0" />
          Add Note
        </button>
      </div>
    </article>
  );
}
