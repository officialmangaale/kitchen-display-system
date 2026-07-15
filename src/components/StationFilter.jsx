import { extractStations } from '../utils/orderUtils';

export default function StationFilter({ selected, onChange, orders }) {
  const configuredStations = extractStations(orders);
  if (configuredStations.length === 0) return null;
  const stations = [
    { id: 'all', label: 'All' },
    ...configuredStations.map((id) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
    })),
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto ml-4 no-scrollbar items-center" role="tablist" aria-label="Station filter">
      {stations.map((station) => (
        <button
          key={station.id}
          role="tab"
          aria-selected={selected === station.id}
          className={`flex items-center h-[32px] px-4 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-all duration-200 ${
            selected === station.id 
              ? 'bg-kds-new text-white border-kds-new' 
              : 'bg-kds-surface-2 border-kds-border text-kds-text-2 hover:bg-kds-surface-3 hover:text-kds-text'
          }`}
          onClick={() => onChange(station.id)}
        >
          {station.label}
        </button>
      ))}
    </nav>
  );
}
