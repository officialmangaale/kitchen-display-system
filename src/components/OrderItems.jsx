import { useState, useCallback } from 'react';
import { AlertCircle, Check, ChevronDown, StickyNote } from 'lucide-react';
import { getItemIcon } from '../utils/itemIcons';

// Two rows are visible at a time; the rest scroll inside this fixed viewport so
// a 6-item ticket is exactly as tall as a 1-item ticket.
const VISIBLE_ROWS = 2;
const ROW_H = 58;
const LIST_H = VISIBLE_ROWS * ROW_H + 1; // + row separator

export default function OrderItems({ items, tickedItems, toggleTick, notes }) {
  const [atBottom, setAtBottom] = useState(false);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setAtBottom(scrollTop + clientHeight >= scrollHeight - 4);
  }, []);

  const list = items || [];
  const noteList = notes || [];
  const totalRows = list.length + noteList.length;
  const hasMore = totalRows > VISIBLE_ROWS;
  const hiddenCount = totalRows - VISIBLE_ROWS;

  return (
    <>
      <ul
        role="list"
        className="kds-item-scroll shrink-0 overflow-y-auto overflow-x-hidden px-5"
        style={{ height: LIST_H }}
        onScroll={hasMore ? handleScroll : undefined}
      >
        {totalRows === 0 && (
          <li className="flex items-center h-[58px] text-[13px] font-medium text-kds-text-3">
            No items
          </li>
        )}

        {list.map((item, index) => {
          const Icon = getItemIcon(item);
          const isTicked = tickedItems[item.id];
          return (
            <li
              key={item.id}
              // 40px thumbnail rail | flexible name | quantity, so every
              // quantity lands on the same x-position across rows and cards.
              className={`group grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3 items-center h-[58px] cursor-pointer transition-opacity duration-200 ${
                index > 0 ? 'border-t border-kds-border/60' : ''
              } ${isTicked ? 'opacity-50' : ''}`}
              onClick={() => toggleTick(item.id)}
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-kds-surface-2 border border-kds-border text-kds-text-3">
                <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
              </span>

              <span className="min-w-0 flex flex-col justify-center gap-1">
                <span
                  className={`text-[15px] font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
                    isTicked ? 'line-through text-kds-text-3' : 'text-kds-text'
                  }`}
                  title={item.name}
                >
                  {item.name}
                </span>

                {(item.modifiers?.length > 0 || item.allergens?.length > 0) && (
                  <span className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                    {item.allergens?.map((a, i) => (
                      <span
                        key={`a-${i}`}
                        className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.04em] px-1.5 py-px rounded bg-kds-allergen-bg text-kds-allergen border border-red-200"
                      >
                        <AlertCircle size={9} className="shrink-0" />
                        {a}
                      </span>
                    ))}
                    {item.modifiers?.map((mod, i) => (
                      <span
                        key={`m-${i}`}
                        className="shrink-0 text-[10px] font-medium px-1.5 py-px rounded bg-kds-surface-3 text-kds-text-2 truncate"
                      >
                        {mod}
                      </span>
                    ))}
                  </span>
                )}
              </span>

              <span
                className={`flex items-center justify-center min-w-[34px] h-[26px] px-1.5 rounded-md border text-[14px] font-bold tabular-nums transition-colors ${
                  isTicked
                    ? 'bg-kds-ready-bg border-green-200 text-green-700'
                    : 'bg-kds-surface border-kds-border text-kds-text-2 group-hover:border-kds-border-2'
                }`}
              >
                {isTicked ? <Check size={14} strokeWidth={3} /> : <>&times;{item.qty}</>}
              </span>
            </li>
          );
        })}

        {/* Kitchen notes scroll with the items rather than growing the card */}
        {noteList.map((n, i) => {
          const text = typeof n === 'string' ? n : n.note || JSON.stringify(n);
          return (
            <li
              key={`note-${i}`}
              className={`grid grid-cols-[40px_minmax(0,1fr)] gap-3 items-center h-[58px] ${
                list.length > 0 || i > 0 ? 'border-t border-kds-border/60' : ''
              }`}
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-kds-cooking-bg border border-amber-200 text-kds-cooking">
                <StickyNote size={19} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span
                className="min-w-0 text-[13px] font-medium text-kds-text-2 whitespace-nowrap overflow-hidden text-ellipsis"
                title={text}
              >
                {text}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Compact overflow hint, lower-right of the item container */}
      <div className="shrink-0 h-[20px] px-5 flex items-center justify-end">
        {hasMore && (
          <span
            title={`${hiddenCount} more ${hiddenCount === 1 ? 'row' : 'rows'} available, scroll the list`}
            className={`inline-flex items-center gap-0.5 text-[11px] font-medium text-kds-text-3 transition-opacity duration-200 ${
              atBottom ? 'opacity-0' : 'opacity-100'
            }`}
          >
            +{hiddenCount} more
            <ChevronDown size={12} className="shrink-0" />
          </span>
        )}
      </div>
    </>
  );
}
