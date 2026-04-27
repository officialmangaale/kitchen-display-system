import { Wifi, WifiOff, Loader2 } from 'lucide-react';

/**
 * Connection status indicator for SSE stream.
 * States: connected, reconnecting, disconnected
 */
export default function ConnectionStatus({ status }) {
  const config = {
    connected: {
      icon: <Wifi size={14} />,
      label: 'Live',
      className: 'conn-status conn-status--live',
    },
    reconnecting: {
      icon: <Loader2 size={14} className="spin" />,
      label: 'Reconnecting',
      className: 'conn-status conn-status--reconnecting',
    },
    disconnected: {
      icon: <WifiOff size={14} />,
      label: 'Disconnected',
      className: 'conn-status conn-status--disconnected',
    },
  };

  const c = config[status] || config.disconnected;

  return (
    <div className={c.className} role="status" aria-label={`Connection: ${c.label}`}>
      {c.icon}
      <span>{c.label}</span>
    </div>
  );
}
