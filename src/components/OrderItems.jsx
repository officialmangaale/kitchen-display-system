import { AlertCircle } from 'lucide-react';

export default function OrderItems({ items, tickedItems, toggleTick }) {
  if (!items || items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-kds-text-3 text-[14px] font-medium italic">
        No items
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar" role="list">
      {items.map((item) => {
        const isTicked = tickedItems[item.id];
        return (
          <li 
            key={item.id} 
            className={`group relative flex items-start p-3 rounded-kds border cursor-pointer transition-all duration-200 ${
              isTicked 
                ? 'bg-kds-surface-3/50 border-kds-border/50 opacity-60' 
                : 'bg-kds-surface border-kds-border hover:bg-kds-surface-2 hover:border-kds-border-2 active:scale-[0.98]'
            }`}
            onClick={() => toggleTick(item.id)}
          >
            <div className={`flex items-center justify-center w-[36px] h-[36px] rounded-full shrink-0 mr-4 font-bold text-[18px] transition-colors ${
              isTicked ? 'bg-kds-border text-kds-text-3' : 'bg-kds-surface-3 text-kds-text'
            }`}>
              {item.qty}
            </div>

            <div className={`flex-1 min-w-0 flex flex-col justify-center transition-all ${
              isTicked ? 'line-through text-kds-text-3' : 'text-kds-text'
            }`}>
              <span className="text-[18px] font-semibold leading-tight mb-1 truncate pr-8">
                {item.name}
              </span>

              {item.modifiers?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {item.modifiers.map((mod, i) => (
                    <span 
                      key={i} 
                      className={`text-[12px] font-medium px-2 py-0.5 rounded ${
                        isTicked ? 'bg-kds-border/50 text-kds-text-3' : 'bg-kds-surface-3 text-kds-text-2'
                      }`}
                    >
                      {mod}
                    </span>
                  ))}
                </div>
              )}

              {item.allergens?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {item.allergens.map((a, i) => (
                    <span 
                      key={i} 
                      className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isTicked ? 'bg-kds-border/50 text-kds-text-3' : 'bg-kds-allergen-bg text-kds-allergen'
                      }`}
                    >
                      <AlertCircle size={10} />
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Custom checkbox indicator */}
            <div className={`absolute top-1/2 -translate-y-1/2 right-4 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              isTicked ? 'bg-kds-ready border-kds-ready' : 'border-kds-border group-hover:border-kds-text-3'
            }`}>
               {isTicked && (
                 <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                 </svg>
               )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
