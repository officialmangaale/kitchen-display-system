import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className="error-banner" role="alert">
      <div className="error-banner__content">
        <AlertTriangle size={22} />
        <div className="error-banner__text">
          <strong>Failed to load orders</strong>
          <span>{error.message || 'Something went wrong. Please try again.'}</span>
        </div>
        {onRetry && (
          <button className="error-banner__btn" onClick={onRetry} aria-label="Retry loading">
            <RefreshCw size={16} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
