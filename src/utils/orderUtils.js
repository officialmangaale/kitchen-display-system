import { STATUSES } from './constants';

/**
 * Extract numeric ID from order ID string like "ord-482" -> "482"
 */
export function extractNumericOrderId(orderId) {
  if (!orderId) return '';
  const str = String(orderId);
  const match = str.match(/(\d+)$/);
  return match ? match[1] : str;
}

/**
 * Normalize an order object with defensive defaults
 */
export function normalizeOrder(order) {
  if (!order) return null;
  return {
    ...order,
    id: order.id || '',
    number: order.number || 0,
    table: order.table || null,
    placedAt: order.placedAt || new Date().toISOString(),
    status: STATUSES.includes(order.status) ? order.status : 'NEW',
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
export function getElapsedMinutes(placedAt) {
  if (!placedAt) return 0;
  const placed = new Date(placedAt);
  const now = new Date();
  return Math.max(0, Math.floor((now - placed) / 60000));
}

/**
 * Get SLA ratio (0 to 1+)
 */
export function getSlaRatio(placedAt, slaMinutes) {
  const elapsed = getElapsedMinutes(placedAt);
  const sla = slaMinutes || 15;
  return elapsed / sla;
}

/**
 * Get SLA severity level
 */
export function getSlaSeverity(placedAt, slaMinutes) {
  const ratio = getSlaRatio(placedAt, slaMinutes);
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
export function formatTimer(placedAt, slaMinutes) {
  const elapsed = getElapsedMinutes(placedAt);
  const sla = slaMinutes || 15;
  
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
export function isOrderLate(placedAt, slaMinutes) {
  return getSlaRatio(placedAt, slaMinutes) >= 1;
}

/**
 * Group rank logic:
 * 1. READY (10)
 * 2. LATE (20)
 * 3. NEW (30)
 * 4. PREPARING (40)
 * 5. ACCEPTED (50)
 * 6. SERVED (60)
 */
function getSortRank(order) {
  if (order.status === 'READY') return 10;
  if (order.status !== 'SERVED' && isOrderLate(order.placedAt, order.slaMinutes)) return 20;
  if (order.status === 'NEW') return 30;
  if (order.status === 'PREPARING') return 40;
  if (order.status === 'ACCEPTED') return 50;
  if (order.status === 'SERVED') return 60;
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
      o.status !== 'SERVED' &&
      isOrderLate(o.placedAt, o.slaMinutes)
  ).length;
}

/**
 * Count active orders (not SERVED)
 */
export function countActive(orders) {
  return orders.filter((o) => o.status !== 'SERVED').length;
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
