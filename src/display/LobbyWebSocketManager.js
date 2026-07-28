import { BASE_URL } from '../utils/constants';
import { getOrders } from '../api/kdsApi';
import {
  isActiveKDSStatus,
  isTerminalKDSStatus,
  normalizeOrder,
  orderKey,
} from '../utils/orderUtils';

const MAX_RECONNECT_DELAY_MS = 30_000;
const MAX_SEEN_EVENT_IDS = 2_000;
const STALE_ORDER_MS = 24 * 60 * 60 * 1000;

class LobbyWebSocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
    this.options = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.cleanupTimer = null;
    this.seenEventIds = new Set();
    this.stopped = true;
  }

  subscribe(options, listener) {
    this.listeners.add(listener);
    const signature = JSON.stringify({
      token: options.token,
      restaurantId: options.scope.restaurantId,
      counterId: options.scope.counterId,
    });
    if (!this.options || this.options.signature !== signature) {
      this.stop();
      this.options = { ...options, signature };
    }
    if (this.stopped) {
      this.stopped = false;
      this.connect();
      this.scheduleCleanup();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  notify(message) {
    this.listeners.forEach((listener) => listener(message));
  }

  socketUrl() {
    const url = new URL('/ws/restaurants/orders', BASE_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('token', this.options.token);
    if (this.options.scope.restaurantId) {
      url.searchParams.set('restaurant_id', this.options.scope.restaurantId);
    }
    if (this.options.scope.counterId) {
      url.searchParams.set('counter_id', this.options.scope.counterId);
    }
    return url.toString();
  }

  connect() {
    if (this.stopped || !this.options?.token) return;
    window.clearTimeout(this.reconnectTimer);
    this.notify({ type: 'connection', status: 'CONNECTING' });
    const socket = new WebSocket(this.socketUrl());
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.notify({ type: 'connection', status: 'CONNECTED' });
      getOrders({
        token: this.options.token,
        stationId: 'all',
        scope: this.options.scope,
      })
        .then((orders) => this.notify({ type: 'snapshot', orders }))
        .catch((error) => {
          console.error('Lobby reconnect reconciliation failed', error);
        });
    };

    socket.onmessage = (message) => {
      let data;
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }
      const eventId = String(data.event_id || '');
      if (eventId) {
        if (this.seenEventIds.has(eventId)) return;
        this.seenEventIds.add(eventId);
        if (this.seenEventIds.size > MAX_SEEN_EVENT_IDS) {
          this.seenEventIds.delete(this.seenEventIds.values().next().value);
        }
      }

      const event = String(data.event || '').toLowerCase();
      const type = String(data.type || '').toLowerCase();
      if (event === 'connected' || type === 'connected') return;
      if (event === 'order_snapshot' || type === 'order_snapshot') {
        const orders = Array.isArray(data.kitchen_orders)
          ? data.kitchen_orders.map(normalizeOrder).filter(Boolean)
          : [];
        this.notify({ type: 'snapshot', orders });
        return;
      }
      if (event === 'customer.details.updated') {
        this.notify({
          type: 'customer',
          orderId: orderKey(data.order_id),
          customerName: data.customer_name,
        });
        return;
      }
      if (event === 'order.counter.transferred') {
        const currentCounter = String(this.options.scope.counterId || '');
        const fromCounter = String(data.from_counter_id || '');
        const toCounter = String(data.to_counter_id || '');
        if (currentCounter && currentCounter === fromCounter && currentCounter !== toCounter) {
          this.notify({ type: 'remove', orderId: orderKey(data.order_id) });
          return;
        }
        if (currentCounter && currentCounter !== toCounter) return;
      }

      const order = normalizeOrder(data.kitchen_order || data.order);
      if (order && isTerminalKDSStatus(order.status)) {
        this.notify({ type: 'remove', orderId: order.id });
      } else if (order && isActiveKDSStatus(order.status)) {
        this.notify({ type: 'upsert', order });
      } else if (data.order_id && isTerminalKDSStatus(data.status)) {
        this.notify({ type: 'remove', orderId: orderKey(data.order_id) });
      }
    };

    socket.onerror = () => {
      this.notify({ type: 'connection', status: 'DISCONNECTED' });
    };
    socket.onclose = () => {
      if (this.stopped) return;
      this.notify({ type: 'connection', status: 'DISCONNECTED' });
      const exponent = Math.min(this.reconnectAttempts++, 8);
      const delay = Math.min(1000 * (2 ** exponent), MAX_RECONNECT_DELAY_MS);
      const jitter = Math.floor(Math.random() * Math.max(250, delay * 0.25));
      this.reconnectTimer = window.setTimeout(() => this.connect(), delay + jitter);
    };
  }

  scheduleCleanup() {
    window.clearTimeout(this.cleanupTimer);
    this.cleanupTimer = window.setTimeout(() => {
      if (this.stopped) return;
      this.notify({
        type: 'cleanup',
        cutoff: new Date(Date.now() - STALE_ORDER_MS),
      });
      this.scheduleCleanup();
    }, 60 * 60 * 1000);
  }

  stop() {
    this.stopped = true;
    window.clearTimeout(this.reconnectTimer);
    window.clearTimeout(this.cleanupTimer);
    this.reconnectTimer = null;
    this.cleanupTimer = null;
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.seenEventIds.clear();
  }
}

export const lobbyWebSocketManager = new LobbyWebSocketManager();
