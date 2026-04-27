import { MonitorPlay, MonitorOff } from 'lucide-react';

export default function TVModeToggle({ isTvMode, onToggle }) {
  return (
    <button
      className={`header-btn ${isTvMode ? 'header-btn--active' : ''}`}
      onClick={onToggle}
      aria-label={isTvMode ? 'Disable TV Mode' : 'Enable TV Mode'}
      title="Toggle TV Mode"
    >
      {isTvMode ? <MonitorPlay size={18} /> : <MonitorOff size={18} />}
    </button>
  );
}
