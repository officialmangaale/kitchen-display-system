import { ACTIVE_STATUSES, TERMINAL_STATUSES } from './constants.js';

/**
 * Extract numeric ID from order ID string like "ord-482" -> "482"
 */
export function extractNumericOrderId(orderId) {
  if (!orderId) return '';
  const str = String(orderId);
  const match = str.match(/(\d+)$/);
  return match ? match[1] : str;
}

export function orderKey(orderId) {
  const numeric = extractNumericOrderId(orderId);
  return numeric ? `ord-${numeric}` : String(orderId || '');
}

export function normalizeStatus(status) {
  const value = String(status || '').trim().toUpperCase();
  switch (value) {
    case 'NEW':
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'ACCEPTED':
    case 'PREPARING':
      return 'PREPARING';
    case 'READY':
      return 'READY';
    case 'SERVED':
    case 'COMPLETED':
    case 'DONE':
      return 'COMPLETED';
    case 'CANCELLED':
    case 'CANCELED':
    case 'REJECTED':
    case 'DECLINED':
    case 'FAILED':
    case 'EXPIRED':
    case 'DELIVERED':
      return value;
    default:
      return null;
  }
}

export function isActiveKDSStatus(status) {
  return ACTIVE_STATUSES.includes(normalizeStatus(status));
}

export function isTerminalKDSStatus(status) {
  return TERMINAL_STATUSES.includes(normalizeStatus(status));
}

/**
 * Normalize an order object with defensive defaults
 */
export function normalizeOrder(order) {
  if (!order) return null;
  const status = normalizeStatus(order.status || order.order_status);
  if (!status) return null;
  const id = order.id || order.orderId || order.order_id || order.orderID || '';
  const timerStartedAt = order.timerStartedAt || order.timer_started_at || order.placedAt || order.created_at;
  const timerStoppedAt = order.timerStoppedAt || order.timer_stopped_at || null;

  return {
    ...order,
    id: orderKey(id || order.number),
    number: order.number || 0,
    table: order.table || null,
    placedAt: timerStartedAt || new Date().toISOString(),
    timerStartedAt: timerStartedAt || order.placedAt || new Date().toISOString(),
    timerStoppedAt,
    status,
    priority: ['NORMAL', 'HIGH', 'RUSH'].includes(order.priority)
      ? order.priority
      : 'NORMAL',
    stationIds: Array.isArray(order.stationIds) ? order.stationIds : [],
    items: Array.isArray(order.items)
      ? order.items.map(normalizeItem)
      : [],
    notes: Array.isArray(order.notes) ? order.notes : [],
    chef: order.chef || null,
    slaMinutes: typeof order.slaMinutes === 'number' ? order.slaMinutes : 15,
  };
}

function normalizeItem(item) {
  return {
    ...item,
    id: item.id || '',
    name: item.name || 'Unknown Item',
    qty: item.qty || 1,
    modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
    allergens: Array.isArray(item.allergens) ? item.allergens : [],
  };
}

/**
 * Get elapsed minutes since placedAt
 */
export function getElapsedMinutes(placedAt, stoppedAt) {
  if (!placedAt) return 0;
  const placed = new Date(placedAt);
  const end = stoppedAt ? new Date(stoppedAt) : new Date();
  return Math.max(0, Math.floor((end - placed) / 60000));
}

/**
 * Get SLA ratio (0 to 1+)
 */
export function getSlaRatio(placedAt, slaMinutes, stoppedAt) {
  const elapsed = getElapsedMinutes(placedAt, stoppedAt);
  const sla = slaMinutes || 15;
  return elapsed / sla;
}

/**
 * Get SLA severity level
 */
export function getSlaSeverity(placedAt, slaMinutes, stoppedAt) {
  const ratio = getSlaRatio(placedAt, slaMinutes, stoppedAt);
  if (ratio >= 1) return 'breached';
  if (ratio >= 0.8) return 'urgent';
  if (ratio >= 0.5) return 'warning';
  return 'safe';
}

/**
 * Format timer display TV-first style
 * - under 60 min: 12m
 * - 60-999 min: 2h 15m
 * - over 999 min: 999m+
 */
export function formatTimer(placedAt, slaMinutes, stoppedAt) {
  const elapsed = getElapsedMinutes(placedAt, stoppedAt);

  if (elapsed > 999) return '999m+';

  if (elapsed >= 60) {
    const hours = Math.floor(elapsed / 60);
    const mins = elapsed % 60;
    return `${hours}h ${mins}m`;
  }
  
  return `${elapsed}m`;
}

/**
 * Check if order is late (SLA breached)
 */
export function isOrderLate(placedAt, slaMinutes, stoppedAt) {
  if (typeof placedAt === 'object' && placedAt !== null) {
    const order = placedAt;
    return getSlaRatio(order.placedAt, order.slaMinutes, order.timerStoppedAt) >= 1;
  }
  return getSlaRatio(placedAt, slaMinutes, stoppedAt) >= 1;
}

/**
 * Group rank logic:
 * 1. READY (10)
 * 2. LATE (20)
 * 3. CONFIRMED (30)
 * 4. PREPARING (40)
 * 5. terminal/unknown (60)
 */
function getSortRank(order) {
  if (order.status === 'READY') return 10;
  if (isActiveKDSStatus(order.status) && isOrderLate(order)) return 20;
  if (order.status === 'CONFIRMED') return 30;
  if (order.status === 'PREPARING') return 40;
  if (isTerminalKDSStatus(order.status)) return 60;
  return 100;
}

/**
 * Sort orders by group priority, then by oldest first
 */
export function sortOrders(orders) {
  return [...orders].sort((a, b) => {
    const rankA = getSortRank(a);
    const rankB = getSortRank(b);
    
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    
    // Within same group, oldest first (ascending date)
    return new Date(a.placedAt) - new Date(b.placedAt);
  });
}

/**
 * Count orders by status
 */
export function countByStatus(orders, status) {
  return orders.filter((o) => o.status === status).length;
}

/**
 * Count SLA breached orders
 */
export function countBreached(orders) {
  return orders.filter(
    (o) =>
      isActiveKDSStatus(o.status) &&
      isOrderLate(o)
  ).length;
}

/**
 * Count active kitchen orders.
 */
export function countActive(orders) {
  return orders.filter((o) => isActiveKDSStatus(o.status)).length;
}

/**
 * Extract unique station IDs from all orders
 */
export function extractStations(orders) {
  const set = new Set();
  orders.forEach((o) => {
    if (Array.isArray(o.stationIds)) {
      o.stationIds.forEach((s) => set.add(s));
    }
  });
  return Array.from(set).sort();
}
