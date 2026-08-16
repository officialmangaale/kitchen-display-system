import { ChefHat, Wifi } from 'lucide-react';

export default function EmptyKitchen({ connectionStatus }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]" role="status">
      <div className="relative flex flex-col items-center max-w-md w-full p-12">
        <div className="relative flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-kds-surface border border-kds-border text-kds-text-3 shadow-kds-card">
          <ChefHat size={38} strokeWidth={1.5} />
        </div>

        <h2 className="relative text-[24px] font-bold text-kds-text tracking-[-0.02em] mb-2">
          Kitchen is clear
        </h2>

        <p className="relative text-[14px] text-kds-text-2 mb-7 text-center max-w-xs">
          New orders will appear here instantly.
        </p>

        {connectionStatus && (
          <div className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full border text-[12px] font-semibold ${
            connectionStatus === 'connected'
              ? 'bg-kds-ready-bg border-green-200 text-green-700'
              : 'bg-kds-cooking-bg border-amber-200 text-amber-700'
          }`}>
            <Wifi size={14} />
            <span>
              {connectionStatus === 'connected'
                ? 'Listening for new orders…'
                : connectionStatus === 'polling'
                  ? 'Checking for orders every 15 seconds…'
                  : 'Waiting for connection…'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
