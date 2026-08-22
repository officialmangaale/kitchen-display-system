import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getOrders,
  updateOrderStatus,
  addKitchenNote,
  updatePrepTimer as updatePrepTimerRequest,
} from '../api/kdsApi';
import {
  isActiveKDSStatus,
  isTerminalKDSStatus,
  getOrderAlertEvents,
  normalizeOrder,
  orderKey,
  sortOrders,
} from '../utils/orderUtils';
import { readPrepTimerFields } from '../utils/prepTimer';
import { TOKEN_KEY } from '../utils/constants';

/**
 * Main KDS orders state management hook.
 *
 * @param {string} token - JWT token
 * @param {string} stationId - current station filter
 * @param {function} addToast - toast function
 * @param {function} onUnauthorized - callback for 401
 */
export function useKDSOrders(token, stationId, addToast, onUnauthorized, onOrderEvent, scope = {}) {
  const [ordersMap, setOrdersMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingIds, setUpdatingIds] = useState(new Set());
  // Tracked apart from updatingIds so a pending timer write only busies the
  // timer control, leaving the status action and the rest of the board usable.
  const [timerUpdatingIds, setTimerUpdatingIds] = useState(new Set());
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
        const orders = await getOrders({ token, stationId, scope });
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
    [token, stationId, scope, handleApiError]
  );

  // Load orders on mount and when station changes
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

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

  const replaceOrders = useCallback((orders) => {
    const next = new Map();
    (Array.isArray(orders) ? orders : [])
      .map(normalizeOrder)
      .filter((order) => order?.id && isActiveKDSStatus(order.status))
      .forEach((order) => next.set(order.id, order));
    const events = getOrderAlertEvents(
      ordersMapRef.current,
      next,
      initializedRef.current,
    );
    ordersMapRef.current = next;
    setOrdersMap(next);
    initializedRef.current = true;
    setLoading(false);
    events.forEach((event) => onOrderEventRef.current?.(event));
  }, []);

  const updateCustomerDetails = useCallback((payload) => {
    const key = orderKey(payload?.order_id || payload?.orderId);
    if (!key) return;
    const next = new Map(ordersMapRef.current);
    const current = next.get(key);
    if (!current) return;
    next.set(key, {
      ...current,
      ...(Object.prototype.hasOwnProperty.call(payload, 'customer_name')
        ? {
            customer_name: payload.customer_name,
            customerName: payload.customer_name,
          }
        : {}),
    });
    ordersMapRef.current = next;
    setOrdersMap(next);
  }, []);

  const updateStatus = useCallback(
    async (orderId, status) => {
      if (!token) return;

      setUpdatingIds((prev) => new Set(prev).add(orderId));

      try {
        const updated = await updateOrderStatus({ token, orderId, status, scope });
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
    [token, scope, upsertOrder, removeOrder, loadOrders, handleApiError, addToast]
  );

  /**
   * Merge server-confirmed timer fields into the order already on the board.
   *
   * Only the timer columns are taken from the response: it comes from the
   * shared order endpoint, whose payload shape is not the KDS order contract,
   * so adopting it wholesale would overwrite items and identifiers the card
   * depends on. Everything else keeps arriving through the normal WebSocket
   * and polling reconciliation.
   */
  const applyPrepTimer = useCallback((orderId, fields) => {
    const key = orderKey(orderId);
    const current = ordersMapRef.current.get(key);
    if (!current) return;
    const next = new Map(ordersMapRef.current);
    next.set(key, { ...current, ...fields });
    ordersMapRef.current = next;
    setOrdersMap(next);
  }, []);

  /**
   * Set, change or clear an order's preparation timer.
   *
   * Nothing is written locally before the backend confirms, so a failure needs
   * no rollback: the card keeps showing the last persisted timer. A
   * `durationSeconds` of 0 removes the scheduled auto-ready.
   */
  const updatePrepTimer = useCallback(
    async (orderId, durationSeconds) => {
      if (!token) return;

      setTimerUpdatingIds((prev) => new Set(prev).add(orderId));

      try {
        const response = await updatePrepTimerRequest({ token, orderId, durationSeconds });
        if (!mountedRef.current) return;

        const fields = readPrepTimerFields(response);
        if (fields) {
          applyPrepTimer(orderId, fields);
        } else {
          // The response said nothing about the timer; reconcile rather than
          // render a countdown we cannot vouch for.
          loadOrders(false);
        }

        addToast?.(
          durationSeconds > 0
            ? `Ready timer set to ${Math.round(durationSeconds / 60)} min`
            : 'Ready timer removed',
          'success',
        );
      } catch (err) {
        if (!mountedRef.current) return;

        // A conflict is the expected outcome when the order moved on underneath
        // us: the backend sweeper fired, or another device marked it ready.
        if (err.status === 404) {
          removeOrder(orderId);
        } else if (err.status === 409 || err.status === 400) {
          loadOrders(false);
        }
        handleApiError(err, 'Timer update');
      } finally {
        if (mountedRef.current) {
          setTimerUpdatingIds((prev) => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
        }
      }
    },
    [token, applyPrepTimer, removeOrder, loadOrders, handleApiError, addToast]
  );

  const addNote = useCallback(
    async (orderId, note) => {
      if (!token) return;

      try {
        await addKitchenNote({ token, orderId, note, scope });
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
    [token, scope, handleApiError, addToast, loadOrders]
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
    timerUpdatingIds,
    loadOrders,
    upsertOrder,
    removeOrder,
    replaceOrders,
    updateCustomerDetails,
    updateStatus,
    updatePrepTimer,
    addNote,
    refresh,
  };
}
