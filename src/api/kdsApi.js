import { BASE_URL } from '../utils/constants';
import { extractNumericOrderId, normalizeOrder } from '../utils/orderUtils';
import { appendScope } from '../utils/scope';
import { readServiceResponse } from './response';
import { getConfiguredServiceBase } from '../utils/serviceConfig';

/**
 * Shared request helper
 */
async function request(path, { token, method = 'GET', body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = { method, headers };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  const baseURL = getConfiguredServiceBase(BASE_URL, 'KDS REST API base URL');
  const res = await fetch(`${baseURL}${path}`, opts);

  // Handle 204 No Content without requiring a body or content type.
  if (res.status === 204) return null;
  return readServiceResponse(res, 'KDS REST API');
}

/**
 * Fetch KDS orders, optionally filtered by station
 */
export async function getOrders({ token, stationId, scope }) {
  let path = '/kds/orders';
  if (stationId && stationId !== 'all') {
    path += `?stationId=${encodeURIComponent(stationId)}`;
  }
  const data = await request(appendScope(path, scope), { token });
  const orders = Array.isArray(data) ? data : data?.orders || [];
  return orders.map(normalizeOrder).filter(Boolean);
}

/**
 * Update order status (uses numeric ID)
 */
export async function updateOrderStatus({ token, orderId, status, scope }) {
  const numId = extractNumericOrderId(orderId);
  const data = await request(appendScope(`/kds/orders/${numId}/status`, scope), {
    token,
    method: 'PATCH',
    body: { status },
  });
  return data ? normalizeOrder(data) : null;
}

/**
 * Add a kitchen note to an order (uses numeric ID)
 */
export async function addKitchenNote({ token, orderId, note, scope }) {
  const numId = extractNumericOrderId(orderId);
  return request(appendScope(`/kds/orders/${numId}/note`, scope), {
    token,
    method: 'POST',
    body: { note },
  });
}

export async function getCounter({ token, counterId }) {
  if (!counterId) return null;
  const response = await request(`/counters/${encodeURIComponent(counterId)}`, { token });
  return response?.data || null;
}

export async function getDisplayConfig({ token, scope }) {
  return request(appendScope('/kds/display-config', scope), { token });
}

/**
 * Set, change or clear an order's preparation ("auto-ready") timer.
 *
 * Deliberately the same endpoint and payload the Restaurant App already calls
 * (`PATCH /orders/:id/timer` with `prep_duration_seconds`), so both surfaces
 * write the one persisted `prep_auto_ready_at` and neither keeps a timer of its
 * own. A duration of 0 cancels the scheduled auto-ready.
 *
 * Scope query parameters are intentionally omitted: this is the shared order
 * endpoint, not a KDS-scoped one, and it authorizes by order ID under the same
 * `manage_orders` permission the KDS status endpoint already requires.
 */
export async function updatePrepTimer({ token, orderId, durationSeconds }) {
  const numId = extractNumericOrderId(orderId);
  const seconds = Math.max(0, Math.round(Number(durationSeconds) || 0));
  return request(`/orders/${numId}/timer`, {
    token,
    method: 'PATCH',
    body: { prep_duration_seconds: seconds },
  });
}
