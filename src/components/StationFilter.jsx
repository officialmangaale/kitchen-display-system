import { DEFAULT_STATIONS } from '../utils/constants';
import { extractStations } from '../utils/orderUtils';

export default function StationFilter({ selected, onChange, orders }) {
  const dynamicIds = extractStations(orders);
  const defaultIds = DEFAULT_STATIONS.map((s) => s.id);

  const stations = [...DEFAULT_STATIONS];
  dynamicIds.forEach((id) => {
    if (!defaultIds.includes(id)) {
      stations.push({ id, label: id.charAt(0).toUpperCase() + id.slice(1) });
    }
  });

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
