import { ChefHat, RefreshCw, LogOut, Loader2, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';
import { USER_NAME_KEY, USER_ROLE_KEY } from '../utils/constants';

export default function KDSHeader({
  clock,
  connectionStatus,
  isFullscreen,
  onToggleFullscreen,
  onRefresh,
  onLogout,
  refreshing,
  soundEnabled,
  soundMuted,
  onToggleSound,
}) {
  const timeStr = clock.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateStr = clock.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const userName = localStorage.getItem(USER_NAME_KEY) || 'User';
  const userRole = localStorage.getItem(USER_ROLE_KEY) || 'Staff';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 bg-kds-surface border-b border-kds-border h-[64px] select-none">
      {/* Left section (logo) */}
      <div className="flex items-center gap-3">
        <ChefHat size={28} className="text-kds-cooking" />
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] font-bold text-kds-text leading-tight">Mangaale</span>
            <span className="text-[18px] font-extrabold text-kds-cooking leading-tight">KDS</span>
          </div>
          <ConnectionStatus status={connectionStatus} />
        </div>
      </div>

      {/* Center section (clock) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span className="text-[36px] font-extrabold text-kds-text tabular-nums leading-none tracking-tight">
          {timeStr}
        </span>
        <span className="text-[13px] font-medium text-kds-text-2 tracking-widest uppercase mt-1">
          {dateStr}
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center">
        {/* User info */}
        <div className="flex flex-col items-end">
          <span className="text-[14px] font-semibold text-kds-text leading-tight">{userName}</span>
          <span className="text-[11px] text-kds-text-3 uppercase tracking-widest mt-0.5">{userRole}</span>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-[24px] bg-kds-border mx-4" />

        {/* Icon buttons row */}
        <div className="flex items-center gap-1.5">
          <button
            className="w-[36px] h-[36px] rounded-kds flex items-center justify-center bg-kds-surface-2 hover:bg-kds-surface-3 border border-kds-border text-kds-text-2 hover:text-kds-text transition-all duration-150"
            onClick={onToggleSound}
            aria-label="Toggle Sound"
            title="Mute/Unmute"
          >
            {soundEnabled && !soundMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            className="w-[36px] h-[36px] rounded-kds flex items-center justify-center bg-kds-surface-2 hover:bg-kds-surface-3 border border-kds-border text-kds-text-2 hover:text-kds-text transition-all duration-150"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh orders"
            title="Refresh"
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>

          <button
            className="w-[36px] h-[36px] rounded-kds flex items-center justify-center bg-kds-surface-2 hover:bg-kds-surface-3 border border-kds-border text-kds-text-2 hover:text-kds-text transition-all duration-150"
            onClick={onToggleFullscreen}
            aria-label="Toggle Fullscreen"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

          <button
            className="w-[36px] h-[36px] rounded-kds flex items-center justify-center bg-kds-surface-2 hover:bg-kds-surface-3 border border-kds-border text-kds-text-2 hover:text-kds-text transition-all duration-150 hover:bg-red-500/10 hover:text-kds-critical hover:border-kds-critical/30"
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
