import { LayoutGrid, Sparkles, Flame, CheckCircle2, Clock } from 'lucide-react';
import { countActive, countByStatus, countBreached } from '../utils/orderUtils';

const STATUS_ICONS = {
  all:     LayoutGrid,
  new:     Sparkles,
  cooking: Flame,
  ready:   CheckCircle2,
  late:    Clock,
};

export default function StatusFilter({ selected, onChange, orders }) {
  const tabs = [
    { id: 'all',     label: 'All',     count: countActive(orders) },
    { id: 'new',     label: 'New',     count: countByStatus(orders, 'CONFIRMED') },
    { id: 'cooking', label: 'Cooking', count: countByStatus(orders, 'PREPARING') },
    { id: 'ready',   label: 'Ready',   count: countByStatus(orders, 'READY') },
    { id: 'late',    label: 'Late',    count: countBreached(orders) },
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto py-2 no-scrollbar" role="tablist" aria-label="Status filter">
      {tabs.map((tab) => {
        const Icon = STATUS_ICONS[tab.id];
        const isActive = selected === tab.id;

        // INACTIVE state base
        let baseClass = "flex items-center gap-2 px-4 h-[32px] rounded-kds border transition-all duration-200 whitespace-nowrap ";
        let badgeClass = "inline-flex items-center justify-center min-w-[20px] h-5 rounded-full px-1.5 text-[11px] font-bold ";

        if (!isActive) {
          baseClass += "bg-kds-surface-2 border-kds-border text-kds-text-2 hover:bg-kds-surface-3 hover:border-kds-border-2 hover:text-kds-text";
          badgeClass += "bg-white/10 text-kds-text-2";
        } else {
          // ACTIVE states
          if (tab.id === 'all') {
            baseClass += "bg-blue-600/20 border-blue-500 text-blue-400";
            badgeClass += "bg-blue-600/25 text-blue-400";
          } else if (tab.id === 'new') {
            baseClass += "bg-kds-new-bg border-kds-new text-kds-new";
            badgeClass += "bg-blue-500/25 text-kds-new";
          } else if (tab.id === 'cooking') {
            baseClass += "bg-kds-cooking-bg border-kds-cooking text-kds-cooking";
            badgeClass += "bg-amber-500/25 text-kds-cooking";
          } else if (tab.id === 'ready') {
            baseClass += "bg-kds-ready-bg border-kds-ready text-kds-ready";
            badgeClass += "bg-emerald-500/25 text-kds-ready";
          } else if (tab.id === 'late') {
            baseClass += "bg-kds-late-bg border-kds-late text-kds-late";
            badgeClass += "bg-orange-500/25 text-kds-late";
          }
        }

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={baseClass}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={14} className="shrink-0" />
            <span className="text-[13px] font-semibold">{tab.label}</span>
            <span className={badgeClass}>{tab.count}</span>
          </button>
        );
      })}
    </nav>
  );
}
