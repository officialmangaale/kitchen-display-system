import { useState, useCallback, useEffect } from 'react';
import { useClock } from '../hooks/useClock';
import { useToast } from '../hooks/useToast';
import { useFullscreen } from '../hooks/useFullscreen';
import { useKDSOrders } from '../hooks/useKDSOrders';
import { useKDSStream } from '../hooks/useKDSStream';
import KDSHeader from './KDSHeader';
import StatusFilter from './StatusFilter';
import StationFilter from './StationFilter';
import KitchenSummary from './KitchenSummary';
import DineInToggle from './DineInToggle';
import OrderCard from './OrderCard';
import SkeletonGrid from './SkeletonGrid';
import EmptyKitchen from './EmptyKitchen';
import ErrorBanner from './ErrorBanner';
import ToastHost from './ToastHost';
import AddNoteModal from './AddNoteModal';
import FullscreenTip from './FullscreenTip';
import { isActiveKDSStatus, isOrderLate } from '../utils/orderUtils';
import { playOrderAlert, unlockAudio } from '../utils/sound';
import { OfflineBanner } from './ConnectionStatus';
import { getCounter } from '../api/kdsApi';
import {
  FALLBACK_POLL_ACTIVATION_DELAY_MS,
  FALLBACK_POLL_INTERVAL_MS,
  shouldPollOrders,
} from '../utils/realtime';

