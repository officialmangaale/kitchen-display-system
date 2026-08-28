import { useEffect, useMemo, useRef } from 'react';
import {
  AUTO_SCROLL_NEW_ORDER_HOLD_MS,
  AUTO_SCROLL_RESUME_DELAY_MS,
  hasNewOrders,
} from '../utils/autoScroll';
import { createAutoScrollEngine } from '../utils/autoScrollEngine';

/** Keys that scroll a container, and therefore count as the staff driving. */
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Spacebar',
]);

/**
 * Status published to the header indicator.
 *
 * Kept outside React state on purpose: the dashboard re-renders every card when
 * it re-renders, and a board that moves must not be a board that re-renders.
 * Only the indicator subscribes, so a pause costs one tiny component.
 */
function createStatusStore() {
  let status = 'off';
  const listeners = new Set();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return status;
    },
    set(next) {
      if (next === status) return;
      status = next;
      listeners.forEach((listener) => listener());
    },
  };
}

/**
 * Smart auto-scroll for the order board.
 *
 * Pause -> smooth step to the next row -> pause -> ... -> hold at the bottom ->
 * smooth return to the top -> repeat. It runs only while the board actually
 * overflows, and it yields to the kitchen the instant anyone touches it.
 *
 * This hook is only wiring: the cycle lives in `createAutoScrollEngine`, and
 * everything here is one mount's worth of listeners around it. Nothing calls
 * the backend, holds an order or unmounts a card, so prep countdowns keep
 * ticking off their persisted `prep_auto_ready_at` straight through a scroll.
 *
 * @param {object}  input
 * @param {object}  input.containerRef - ref to the scrolling element
 * @param {object}  input.contentRef   - ref to the card grid inside it
 * @param {boolean} input.enabled      - false while loading, empty or modal-blocked
 * @param {string}  input.signature    - comma-joined visible order ids
 * @returns {{subscribe: function, getSnapshot: function}} indicator store
 */
export function useSmartAutoScroll({ containerRef, contentRef, enabled = true, signature = '' }) {
  const store = useMemo(() => createStatusStore(), []);
  const engineRef = useRef(null);
  const previousSignatureRef = useRef('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) {
      store.set('off');
      return undefined;
    }

    const engine = createAutoScrollEngine({
      container,
      getContent: () => contentRef.current,
      onStatus: (status) => store.set(status),
    });
    engineRef.current = engine;

    const onScroll = () => engine.handleScroll(AUTO_SCROLL_RESUME_DELAY_MS);
    const onManualInput = () => engine.interrupt(AUTO_SCROLL_RESUME_DELAY_MS);
    const onKeyDown = (event) => {
      if (SCROLL_KEYS.has(event.key)) engine.interrupt(AUTO_SCROLL_RESUME_DELAY_MS);
    };
    const onPointerOver = (event) => {
      engine.setPointerInside(Boolean(contentRef.current?.contains(event.target)));
    };
    const onPointerOut = (event) => {
      if (!contentRef.current?.contains(event.relatedTarget)) engine.setPointerInside(false);
    };
    const onPointerMove = () => engine.notePointerMove();
    const onVisibilityChange = () => {
      if (document.hidden) engine.suspendForHidden();
      else engine.start();
    };

    const passive = { passive: true };
    container.addEventListener('scroll', onScroll, passive);
    container.addEventListener('wheel', onManualInput, passive);
    container.addEventListener('touchstart', onManualInput, passive);
    container.addEventListener('touchmove', onManualInput, passive);
    container.addEventListener('pointerdown', onManualInput, passive);
    container.addEventListener('keydown', onKeyDown);
    container.addEventListener('pointerover', onPointerOver, passive);
    container.addEventListener('pointerout', onPointerOut, passive);
    container.addEventListener('pointermove', onPointerMove, passive);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Resizes, fullscreen, a column count change, a card growing a countdown
    // row: all of them are layout changes, and all of them arrive here.
    let observer = null;
    let pendingMeasure = 0;
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(() => {
        if (pendingMeasure) return;
        pendingMeasure = window.requestAnimationFrame(() => {
          pendingMeasure = 0;
          if (engine.settle()) engine.kick();
        });
      });
      observer.observe(container);
      if (contentRef.current) observer.observe(contentRef.current);
    }

    engine.start();

    return () => {
      engineRef.current = null;
      engine.stop();
      observer?.disconnect();
      if (pendingMeasure) window.cancelAnimationFrame(pendingMeasure);
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('wheel', onManualInput);
      container.removeEventListener('touchstart', onManualInput);
      container.removeEventListener('touchmove', onManualInput);
      container.removeEventListener('pointerdown', onManualInput);
      container.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('pointerover', onPointerOver);
      container.removeEventListener('pointerout', onPointerOut);
      container.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      store.set('off');
    };
  }, [containerRef, contentRef, enabled, store]);

  // The queue changed. An arrival holds the board still long enough to be read
  // alongside the existing toast and alert tone; anything else just re-measures,
  // which is what turns auto-scroll off once the board fits again.
  useEffect(() => {
    const previous = previousSignatureRef.current;
    previousSignatureRef.current = signature;
    const engine = engineRef.current;
    if (!engine) return;

    const arrived = hasNewOrders(
      previous ? previous.split(',') : [],
      signature ? signature.split(',') : [],
    );
    if (arrived) engine.hold(AUTO_SCROLL_NEW_ORDER_HOLD_MS);
    else if (engine.settle()) engine.kick();
  }, [signature]);

  return store;
}
