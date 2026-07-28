import { AlertTriangle } from 'lucide-react';

export default function ConnectionStatus({ status }) {
  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';
  
  const dotClass = `w-1.5 h-1.5 rounded-full shrink-0 ${
    isConnected
      ? 'bg-kds-ready animate-pulse'
      : isReconnecting
        ? 'bg-kds-cooking animate-spin rounded-sm'
        : 'bg-kds-critical'
  }`;
  const textClass = `text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5 ${
    isConnected ? 'text-kds-ready' : isReconnecting ? 'text-kds-cooking' : 'text-kds-critical'
  }`;
  const label = isConnected ? 'LIVE' : isReconnecting ? 'RECONNECTING...' : 'OFFLINE';

  return (
    <div className={textClass}>
      <span className={dotClass} />
      <span>{label}</span>
    </div>
  );
}

export function OfflineBanner({ status }) {
  if (status === 'connected') return null;

  return (
    <div className="fixed top-[64px] left-0 right-0 z-40 bg-kds-critical-bg border-b-2 border-kds-critical px-6 py-2.5 flex items-center gap-2 animate-slide-in">
      <AlertTriangle size={16} className="text-kds-critical" />
      <span className="text-kds-text text-[14px] font-semibold">
        Connection lost. Reconnecting to the live order stream...
      </span>
    </div>
  );
}