export default function KDSDashboard({ token, onLogout, scope }) {
  const clock = useClock(30000);
  const { toasts, addToast, removeToast } = useToast();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const [statusFilter, setStatusFilter] = useState('all');
  const [stationId, setStationId] = useState('all');
  const [connectionStatus, setConnectionStatus] = useState('reconnecting');
  const [noteModal, setNoteModal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [counterName, setCounterName] = useState(
    scope.counterId ? `Counter ${scope.counterId}` : 'All Counters',
  );

  useEffect(() => {
    if (!scope.counterId) return undefined;
    let active = true;
    getCounter({ token, counterId: scope.counterId })
      .then((counter) => {
        if (active && counter) {
          setCounterName(counter.display_name || counter.counter_name || `Counter ${scope.counterId}`);
        }
      })
      .catch((error) => {
        console.error('Unable to load KDS counter label', error);
      });
    return () => { active = false; };
  }, [scope.counterId, token]);
  
  // TV Mode default based on screen width
  const [isTvMode, setIsTvMode] = useState(() => {
    const saved = localStorage.getItem('kds_tv_mode');
    if (saved !== null) return saved === 'true';
    return window.innerWidth > 1400;
  });

  // Read-only Dine-In display mode. Purely presentational: no API calls, no
  // effect on order state — it only changes what each card renders.
  const [dineInView, setDineInView] = useState(
    () => localStorage.getItem('kds_dine_in_view') === 'true',
  );

  const toggleDineInView = useCallback(() => {
    setDineInView((prev) => {
      const next = !prev;
      localStorage.setItem('kds_dine_in_view', String(next));
      return next;
    });
  }, []);

  const toggleTvMode = useCallback(() => {
    setIsTvMode((prev) => {
      const next = !prev;
      localStorage.setItem('kds_tv_mode', String(next));
      return next;
    });
  }, []);

  const handleUnauthorized = useCallback(
    (msg) => {
      onLogout(msg);
    },
    [onLogout]
  );

  const handleOrderEvent = useCallback((event) => {
    const displayNumber = event.order.order_number || event.order.number || event.order.id;
    if (soundEnabled && !soundMuted) playOrderAlert(event.type);
    addToast(
      event.type === 'ready'
        ? `Order #${displayNumber} is ready`
        : `New order #${displayNumber} arrived`,
      event.type === 'ready' ? 'success' : 'info',
    );
  }, [addToast, soundEnabled, soundMuted]);

  const {
    orders,
    ordersMap,
    loading,
    error,
    updatingIds,
    timerUpdatingIds,
    upsertOrder,
    removeOrder,
    replaceOrders,
    updateCustomerDetails,
    updateStatus,
    updatePrepTimer,
    addNote,
    refresh,
    loadOrders,
  } = useKDSOrders(
    token,
    'all',
    addToast,
    handleUnauthorized,
    handleOrderEvent,
    scope,
  ); // Load all stations from backend, filter locally

  const streamCallbacks = {
    onConnected: useCallback(() => {
      setConnectionStatus('connected');
    }, []),
    onSnapshot: useCallback(
      (snapshotOrders) => {
        replaceOrders(snapshotOrders);
      },
      [replaceOrders]
    ),
    onOrderNew: useCallback(
      (order) => {
        upsertOrder(order);
      },
      [upsertOrder]
    ),
    onOrderUpdate: useCallback(
      (order) => {
        upsertOrder(order);
      },
      [upsertOrder]
    ),
    onOrderDelete: useCallback(
      (orderId) => {
        removeOrder(orderId);
      },
      [removeOrder]
    ),
    onCustomerDetailsUpdated: useCallback(
      (payload) => updateCustomerDetails(payload),
      [updateCustomerDetails]
    ),
    onError: useCallback(() => {
      setConnectionStatus((current) => current === 'polling' ? current : 'reconnecting');
    }, []),
    addToast,
  };

  useKDSStream(token, scope, streamCallbacks);

  const socketConnected = connectionStatus === 'connected';

  // Reconcile through REST while the WebSocket reconnects. Polling shares the
  // same idempotent order map as WS frames, so reconnect snapshots cannot
  // duplicate tickets or alert sounds.
  useEffect(() => {
    if (socketConnected || !token) return undefined;

    let active = true;
    let inFlight = false;

    const poll = async () => {
      if (
        !active ||
        inFlight ||
        !shouldPollOrders('polling', document.visibilityState)
      ) {
        return;
      }
      inFlight = true;
      try {
        await refresh();
        if (active) {
          setConnectionStatus((current) => current === 'connected' ? current : 'polling');
        }
      } finally {
        inFlight = false;
      }
    };

    const activationTimer = window.setTimeout(() => {
      void poll();
    }, FALLBACK_POLL_ACTIVATION_DELAY_MS);
    const interval = window.setInterval(() => {
      void poll();
    }, FALLBACK_POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      window.clearTimeout(activationTimer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh, socketConnected, token]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleToggleSound = useCallback(async () => {
    if (!soundEnabled) {
      const unlocked = await unlockAudio();
      setSoundEnabled(unlocked);
      setSoundMuted(false);
      addToast(
        unlocked ? 'Kitchen alerts enabled' : 'Browser blocked audio. Tap again to retry.',
        unlocked ? 'success' : 'warning',
      );
      return;
    }
    setSoundMuted((value) => !value);
  }, [addToast, soundEnabled]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRefresh, toggleFullscreen]);

  const handleStatusChange = useCallback(
    (orderId, status) => {
      updateStatus(orderId, status);
    },
    [updateStatus]
  );

  const handlePrepTimerChange = useCallback(
    (orderId, durationSeconds) => {
      updatePrepTimer(orderId, durationSeconds);
    },
    [updatePrepTimer]
  );

  const handleAddNote = useCallback((order) => {
    setNoteModal(order);
  }, []);

  const handleNoteSubmit = useCallback(
    async (orderId, note) => {
      await addNote(orderId, note);
    },
    [addNote]
  );

  // Filter visible orders locally (Station + Status).
  const visibleOrders = orders
    .filter((o) => {
      if (!isActiveKDSStatus(o.status)) return false;

      // Station Filter
      if (stationId !== 'all') {
        if (!o.stationIds || !o.stationIds.includes(stationId)) return false;
      }

      // Status Filter
      if (statusFilter === 'new' && o.status !== 'CONFIRMED') return false;
      if (statusFilter === 'cooking' && o.status !== 'PREPARING') return false;
      if (statusFilter === 'ready' && o.status !== 'READY') return false;
      if (statusFilter === 'late' && !isOrderLate(o)) return false;

      return true;
    })
    .sort((a, b) => {
      const aLate = isOrderLate(a);
      const bLate = isOrderLate(b);

      const statusOrder = {
        'CONFIRMED': 4,
        'PREPARING': 3,
        'READY': 5,
      };

      const pA = aLate ? 1 : statusOrder[a.status] || 99;
      const pB = bLate ? 1 : statusOrder[b.status] || 99;

      if (pA !== pB) return pA - pB;

      // If same priority, older orders first
      const timeA = new Date(a.placedAt).getTime();
      const timeB = new Date(b.placedAt).getTime();
      return timeA - timeB;
    });

  return (
    <div className={`h-screen h-[100dvh] overflow-hidden bg-kds-bg text-kds-text flex flex-col pt-[120px] ${isTvMode ? 'tv-mode' : ''}`}>
      <OfflineBanner status={connectionStatus} />
      
      <KDSHeader
        clock={clock}
        connectionStatus={connectionStatus}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isTvMode={isTvMode}
        onToggleTvMode={toggleTvMode}
        onRefresh={handleRefresh}
        onLogout={() => onLogout()}
        refreshing={refreshing}
        soundEnabled={soundEnabled}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        counterName={counterName}
      />

      <div className="fixed top-[64px] left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 sm:px-6 xl:px-7 bg-kds-surface border-b border-kds-border h-[56px] select-none">
        <div className="flex items-center gap-3 xl:gap-4 min-w-0 overflow-x-auto no-scrollbar">
          <StatusFilter
            selected={statusFilter}
            onChange={setStatusFilter}
            orders={Array.from(ordersMap.values())}
          />
          <StationFilter
            selected={stationId}
            onChange={setStationId}
            orders={Array.from(ordersMap.values())}
          />
          <div className="hidden lg:block">
            <KitchenSummary orders={Array.from(ordersMap.values())} />
          </div>
        </div>
        <div className="flex items-center gap-3 xl:gap-5 shrink-0">
          <span className="text-[13px] font-medium text-kds-text-2 whitespace-nowrap hidden lg:block">
            Orders today: <span className="font-semibold text-kds-text tabular-nums">{orders.length}</span>
          </span>
          <span className="w-px h-[22px] bg-kds-border hidden lg:block" />
          <DineInToggle enabled={dineInView} onToggle={toggleDineInView} />
        </div>
      </div>

      <main className="kds-order-scroll flex-1 min-h-0 p-4 sm:p-6 xl:py-7 xl:px-8 overflow-x-hidden overflow-y-auto overscroll-contain">
        <FullscreenTip isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
        
        <ErrorBanner error={error} onRetry={() => loadOrders()} />

        {loading ? (
          <SkeletonGrid />
        ) : visibleOrders.length === 0 && !error ? (
          <EmptyKitchen connectionStatus={connectionStatus} />
        ) : (
          <div
            className={`grid auto-rows-max items-start ${
              dineInView
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-[22px]'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-[22px]'
            }`}
          >
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isUpdating={updatingIds.has(order.id)}
                isTimerUpdating={timerUpdatingIds.has(order.id)}
                onStatusChange={handleStatusChange}
                onAddNote={handleAddNote}
                onPrepTimerChange={handlePrepTimerChange}
                clock={clock}
                dineIn={dineInView}
              />
            ))}
          </div>
        )}
      </main>

      <ToastHost toasts={toasts} onRemove={removeToast} />

      {noteModal && (
        <AddNoteModal
          order={noteModal}
          onSubmit={handleNoteSubmit}
          onClose={() => setNoteModal(null)}
        />
      )}
    </div>
  );
}
