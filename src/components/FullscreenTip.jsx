import { Maximize } from 'lucide-react';

export default function FullscreenTip({ isFullscreen, onToggle }) {
  if (isFullscreen) return null;

  // We only show this via CSS on large screens using a media query
  return (
    <div className="fullscreen-tip">
      <span>Tip: Use fullscreen for best kitchen display</span>
      <button onClick={onToggle} className="fullscreen-tip__btn">
        <Maximize size={14} /> Enter Fullscreen
      </button>
    </div>
  );
}
