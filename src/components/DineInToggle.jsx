import { Info } from 'lucide-react';

const TOOLTIP = 'Shows only order ID and items. Kitchen controls are hidden.';

export default function DineInToggle({ enabled, onToggle }) {
  return (
    <div className="flex items-center gap-2 xl:gap-2.5 whitespace-nowrap">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-kds-text-2">
        {/* Below sm the switch stands alone; its aria-label still names it. */}
        <span className="hidden sm:inline">Dine-In View</span>
        {enabled && (
          <span className="flex items-center gap-1.5 text-kds-ready font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-kds-ready" />
            Active
          </span>
        )}
      </span>

      {/* Info tooltip */}
      <span className="relative group hidden sm:flex items-center">
        <Info
          size={14}
          className="text-kds-text-3 hover:text-kds-text-2 transition-colors cursor-help"
          aria-label={TOOLTIP}
        />
        <span
          role="tooltip"
          className="pointer-events-none absolute top-[calc(100%+8px)] right-0 z-50 w-[228px] rounded-[10px] border border-kds-border bg-kds-surface px-3 py-2 text-[12px] font-normal leading-snug text-kds-text-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          {TOOLTIP}
        </span>
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle Dine-In View"
        title={TOOLTIP}
        onClick={onToggle}
        className={`relative inline-flex items-center w-[40px] h-[23px] rounded-full transition-colors duration-200 shrink-0 ${
          enabled ? 'bg-kds-ready' : 'bg-kds-border-2 hover:bg-slate-400'
        }`}
      >
        <span
          className={`absolute w-[17px] h-[17px] rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.2)] transition-transform duration-200 ${
            enabled ? 'translate-x-[20px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  );
}
