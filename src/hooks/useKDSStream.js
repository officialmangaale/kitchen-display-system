import { useEffect, useRef, useCallback } from 'react';
import { BASE_URL } from '../utils/constants';
import { normalizeOrder } from '../utils/orderUtils';
import { playNewOrderSound } from '../utils/sound';

/**
 * SSE stream hook for real-time KDS events.
 *
 * @param {string} token - JWT token
 * @param {object} callbacks - { onOrderNew, onOrderUpdate, onOrderDelete, onConnected, onError, addToast }
 */
export function useKDSStream(token, callbacks) {
  const esRef = useRef(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const connect = useCallback(() => {
    if (!token) return;
    // Close existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = `${BASE_URL}/kds/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse(e.data);
        callbacksRef.current.onConnected?.(data);
      } catch {
        callbacksRef.current.onConnected?.({});
      }
    });

    es.addEventListener('order:new', (e) => {
      try {
        const order = normalizeOrder(JSON.parse(e.data));
        if (order) {
          callbacksRef.current.onOrderNew?.(order);
          playNewOrderSound();
          callbacksRef.current.addToast?.(
            `New order #${order.number || order.id} arrived`,
            'info'
          );
        }
      } catch {
        // Malformed event data
      }
    });

    es.addEventListener('order:update', (e) => {
      try {
        const order = normalizeOrder(JSON.parse(e.data));
        if (order) {
          callbacksRef.current.onOrderUpdate?.(order);
        }
      } catch {
        // Malformed event data
      }
    });

    es.addEventListener('order:delete', (e) => {
      try {
        const data = JSON.parse(e.data);
        const orderId = data.id || data.orderId || data;
        callbacksRef.current.onOrderDelete?.(orderId);
      } catch {
        // Malformed event data
      }
    });

    es.onerror = () => {
      callbacksRef.current.onError?.();
    };
  }, [token]);

  useEffect(() => {
    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  return { reconnect: connect };
}
