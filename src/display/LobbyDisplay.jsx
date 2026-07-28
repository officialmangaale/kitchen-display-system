import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChefHat, Clock3, Maximize, Volume2, Wifi, WifiOff } from 'lucide-react';
import { getDisplayConfig } from '../api/kdsApi';
import { TOKEN_KEY } from '../utils/constants';
import { normalizeOrder } from '../utils/orderUtils';
import { playOrderAlert, unlockAudio } from '../utils/sound';
import { readKDSScope } from '../utils/scope';
import { lobbyWebSocketManager } from './LobbyWebSocketManager';
import './lobby.css';

const DISPLAY_COLUMNS = [
  { status: 'WAITING', title: 'Waiting', subtitle: 'Order received' },
  { status: 'PREPARING', title: 'Preparing', subtitle: 'In the kitchen' },
  { status: 'READY', title: 'Ready', subtitle: 'Collect your order' },
];

function clamp(value, minimum, maximum, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.min(maximum, Math.max(minimum, numeric))
    : fallback;
}

function readLobbyConfig() {
  const params = new URLSearchParams(window.location.search);
  return {
    scope: readKDSScope(),
    token: params.get('token')?.trim() || localStorage.getItem(TOKEN_KEY) || '',
    theme: params.get('theme') === 'light' ? 'light' : 'dark',
    volume: clamp(params.get('volume'), 0, 1, 0.5),
    readyTimeoutSeconds: clamp(params.get('ready_timeout'), 10, 3600, 180),
    showItems: params.get('show_items') !== 'false',
    fontScale: clamp(params.get('font_scale'), 0.75, 2, 1),
    soundEnabled: params.get('sound') !== 'false',
    restaurantNameOverride: params.get('restaurant_name')?.trim() || '',
  };
}

function displayStatus(status) {
  switch (String(status || '').toUpperCase()) {
    case 'CONFIRMED':
      return 'WAITING';
    case 'PREPARING':
      return 'PREPARING';
    case 'READY':
      return 'READY';
    default:
      return 'COMPLETED';
  }
}

function displayOrder(order) {
  const normalized = normalizeOrder(order);
  if (!normalized) return null;
  const rawType = normalized.orderType;
  let orderType = 'COUNTER';
  if (rawType === 'DINE_IN') orderType = normalized.table ? 'DINE_IN' : 'QR';
  else if (rawType === 'PICKUP' || rawType === 'TAKEAWAY') orderType = 'TAKEAWAY';
  else if (rawType === 'DELIVERY' || rawType === 'ONLINE') orderType = 'ONLINE';
  return {
    ...normalized,
    orderNumber: normalized.orderNumber || String(normalized.number),
    displayToken: normalized.displayToken || normalized.orderNumber || String(normalized.number),
    orderType,
    status: displayStatus(normalized.status),
  };
}

const LobbyOrderCard = memo(function LobbyOrderCard({
  order,
  showItems,
  readyTimeoutSeconds,
}) {
  return (
    <article
      className={`lobby-card lobby-card--${order.status.toLowerCase()}`}
      style={{ viewTransitionName: `lobby-order-${order.id.replace(/[^a-zA-Z0-9-]/g, '')}` }}
    >
      <div className="lobby-card__top">
        <span className="lobby-card__number">#{order.orderNumber}</span>
        <span className="lobby-card__token">{order.displayToken}</span>
      </div>
      {(order.customerName || order.table) && (
        <div className="lobby-card__customer">
          {order.customerName && <strong>{order.customerName}</strong>}
          {order.table && <span>Table {order.table}</span>}
        </div>
      )}
      <div className="lobby-card__meta">
        <span>{order.orderType.replace('_', ' ')}</span>
        {order.estimatedMinutes != null && (
          <span><Clock3 size={14} /> {order.estimatedMinutes} min</span>
        )}
      </div>
      {showItems && order.items.length > 0 && (
        <ul className="lobby-card__items">
          {order.items.slice(0, 5).map((item) => (
            <li key={item.id || `${item.name}-${item.qty}`}>
              <b>{item.qty}×</b> {item.name}
            </li>
          ))}
          {order.items.length > 5 && <li>+{order.items.length - 5} more</li>}
        </ul>
      )}
      {order.status === 'READY' && (
        <div
          className="lobby-card__countdown"
          style={{ '--ready-duration': `${readyTimeoutSeconds}s` }}
          aria-label={`Automatically hides after ${readyTimeoutSeconds} seconds`}
        />
      )}
    </article>
  );
});

