import { Maximize, Minimize } from 'lucide-react';

export default function FullscreenButton({ isFullscreen, onToggle }) {
  return (
    <button
      className="header-btn"
      onClick={onToggle}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
    >
      {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
    </button>
  );
}
