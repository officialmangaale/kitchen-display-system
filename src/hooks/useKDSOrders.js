import { useState, useCallback, useRef, useEffect } from 'react';
import { getOrders, updateOrderStatus, addKitchenNote } from '../api/kdsApi';
import {
  isActiveKDSStatus,
  isTerminalKDSStatus,
  getOrderAlertEvents,
  normalizeOrder,
  orderKey,
  sortOrders,
} from '../utils/orderUtils';
import { KDS_POLL_INTERVAL_MS, TOKEN_KEY } from '../utils/constants';

/**
 * Main KDS orders state management hook.
 *
 * @param {string} token - JWT token
 * @param {string} stationId - current station filter
 * @param {function} addToast - toast function
 * @param {function} onUnauthorized - callback for 401
 */
export function useKDSOrders(token, stationId, addToast, onUnauthorized, onOrderEvent) {
  const [ordersMap, setOrdersMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const mountedRef = useRef(true);
  const ordersMapRef = useRef(new Map());
  const initializedRef = useRef(false);
  const onOrderEventRef = useRef(onOrderEvent);

  useEffect(() => {
    onOrderEventRef.current = onOrderEvent;
  }, [onOrderEvent]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleApiError = useCallback(
    (err, context = '') => {
      if (!mountedRef.current) return;

      if (err.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        onUnauthorized?.('Session expired. Please login again.');
        return;
      }
      if (err.status === 404 && err.code === 'ORDER_NOT_FOUND') {
        addToast?.('Order no longer exists', 'warning');
        return;
      }
      if (err.status === 409) {
        addToast?.('Order was updated elsewhere. Refreshing...', 'warning');
        return;
      }
      if (err.status === 400 && err.code === 'INVALID_STATUS_TRANSITION') {
        addToast?.(err.message || 'Invalid status transition', 'error');
        return;
      }
      addToast?.(err.message || `${context} failed`, 'error');
    },
    [addToast, onUnauthorized]
  );

  const loadOrders = useCallback(
    async (showLoading = true) => {
      if (!token) return;
      if (showLoading) setLoading(true);
      setError(null);

      try {
        const orders = await getOrders({ token, stationId });
        if (!mountedRef.current) return;

        const map = new Map();
        orders
          .filter((o) => isActiveKDSStatus(o.status))
          .forEach((o) => map.set(o.id, o));
        const events = getOrderAlertEvents(
          ordersMapRef.current,
          map,
          initializedRef.current,
        );
        ordersMapRef.current = map;
        setOrdersMap(map);
        initializedRef.current = true;
        events.forEach((event) => onOrderEventRef.current?.(event));
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err);
        handleApiError(err, 'Loading orders');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [token, stationId, handleApiError]
  );

  // Load orders on mount and when station changes
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  // SSE is the primary low-latency path; polling reconciles missed events and
  // keeps the board current when a proxy or network interrupts the stream.
  useEffect(() => {
    if (!token) return undefined;
    const interval = window.setInterval(() => {
      loadOrders(false);
    }, KDS_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [token, loadOrders]);

  const upsertOrder = useCallback((order) => {
    const normalized = normalizeOrder(order);
    if (!normalized?.id) return;
    const previous = ordersMapRef.current;
    const next = new Map(previous);
    if (isTerminalKDSStatus(normalized.status) || !isActiveKDSStatus(normalized.status)) {
      next.delete(normalized.id);
    } else {
      next.set(normalized.id, normalized);
    }
    const events = getOrderAlertEvents(previous, next, initializedRef.current);
    ordersMapRef.current = next;
    setOrdersMap(next);
    events.forEach((event) => onOrderEventRef.current?.(event));
  }, []);

  const removeOrder = useCallback((orderId) => {
    const next = new Map(ordersMapRef.current);
    next.delete(orderId);
    next.delete(orderKey(orderId));
    ordersMapRef.current = next;
    setOrdersMap(next);
  }, []);

  const updateStatus = useCallback(
    async (orderId, status) => {
      if (!token) return;

      setUpdatingIds((prev) => new Set(prev).add(orderId));

      try {
        const updated = await updateOrderStatus({ token, orderId, status });
        if (!mountedRef.current) return;

        if (updated && isTerminalKDSStatus(updated.status)) {
          removeOrder(orderId);
        } else if (updated) {
          upsertOrder(updated);
        }
        addToast?.(`Order updated to ${status}`, 'success');
      } catch (err) {
        if (!mountedRef.current) return;

        if (err.status === 404) {
          removeOrder(orderId);
        } else if (err.status === 409) {
          loadOrders(false);
        }
        handleApiError(err, 'Status update');
      } finally {
        if (mountedRef.current) {
          setUpdatingIds((prev) => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
        }
      }
    },
    [token, upsertOrder, removeOrder, loadOrders, handleApiError, addToast]
  );

  const addNote = useCallback(
    async (orderId, note) => {
      if (!token) return;

      try {
        await addKitchenNote({ token, orderId, note });
        if (!mountedRef.current) return;
        addToast?.('Note added', 'success');
        // Reload to get updated notes from backend
        loadOrders(false);
      } catch (err) {
        if (!mountedRef.current) return;
        handleApiError(err, 'Adding note');
        throw err; // Re-throw for modal to handle
      }
    },
    [token, handleApiError, addToast, loadOrders]
  );

  const refresh = useCallback(() => loadOrders(false), [loadOrders]);

  // Build filtered & sorted display array
  const orders = sortOrders(Array.from(ordersMap.values()).filter((o) => isActiveKDSStatus(o.status))).filter((o) => {
    if (!stationId || stationId === 'all') return true;
    if (!o.stationIds || o.stationIds.length === 0) return false;
    return o.stationIds.includes(stationId);
  });

  return {
    orders,
    ordersMap,
    loading,
    error,
    updatingIds,
    loadOrders,
    upsertOrder,
    removeOrder,
    updateStatus,
    addNote,
    refresh,
  };
}
