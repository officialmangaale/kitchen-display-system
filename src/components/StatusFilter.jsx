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
    <nav className="flex gap-1.5 overflow-x-auto py-2 no-scrollbar shrink-0" role="tablist" aria-label="Status filter">
      {tabs.map((tab) => {
        const Icon = STATUS_ICONS[tab.id];
        const isActive = selected === tab.id;

        // INACTIVE state base
        let baseClass = "flex items-center gap-1.5 px-2.5 xl:px-3 h-[36px] rounded-[10px] border transition-all duration-200 whitespace-nowrap shrink-0 ";
        let badgeClass = "inline-flex items-center justify-center min-w-[20px] h-5 rounded-full px-1.5 text-[11px] font-bold tabular-nums ";
        let iconClass = "shrink-0 ";

        if (!isActive) {
          baseClass += "bg-kds-surface border-kds-border text-kds-text-2 hover:bg-kds-surface-2 hover:border-kds-border-2 hover:text-kds-text";
          badgeClass += "bg-kds-surface-3 text-kds-text-2";
          iconClass += "text-kds-text-3";
        } else {
          // ACTIVE states — soft tinted surface, status-colored icon + text
          if (tab.id === 'all') {
            baseClass += "bg-kds-new-bg border-blue-200 text-kds-new";
            badgeClass += "bg-blue-100 text-kds-new";
            iconClass += "text-kds-new";
          } else if (tab.id === 'new') {
            baseClass += "bg-kds-new-bg border-blue-200 text-kds-new";
            badgeClass += "bg-blue-100 text-kds-new";
            iconClass += "text-kds-new";
          } else if (tab.id === 'cooking') {
            baseClass += "bg-kds-cooking-bg border-amber-200 text-amber-700";
            badgeClass += "bg-amber-100 text-amber-700";
            iconClass += "text-kds-cooking";
          } else if (tab.id === 'ready') {
            baseClass += "bg-kds-ready-bg border-green-200 text-green-700";
            badgeClass += "bg-green-100 text-green-700";
            iconClass += "text-kds-ready";
          } else if (tab.id === 'late') {
            baseClass += "bg-kds-late-bg border-red-200 text-red-700";
            badgeClass += "bg-red-100 text-red-700";
            iconClass += "text-kds-late";
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
            <Icon size={15} className={iconClass} />
            <span className="text-[13px] font-semibold">{tab.label}</span>
            <span className={badgeClass}>{tab.count}</span>
          </button>
        );
      })}
    </nav>
  );
}
