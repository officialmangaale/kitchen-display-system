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
    <nav className="station-filter" role="tablist" aria-label="Station filter">
      {stations.map((station) => (
        <button
          key={station.id}
          role="tab"
          aria-selected={selected === station.id}
          className={`station-pill ${
            selected === station.id ? 'station-pill--active' : ''
          }`}
          onClick={() => onChange(station.id)}
        >
          {station.label}
        </button>
      ))}
    </nav>
  );
}
