import { Volume2, VolumeX } from 'lucide-react';

export default function SoundToggle({ enabled, muted, onToggle }) {
  const label = !enabled ? 'Enable sound' : muted ? 'Unmute alerts' : 'Mute alerts';
  return (
    <button
      className="header-btn"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {enabled && !muted ? <Volume2 size={24} /> : <VolumeX size={24} />}
    </button>
  );
}
