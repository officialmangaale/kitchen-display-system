import { useEffect, useRef, useCallback } from 'react';
import { BASE_URL } from '../utils/constants';
import { isActiveKDSStatus, isTerminalKDSStatus, normalizeOrder } from '../utils/orderUtils';

const MAX_RECONNECT_DELAY_MS = 30_000;
const MAX_SEEN_EVENT_IDS = 2_000;

function websocketUrl(token, scope) {
  const url = new URL('/ws/restaurants/orders', BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  if (scope?.restaurantId) url.searchParams.set('restaurant_id', scope.restaurantId);
  if (scope?.counterId) url.searchParams.set('counter_id', scope.counterId);
  return url.toString();
}

/**
 * One authenticated WebSocket stream for both deltas and reconnect snapshots.
 * Retries continue for the lifetime of the screen with capped exponential
 * backoff and jitter; event IDs make replay idempotent.
 */
export function useKDSStream(token, scope, callbacks) {
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const attemptRef = useRef(0);
  const stoppedRef = useRef(false);
  const seenEventIdsRef = useRef(new Set());
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const rememberEvent = useCallback((eventId) => {
    if (!eventId) return true;
    const seen = seenEventIdsRef.current;
    if (seen.has(eventId)) return false;
    seen.add(eventId);
    if (seen.size > MAX_SEEN_EVENT_IDS) {
      const oldest = seen.values().next().value;
      seen.delete(oldest);
    }
    return true;
  }, []);

  const connect = useCallback(() => {
    if (!token || stoppedRef.current) return;
    window.clearTimeout(reconnectTimerRef.current);
    socketRef.current?.close();

    const socket = new WebSocket(websocketUrl(token, scope));
    socketRef.current = socket;

    socket.onopen = () => {
      attemptRef.current = 0;
      callbacksRef.current.onConnected?.({});
    };

    socket.onmessage = (message) => {
      let data;
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }

      const event = String(data.event || '').toUpperCase();
      const eventName = String(data.event || '').toLowerCase();
      const type = String(data.type || '').toLowerCase();
      if (event === 'CONNECTED' || type === 'connected') return;
      if (!rememberEvent(data.event_id)) return;

      if (event === 'ORDER_SNAPSHOT' || type === 'order_snapshot') {
        const orders = Array.isArray(data.kitchen_orders)
          ? data.kitchen_orders.map(normalizeOrder).filter(Boolean)
          : [];
        callbacksRef.current.onSnapshot?.(orders);
        return;
      }

      if (eventName === 'customer.details.updated') {
        callbacksRef.current.onCustomerDetailsUpdated?.(data);
        return;
      }

      if (eventName === 'order.counter.transferred') {
        const scopedCounter = String(scope?.counterId || '');
        const fromCounter = String(data.from_counter_id || '');
        const toCounter = String(data.to_counter_id || '');
        if (scopedCounter && scopedCounter === fromCounter && scopedCounter !== toCounter) {
          callbacksRef.current.onOrderDelete?.(data.order_id);
          return;
        }
        if (scopedCounter && scopedCounter !== toCounter) return;
      }

      const order = normalizeOrder(data.kitchen_order || data.order);
      if (order && isTerminalKDSStatus(order.status)) {
        callbacksRef.current.onOrderDelete?.(order.id);
      } else if (order && isActiveKDSStatus(order.status)) {
        callbacksRef.current.onOrderUpdate?.(order);
      } else if (data.order_id && isTerminalKDSStatus(data.status)) {
        callbacksRef.current.onOrderDelete?.(data.order_id);
      }
    };

    socket.onerror = () => callbacksRef.current.onError?.();
    socket.onclose = () => {
      if (stoppedRef.current) return;
      callbacksRef.current.onError?.();
      const exponent = Math.min(attemptRef.current++, 8);
      const base = Math.min(1_000 * (2 ** exponent), MAX_RECONNECT_DELAY_MS);
      const jitter = Math.floor(Math.random() * Math.max(250, base * 0.25));
      // The callback intentionally resolves the latest memoized connector.
      // eslint-disable-next-line react-hooks/immutability
      reconnectTimerRef.current = window.setTimeout(connect, base + jitter);
    };
  }, [rememberEvent, scope, token]);

  useEffect(() => {
    stoppedRef.current = false;
    connect();
    return () => {
      stoppedRef.current = true;
      window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [connect]);

  return { reconnect: connect };
}
