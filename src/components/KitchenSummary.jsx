import { BarChart3, Receipt, Soup, CheckCircle2, Clock } from 'lucide-react';
import { countActive, countByStatus, countBreached } from '../utils/orderUtils';

export default function KitchenSummary({ orders }) {
  const metrics = [
    { id: 'total',   label: 'Total Orders', value: countActive(orders),                   Icon: Receipt,      color: 'text-kds-text-3' },
    { id: 'cooking', label: 'Cooking',      value: countByStatus(orders, 'PREPARING'),    Icon: Soup,         color: 'text-kds-cooking' },
    { id: 'ready',   label: 'Ready',        value: countByStatus(orders, 'READY'),        Icon: CheckCircle2, color: 'text-kds-ready' },
    { id: 'late',    label: 'Late',         value: countBreached(orders),                 Icon: Clock,        color: 'text-kds-late' },
  ];

  return (
    <div
      className="flex items-center h-[36px] shrink-0 rounded-[10px] border border-kds-border bg-kds-surface-2 pl-3 2xl:pl-3.5 pr-1 whitespace-nowrap"
      aria-label="Kitchen summary"
    >
      {/* The wordmark is the first thing to go when the toolbar tightens. */}
      <span className="hidden 2xl:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-kds-text-3">
        <BarChart3 size={13} className="shrink-0" />
        Kitchen Summary
      </span>
      <span className="hidden 2xl:block w-px h-[18px] bg-kds-border mx-3.5 shrink-0" />

      {metrics.map(({ id, label, value, Icon, color }, i) => (
        <div key={id} className="flex items-center">
          {i > 0 && <span className="w-px h-[18px] bg-kds-border mx-2.5 2xl:mx-3 shrink-0" />}
          <div className="flex items-center gap-1.5 2xl:gap-2 pr-1" title={label}>
            <Icon size={14} className={`${color} shrink-0`} />
            <span className="text-[15px] 2xl:text-[16px] font-bold text-kds-text tabular-nums leading-none">{value}</span>
            {/* Labels collapse before the numbers do — counts stay readable. */}
            <span className="hidden xl:block text-[11px] font-medium text-kds-text-2 leading-none">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
