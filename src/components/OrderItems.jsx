import { AlertCircle } from 'lucide-react';

export default function OrderItems({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="order-items order-items--empty">
        <span className="order-items__none">No items</span>
      </div>
    );
  }

  return (
    <ul className="order-items" role="list">
      {items.map((item) => (
        <li key={item.id} className="order-item">
          <span className="order-item__qty">{item.qty}×</span>
          <div className="order-item__details">
            <span className="order-item__name">{item.name}</span>
            {item.modifiers?.length > 0 && (
              <div className="order-item__modifiers">
                {item.modifiers.map((mod, i) => (
                  <span key={i} className="order-item__mod">
                    {mod}
                  </span>
                ))}
              </div>
            )}
            {item.allergens?.length > 0 && (
              <div className="order-item__allergens">
                <AlertCircle size={11} />
                {item.allergens.map((a, i) => (
                  <span key={i} className="order-item__allergen">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
