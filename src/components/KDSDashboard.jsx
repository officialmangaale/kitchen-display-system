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
import { isOrderLate } from '../utils/orderUtils';

export default function KDSDashboard({ token, onLogout }) {
  const clock = useClock(30000);
  const { toasts, addToast, removeToast } = useToast();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const [statusFilter, setStatusFilter] = useState('all');
  const [stationId, setStationId] = useState('all');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [noteModal, setNoteModal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
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
  } = useKDSOrders(token, 'all', addToast, handleUnauthorized); // Load all stations from backend, filter locally

  // SSE callbacks
  const sseCallbacks = {
    onConnected: useCallback(() => {
      setConnectionStatus('connected');
    }, []),
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
      setConnectionStatus('reconnecting');
    }, []),
    addToast,
  };

  useKDSStream(token, sseCallbacks);

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
  }, [toggleFullscreen]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

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

  // Filter visible orders locally (Station + Status + NOT Served)
  const visibleOrders = orders.filter((o) => {
    if (o.status === 'SERVED') return false;

    // Station Filter
    if (stationId !== 'all') {
      if (!o.stationIds || !o.stationIds.includes(stationId)) return false;
    }

    // Status Filter
    if (statusFilter === 'new' && o.status !== 'NEW') return false;
    if (statusFilter === 'cooking' && o.status !== 'ACCEPTED' && o.status !== 'PREPARING') return false;
    if (statusFilter === 'ready' && o.status !== 'READY') return false;
    if (statusFilter === 'late' && !isOrderLate(o.placedAt, o.slaMinutes)) return false;

    return true;
  });

  return (
    <div className={`kds-dashboard ${isTvMode ? 'tv-mode' : ''}`}>
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
      />

      <main className="kds-main">
        <FullscreenTip isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
        
        <div className="kds-filters">
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

        <ErrorBanner error={error} onRetry={() => loadOrders()} />

        {loading ? (
          <SkeletonGrid />
        ) : visibleOrders.length === 0 && !error ? (
          <EmptyKitchen connectionStatus={connectionStatus} />
        ) : (
          <div className="kds-grid">
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isUpdating={updatingIds.has(order.id)}
                onStatusChange={handleStatusChange}
                onAddNote={handleAddNote}
                clock={clock}
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
