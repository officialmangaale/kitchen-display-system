import { ChefHat, Wifi } from 'lucide-react';

export default function EmptyKitchen({ connectionStatus }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]" role="status">
      <div className="relative flex flex-col items-center max-w-md w-full p-12">
        {/* Decorative glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-kds-new/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-kds-surface-2 border border-kds-border text-kds-text-3">
          <ChefHat size={48} strokeWidth={1.5} />
        </div>
        
        <h2 className="relative text-[32px] font-black text-kds-text tracking-tight mb-3">
          Kitchen is clear
        </h2>
        
        <p className="relative text-[16px] text-kds-text-2 mb-8 text-center max-w-xs">
          New orders will appear here instantly.
        </p>
        
        {connectionStatus && (
          <div className={`relative flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-bold uppercase tracking-wider ${
            connectionStatus === 'connected' 
              ? 'bg-kds-ready/10 border-kds-ready/20 text-kds-ready' 
              : 'bg-kds-cooking/10 border-kds-cooking/20 text-kds-cooking animate-pulse'
          }`}>
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
