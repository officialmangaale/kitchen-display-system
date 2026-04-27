import { BASE_URL } from '../utils/constants';
import { extractNumericOrderId, normalizeOrder } from '../utils/orderUtils';

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

  const res = await fetch(`${BASE_URL}${path}`, opts);

  if (!res.ok) {
    let errorData = {};
    try {
      errorData = await res.json();
    } catch {
      // response may not be JSON
    }
    const err = new Error(errorData.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = errorData.error || 'UNKNOWN_ERROR';
    err.message = errorData.message || err.message;
    throw err;
  }

  // Handle 204 No Content
  if (res.status === 204) return null;

  return res.json();
}

/**
 * Fetch KDS orders, optionally filtered by station
 */
export async function getOrders({ token, stationId }) {
  let path = '/kds/orders';
  if (stationId && stationId !== 'all') {
    path += `?stationId=${encodeURIComponent(stationId)}`;
  }
  const data = await request(path, { token });
  const orders = Array.isArray(data) ? data : data?.orders || [];
  return orders.map(normalizeOrder);
}

/**
 * Update order status (uses numeric ID)
 */
export async function updateOrderStatus({ token, orderId, status }) {
  const numId = extractNumericOrderId(orderId);
  const data = await request(`/kds/orders/${numId}/status`, {
    token,
    method: 'PATCH',
    body: { status },
  });
  return data ? normalizeOrder(data) : null;
}

/**
 * Add a kitchen note to an order (uses numeric ID)
 */
export async function addKitchenNote({ token, orderId, note }) {
  const numId = extractNumericOrderId(orderId);
  return request(`/kds/orders/${numId}/note`, {
    token,
    method: 'POST',
    body: { note },
  });
}
