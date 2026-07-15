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
        let typeClass = "";
        if (t.type === 'success') typeClass = "bg-kds-ready-bg border-kds-ready text-kds-ready";
        else if (t.type === 'error') typeClass = "bg-kds-critical-bg border-kds-critical text-kds-critical";
        else if (t.type === 'warning') typeClass = "bg-kds-cooking-bg border-kds-cooking text-kds-cooking";
        else typeClass = "bg-kds-new-bg border-kds-new text-kds-new";

        return (
          <div 
            key={t.id} 
            className={`flex items-start gap-3 p-4 rounded-kds border shadow-lg animate-slide-in ${typeClass}`}
          >
            <span className="shrink-0 mt-0.5">{ICONS[t.type] || ICONS.info}</span>
            <span className="flex-1 text-[14px] font-medium leading-snug text-kds-text">
              {t.message}
            </span>
            <button
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
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
