import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

export default function ToastHost({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-[320px]" aria-live="polite" role="log">
      {toasts.map((t) => {
        const accentClass =
          t.type === 'success'
            ? "border-l-kds-ready text-kds-ready"
            : t.type === 'error'
              ? "border-l-kds-critical text-kds-critical"
              : t.type === 'warning'
                ? "border-l-kds-cooking text-kds-cooking"
                : "border-l-kds-new text-kds-new";

        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-kds bg-kds-surface border border-kds-border border-l-[3px] shadow-[0_12px_32px_rgba(15,23,42,0.12)] animate-slide-in ${accentClass}`}
          >
            <span className="shrink-0 mt-0.5">{ICONS[t.type] || ICONS.info}</span>
            <span className="flex-1 text-[13px] font-medium leading-snug text-kds-text">
              {t.message}
            </span>
            <button
              className="shrink-0 text-kds-text-3 hover:text-kds-text transition-colors"
              onClick={() => onRemove(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
