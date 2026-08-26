import { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { getItemIcon } from '../utils/itemIcons';

// Exactly two rows are ever visible. The viewport is a fixed height rather than
// a max-height so a 1-item ticket reserves the same space as a 10-item one and
// every card in the grid lines up.
const VISIBLE_ROWS = 2;
const ROW_H = 46;
const LIST_H = VISIBLE_ROWS * ROW_H + 2; // + row separators

export default function DineInItems({ items }) {
  const [atBottom, setAtBottom] = useState(false);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setAtBottom(scrollTop + clientHeight >= scrollHeight - 4);
  }, []);

  const list = items || [];
  const hasMore = list.length > VISIBLE_ROWS;
  const hiddenCount = list.length - VISIBLE_ROWS;

  return (
    <>
      <ul
        role="list"
        className="dine-in-scroll shrink-0 overflow-y-auto overflow-x-hidden px-6"
        style={{ height: LIST_H }}
        onScroll={hasMore ? handleScroll : undefined}
      >
        {list.length === 0 && (
          <li className="flex items-center h-[46px] text-[13px] font-medium text-card-ink-3">
            No items
          </li>
        )}

        {list.map((item, index) => {
          const Icon = getItemIcon(item);
          return (
            <li
              key={item.id}
              // 24px icon rail | flexible name | quantity — so quantities land
              // on the same x-position in every row of every card.
              className={`grid grid-cols-[24px_minmax(0,1fr)_auto] gap-3.5 items-center h-[46px] ${
                index > 0 ? 'border-t border-card-line' : ''
              }`}
            >
              <Icon
                strokeWidth={1.6}
                className="w-[22px] h-[22px] justify-self-center text-card-ink-3"
                aria-hidden="true"
              />
              <span
                className="min-w-0 text-[15px] font-medium text-card-ink whitespace-nowrap overflow-hidden text-ellipsis"
                title={item.name}
              >
                {item.name}
              </span>
              <span className="text-[15px] font-semibold text-card-ink-2 tabular-nums tracking-[-0.01em]">
                &times;&nbsp;{item.qty}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Compact overflow hint, bottom-right of the item section */}
      <div className="shrink-0 h-[20px] px-6 flex items-center justify-end">
        {hasMore && (
          <span
            title={`${hiddenCount} more ${hiddenCount === 1 ? 'item' : 'items'} — scroll the list`}
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
