import { ChefHat, RefreshCw, LogOut, Loader2 } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';
import FullscreenButton from './FullscreenButton';
import TVModeToggle from './TVModeToggle';
import { USER_NAME_KEY, USER_ROLE_KEY } from '../utils/constants';

export default function KDSHeader({
  clock,
  connectionStatus,
  isFullscreen,
  onToggleFullscreen,
  isTvMode,
  onToggleTvMode,
  onRefresh,
  onLogout,
  refreshing,
}) {
  const timeStr = clock.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = clock.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const userName = localStorage.getItem(USER_NAME_KEY) || 'User';
  const userRole = localStorage.getItem(USER_ROLE_KEY) || 'Staff';

  return (
    <header className="kds-header" role="banner">
      <div className="kds-header__left">
        <div className="kds-header__brand">
          <ChefHat size={32} strokeWidth={1.5} />
          <div>
            <h1 className="kds-header__title">
              Mangaale <span>KDS</span>
            </h1>
            <ConnectionStatus status={connectionStatus} />
          </div>
        </div>
      </div>

      <div className="kds-header__center">
        <span className="kds-header__time">{timeStr}</span>
        <span className="kds-header__date">{dateStr}</span>
      </div>

      <div className="kds-header__right">
        <div className="kds-header__user-info">
          <span className="kds-header__user-name">{userName}</span>
          <span className="kds-header__user-role">{userRole}</span>
        </div>

        <TVModeToggle isTvMode={isTvMode} onToggle={onToggleTvMode} />

        <button
          className="header-btn"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh orders"
          title="Refresh (R)"
        >
          {refreshing ? (
            <Loader2 size={24} className="spin" />
          ) : (
            <RefreshCw size={24} />
          )}
        </button>

        <FullscreenButton
          isFullscreen={isFullscreen}
          onToggle={onToggleFullscreen}
        />

        <button
          className="header-btn header-btn--logout"
          onClick={onLogout}
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={24} />
        </button>
      </div>
    </header>
  );
}
