import { useState, useCallback } from 'react';
import { AlertCircle, Check, ChevronDown, MessageSquare, StickyNote } from 'lucide-react';
import { getItemIcon } from '../utils/itemIcons';

// Two rows are visible at a time; the rest scroll inside this fixed viewport so
// a 6-item ticket is exactly as tall as a 1-item ticket.
const VISIBLE_ROWS = 2;
const ROW_H = 58;
const LIST_H = VISIBLE_ROWS * ROW_H + 1; // + row separator

const ROW_CLASS = 'grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3.5 items-center h-[58px]';

export default function OrderItems({ items, tickedItems, toggleTick, notes, instructions }) {
  const [atBottom, setAtBottom] = useState(false);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setAtBottom(scrollTop + clientHeight >= scrollHeight - 4);
  }, []);

  const list = items || [];
  const noteList = notes || [];
  const instructionText = String(instructions || '').trim();
  // The customer's instructions scroll with the items rather than occupying a
  // strip of their own, which is what keeps the card inside its fixed height.
  const totalRows = list.length + noteList.length + (instructionText ? 1 : 0);
  const hasMore = totalRows > VISIBLE_ROWS;
  const hiddenCount = totalRows - VISIBLE_ROWS;

  let rowIndex = 0;
  const separator = () => (rowIndex++ > 0 ? 'border-t border-card-line' : '');

  return (
    <>
      <ul
        role="list"
        className="kds-item-scroll shrink-0 overflow-y-auto overflow-x-hidden px-6"
        style={{ height: LIST_H }}
        onScroll={hasMore ? handleScroll : undefined}
      >
        {totalRows === 0 && (
          <li className="flex items-center h-[58px] text-[13px] font-medium text-card-ink-3">
            No items
          </li>
        )}

        {instructionText && (
          <li className={`${ROW_CLASS} ${separator()}`}>
            <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-card-veil-2 text-card-cooking">
              <MessageSquare size={17} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span
              className="min-w-0 col-span-2 text-[13px] font-medium text-card-ink-2 whitespace-nowrap overflow-hidden text-ellipsis"
              title={instructionText}
            >
              {instructionText}
            </span>
          </li>
        )}

        {list.map((item) => {
          const Icon = getItemIcon(item);
          const isTicked = tickedItems[item.id];
          return (
            <li
              key={item.id}
              // 36px icon rail | flexible name | quantity — so every quantity
              // lands on the same x-position across rows and cards.
              className={`group ${ROW_CLASS} ${separator()} cursor-pointer transition-opacity duration-200 ${
                isTicked ? 'opacity-45' : ''
              }`}
              onClick={() => toggleTick(item.id)}
            >
              <span
                className={`flex items-center justify-center w-9 h-9 rounded-[10px] transition-colors duration-200 ${
                  isTicked
                    ? 'bg-card-veil-2 text-card-ready'
                    : 'bg-card-veil text-card-ink-3'
                }`}
              >
                {isTicked ? (
                  <Check size={17} strokeWidth={2.6} />
                ) : (
                  <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
                )}
              </span>

              <span className="min-w-0 flex flex-col justify-center gap-1">
                <span
                  className={`text-[15px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
                    isTicked ? 'line-through text-card-ink-3' : 'text-card-ink'
                  }`}
                  title={item.name}
                >
                  {item.name}
                </span>

                {(item.modifiers?.length > 0 || item.allergens?.length > 0) && (
                  <span className="flex items-center gap-2 min-w-0 overflow-hidden text-[10px]">
                    {item.allergens?.map((a, i) => (
                      <span
                        key={`a-${i}`}
                        className="inline-flex items-center gap-1 shrink-0 font-semibold uppercase tracking-[0.08em] text-card-late"
                      >
                        <AlertCircle size={9} className="shrink-0" />
                        {a}
                      </span>
                    ))}
                    {item.modifiers?.map((mod, i) => (
                      <span
                        key={`m-${i}`}
                        className="shrink-0 font-medium tracking-[0.04em] text-card-ink-3 truncate"
                      >
                        {mod}
                      </span>
                    ))}
                  </span>
                )}
              </span>

              {/* Quantity as typography, not a box — the tick state is already
                  carried by the rail icon and the dimmed row. */}
              <span
                className={`text-[16px] font-semibold tabular-nums tracking-[-0.01em] ${
                  isTicked ? 'text-card-ink-3' : 'text-card-ink-2'
                }`}
              >
                &times;&nbsp;{item.qty}
              </span>
            </li>
          );
        })}

        {/* Kitchen notes scroll with the items rather than growing the card */}
        {noteList.map((n, i) => {
          const text = typeof n === 'string' ? n : n.note || JSON.stringify(n);
          return (
            <li key={`note-${i}`} className={`${ROW_CLASS} ${separator()}`}>
              <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-card-veil-2 text-card-ink-2">
                <StickyNote size={17} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span
                className="min-w-0 col-span-2 text-[13px] font-medium text-card-ink-2 whitespace-nowrap overflow-hidden text-ellipsis"
                title={text}
              >
                {text}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Compact overflow hint, lower-right of the item container */}
      <div className="shrink-0 h-[20px] px-6 flex items-center justify-end">
        {hasMore && (
          <span
            title={`${hiddenCount} more ${hiddenCount === 1 ? 'row' : 'rows'} available, scroll the list`}
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-card-ink-3 transition-opacity duration-200 ${
              atBottom ? 'opacity-0' : 'opacity-100'
            }`}
          >
            +{hiddenCount} more
            <ChevronDown size={11} className="shrink-0" />
          </span>
        )}
      </div>
    </>
  );
}
