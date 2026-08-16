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
  counterName,
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
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-7 bg-kds-surface border-b border-kds-border h-[64px] select-none">
      {/* Left section (logo) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-[38px] h-[38px] rounded-[11px] bg-kds-cooking-bg text-kds-cooking shrink-0">
          <ChefHat size={21} strokeWidth={2} />
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold text-kds-text leading-tight tracking-[-0.02em]">Mangaale</span>
            <span className="text-[17px] font-bold text-kds-cooking leading-tight tracking-[-0.02em]">KDS</span>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus status={connectionStatus} />
            <span className="text-[10px] font-semibold text-kds-text-3 uppercase tracking-[0.06em] mt-1">
              {counterName}
            </span>
          </div>
        </div>
      </div>

      {/* Center section (clock) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span className="text-[30px] font-bold text-kds-text tabular-nums leading-none tracking-[-0.02em]">
          {timeStr}
        </span>
        <span className="text-[12px] font-medium text-kds-text-2 mt-1.5">
          {dateStr}
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center">
        {/* User info */}
        <div className="flex flex-col items-end">
          <span className="text-[14px] font-semibold text-kds-text leading-tight">{userName}</span>
          <span className="text-[10px] font-semibold text-kds-text-3 uppercase tracking-[0.07em] mt-1">{userRole}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-[28px] bg-kds-border mx-5" />

        {/* Icon buttons row */}
        <div className="flex items-center gap-2">
          <button
            className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center bg-kds-surface hover:bg-kds-surface-2 border border-kds-border hover:border-kds-border-2 text-kds-text-2 hover:text-kds-text transition-all duration-150"
            onClick={onToggleSound}
            aria-label="Toggle Sound"
            title="Mute/Unmute"
          >
            {soundEnabled && !soundMuted ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          <button
            className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center bg-kds-surface hover:bg-kds-surface-2 border border-kds-border hover:border-kds-border-2 text-kds-text-2 hover:text-kds-text transition-all duration-150 disabled:opacity-50"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh orders"
            title="Refresh"
          >
            {refreshing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          </button>

          <button
            className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center bg-kds-surface hover:bg-kds-surface-2 border border-kds-border hover:border-kds-border-2 text-kds-text-2 hover:text-kds-text transition-all duration-150"
            onClick={onToggleFullscreen}
            aria-label="Toggle Fullscreen"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>

          <button
            className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center bg-kds-surface border border-kds-border text-kds-text-2 transition-all duration-150 hover:bg-kds-critical-bg hover:text-kds-critical hover:border-red-200"
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
