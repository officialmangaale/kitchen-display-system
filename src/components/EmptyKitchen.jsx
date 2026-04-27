import { ChefHat, Wifi } from 'lucide-react';

export default function EmptyKitchen({ connectionStatus }) {
  return (
    <div className="empty-kitchen" role="status">
      <div className="empty-kitchen__card">
        <div className="empty-kitchen__glow" />
        <div className="empty-kitchen__icon">
          <ChefHat size={56} strokeWidth={1.2} />
        </div>
        <h2 className="empty-kitchen__title">Kitchen is clear</h2>
        <p className="empty-kitchen__text">
          New orders will appear here instantly.
        </p>
        {connectionStatus && (
          <div className="empty-kitchen__status">
            <Wifi size={14} />
            <span>
              {connectionStatus === 'connected'
                ? 'Listening for new orders…'
                : 'Waiting for connection…'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