const LobbyColumn = memo(function LobbyColumn({
  definition,
  orders,
  showItems,
  readyTimeoutSeconds,
}) {
  return (
    <section className={`lobby-column lobby-column--${definition.status.toLowerCase()}`}>
      <header className="lobby-column__header">
        <div>
          <h2>{definition.title}</h2>
          <p>{definition.subtitle}</p>
        </div>
        <span>{orders.length}</span>
      </header>
      <div className="lobby-column__orders">
        {orders.length === 0 ? (
          <div className="lobby-column__empty">No orders</div>
        ) : (
          orders.map((order) => (
            <LobbyOrderCard
              key={order.id}
              order={order}
              showItems={showItems}
              readyTimeoutSeconds={readyTimeoutSeconds}
            />
          ))
        )}
      </div>
    </section>
  );
});

export default function LobbyDisplay() {
  const config = useMemo(() => readLobbyConfig(), []);
  const [orders, setOrders] = useState(() => new Map());
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
  const [restaurant, setRestaurant] = useState({
    name: config.restaurantNameOverride || 'Mangaale',
    logoUrl: null,
    counterName: '',
  });
  const [clock, setClock] = useState(() => new Date());
  const [lastEventAt, setLastEventAt] = useState(null);
  const [soundUnlocked, setSoundUnlocked] = useState(!config.soundEnabled);
  const [error, setError] = useState(config.token ? '' : 'A restaurant display token is required.');
  const readyTimersRef = useRef(new Map());
  const ordersRef = useRef(new Map());

  const commitOrders = useCallback((updater) => {
    const apply = () => {
      const next = updater(ordersRef.current);
      ordersRef.current = next;
      setOrders(next);
      setLastEventAt(new Date());
    };
    if (document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }, []);

  const clearReadyTimer = useCallback((orderId) => {
    const timer = readyTimersRef.current.get(orderId);
    if (timer) window.clearTimeout(timer);
    readyTimersRef.current.delete(orderId);
  }, []);

  const removeOrder = useCallback((orderId) => {
    clearReadyTimer(orderId);
    commitOrders((current) => {
      const next = new Map(current);
      next.delete(orderId);
      return next;
    });
  }, [clearReadyTimer, commitOrders]);

  const scheduleReadyRemoval = useCallback((order, playSound) => {
    clearReadyTimer(order.id);
    const readyAt = order.readyAt ? new Date(order.readyAt).getTime() : Date.now();
    const elapsed = Number.isFinite(readyAt) ? Math.max(0, Date.now() - readyAt) : 0;
    const remaining = Math.max(0, config.readyTimeoutSeconds * 1000 - elapsed);
    if (playSound && config.soundEnabled && soundUnlocked) {
      playOrderAlert('ready', config.volume);
    }
    const timer = window.setTimeout(() => removeOrder(order.id), remaining);
    readyTimersRef.current.set(order.id, timer);
  }, [
    clearReadyTimer,
    config.readyTimeoutSeconds,
    config.soundEnabled,
    config.volume,
    removeOrder,
    soundUnlocked,
  ]);

  const handleMessage = useCallback((message) => {
    if (message.type === 'connection') {
      setConnectionStatus(message.status);
      return;
    }
    if (message.type === 'snapshot') {
      const next = new Map();
      message.orders.map(displayOrder).filter(Boolean).forEach((order) => {
        if (order.status !== 'COMPLETED') next.set(order.id, order);
      });
      readyTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      readyTimersRef.current.clear();
      ordersRef.current = next;
      setOrders(next);
      next.forEach((order) => {
        if (order.status === 'READY') scheduleReadyRemoval(order, false);
      });
      setLastEventAt(new Date());
      return;
    }
    if (message.type === 'remove') {
      removeOrder(message.orderId);
      return;
    }
    if (message.type === 'customer') {
      commitOrders((current) => {
        const next = new Map(current);
        const order = next.get(message.orderId);
        if (order) next.set(message.orderId, { ...order, customerName: message.customerName });
        return next;
      });
      return;
    }
    if (message.type === 'cleanup') {
      commitOrders((current) => {
        const next = new Map(current);
        next.forEach((order, id) => {
          if (new Date(order.placedAt) < message.cutoff) next.delete(id);
        });
        return next;
      });
      return;
    }
    if (message.type === 'upsert') {
      const order = displayOrder(message.order);
      if (!order || order.status === 'COMPLETED') {
        if (order) removeOrder(order.id);
        return;
      }
      const previous = ordersRef.current.get(order.id);
      commitOrders((current) => new Map(current).set(order.id, order));
      if (order.status === 'READY' && previous?.status !== 'READY') {
        scheduleReadyRemoval(order, true);
      }
      if (
        order.status === 'WAITING' &&
        !previous &&
        config.soundEnabled &&
        soundUnlocked
      ) {
        playOrderAlert('new', config.volume);
      }
    }
  }, [
    commitOrders,
    config.soundEnabled,
    config.volume,
    removeOrder,
    scheduleReadyRemoval,
    soundUnlocked,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!config.token) return undefined;
    getDisplayConfig({ token: config.token, scope: config.scope })
      .then((data) => {
        setRestaurant({
          name: config.restaurantNameOverride || data.restaurant_name || 'Mangaale',
          logoUrl: data.restaurant_logo_url || null,
          counterName: data.counter_name || '',
        });
        setError('');
      })
      .catch((fetchError) => {
        console.error('Lobby configuration failed', fetchError);
        setError(fetchError.message || 'Unable to load this display configuration.');
      });
    return lobbyWebSocketManager.subscribe(config, handleMessage);
  }, [config, handleMessage]);

  useEffect(() => () => {
    readyTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    readyTimersRef.current.clear();
  }, []);

  const columns = useMemo(() => {
    const result = { WAITING: [], PREPARING: [], READY: [] };
    orders.forEach((order) => {
      if (result[order.status]) result[order.status].push(order);
    });
    Object.values(result).forEach((column) => {
      column.sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
    });
    return result;
  }, [orders]);

  const activateSound = async () => {
    const unlocked = await unlockAudio();
    setSoundUnlocked(unlocked);
    if (unlocked) playOrderAlert('ready', config.volume);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  return (
    <div
      className={`lobby-display lobby-display--${config.theme}`}
      style={{ '--lobby-font-scale': config.fontScale }}
    >
      {!soundUnlocked && (
        <button className="lobby-sound-gate" onClick={activateSound}>
          <Volume2 size={32} />
          <span>Tap to activate order-ready sound</span>
        </button>
      )}
      <header className="lobby-header">
        <div className="lobby-brand">
          {restaurant.logoUrl ? (
            <img src={restaurant.logoUrl} alt="" />
          ) : (
            <span><ChefHat /></span>
          )}
          <div>
            <h1>{restaurant.name}</h1>
            {restaurant.counterName && <p>{restaurant.counterName}</p>}
          </div>
        </div>
        <div className="lobby-clock">
          <strong>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
          <span>{clock.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>
        <div className="lobby-header__actions">
          <span className={`lobby-connection lobby-connection--${connectionStatus.toLowerCase()}`}>
            {connectionStatus === 'CONNECTED' ? <Wifi /> : <WifiOff />}
            {connectionStatus}
          </span>
          <button onClick={toggleFullscreen} aria-label="Toggle fullscreen"><Maximize /></button>
        </div>
      </header>

      {error ? (
        <main className="lobby-error">
          <WifiOff />
          <h2>Display unavailable</h2>
          <p>{error}</p>
        </main>
      ) : (
        <main className="lobby-grid">
          {DISPLAY_COLUMNS.map((definition) => (
            <LobbyColumn
              key={definition.status}
              definition={definition}
              orders={columns[definition.status]}
              showItems={config.showItems}
              readyTimeoutSeconds={config.readyTimeoutSeconds}
            />
          ))}
        </main>
      )}

      <footer className="lobby-footer">
        <span>Powered by Mangaale</span>
        <span>
          {lastEventAt ? `Live · updated ${lastEventAt.toLocaleTimeString()}` : 'Connecting to live orders…'}
        </span>
      </footer>
    </div>
  );
}
