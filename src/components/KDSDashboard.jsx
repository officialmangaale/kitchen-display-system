import { useState, useCallback, useEffect } from 'react';
import { useClock } from '../hooks/useClock';
import { useToast } from '../hooks/useToast';
import { useFullscreen } from '../hooks/useFullscreen';
import { useKDSOrders } from '../hooks/useKDSOrders';
import { useKDSStream } from '../hooks/useKDSStream';
import KDSHeader from './KDSHeader';
import StatusFilter from './StatusFilter';
import StationFilter from './StationFilter';
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

export default function KDSDashboard({ token, onLogout }) {
  const clock = useClock(30000);
  const { toasts, addToast, removeToast } = useToast();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const [statusFilter, setStatusFilter] = useState('all');
  const [stationId, setStationId] = useState('all');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [noteModal, setNoteModal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  
  // TV Mode default based on screen width
  const [isTvMode, setIsTvMode] = useState(() => {
    const saved = localStorage.getItem('kds_tv_mode');
    if (saved !== null) return saved === 'true';
    return window.innerWidth > 1400;
  });

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
    upsertOrder,
    removeOrder,
    updateStatus,
    addNote,
    refresh,
    loadOrders,
  } = useKDSOrders(
    token,
    'all',
    addToast,
    handleUnauthorized,
    handleOrderEvent,
  ); // Load all stations from backend, filter locally

  // SSE callbacks
  const sseCallbacks = {
    onConnected: useCallback(() => {
      setConnectionStatus('connected');
      refresh();
    }, [refresh]),
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
    onError: useCallback(() => {
      setConnectionStatus('polling');
    }, []),
    addToast,
  };

  useKDSStream(token, sseCallbacks);

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
    <div className={`min-h-screen bg-kds-bg text-kds-text flex flex-col pt-[120px] ${isTvMode ? 'tv-mode' : ''}`}>
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
      />

      <div className="fixed top-[64px] left-0 right-0 z-40 flex items-center justify-between px-6 bg-kds-surface border-b border-kds-border h-[56px] select-none shadow-sm">
        <div className="flex items-center overflow-x-auto no-scrollbar">
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
        </div>
        <div className="text-[13px] font-medium text-kds-text-3 whitespace-nowrap pl-4 hidden md:block">
          Orders today: {orders.length}
        </div>
      </div>

      <main className="flex-1 p-6 overflow-x-hidden">
        <FullscreenTip isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
        
        <ErrorBanner error={error} onRetry={() => loadOrders()} />

        {loading ? (
          <SkeletonGrid />
        ) : visibleOrders.length === 0 && !error ? (
          <EmptyKitchen connectionStatus={connectionStatus} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 auto-rows-max items-start">
            {visibleOrders.map((order) => (
              <div key={order.id} className="h-full">
                <OrderCard
                  order={order}
                  isUpdating={updatingIds.has(order.id)}
                  onStatusChange={handleStatusChange}
                  onAddNote={handleAddNote}
                  clock={clock}
                />
              </div>
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
