import { useSyncExternalStore } from 'react';

/**
 * A word and a dot telling the kitchen why the board is moving on its own.
 *
 * Subscribed directly to the auto-scroll engine rather than fed by props, so a
 * pause re-renders these two spans and nothing else — the order cards, and the
 * countdowns inside them, are left alone.
 *
 * Renders nothing at all when the queue fits the screen: an indicator for a
 * board that never moves is just noise on a wall.
 */
export default function AutoScrollIndicator({ store }) {
  const status = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  if (status === 'off') return null;

  const paused = status === 'paused';

  return (
    <span
      className="hidden lg:inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-kds-text-3 whitespace-nowrap"
      title={
        paused
          ? 'Automatic view paused while the board is in use'
          : 'The board is cycling through orders that do not fit the screen'
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          paused ? 'bg-kds-border-2' : 'bg-kds-ready kds-auto-dot'
        }`}
      />
      {paused ? 'Auto view paused' : 'Auto view'}
    </span>
  );
}
