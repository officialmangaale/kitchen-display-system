import { countActive, countByStatus, countBreached } from '../utils/orderUtils';

export default function StatusFilter({ selected, onChange, orders }) {
  const tabs = [
    { id: 'all', label: 'All', count: countActive(orders) },
    { id: 'new', label: 'New', count: countByStatus(orders, 'CONFIRMED') },
    { id: 'cooking', label: 'Cooking', count: countByStatus(orders, 'PREPARING') },
    { id: 'ready', label: 'Ready', count: countByStatus(orders, 'READY') },
    { id: 'late', label: 'Late', count: countBreached(orders) },
  ];

  return (
    <nav className="status-filter" role="tablist" aria-label="Status filter">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={selected === tab.id}
          className={`status-tab status-tab--${tab.id} ${
            selected === tab.id ? 'status-tab--active' : ''
          }`}
          onClick={() => onChange(tab.id)}
        >
          <span className="status-tab__label">{tab.label}</span>
          <span className="status-tab__count">{tab.count}</span>
        </button>
      ))}
    </nav>
  );
}
