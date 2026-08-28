import {
  AUTO_SCROLL_BOTTOM_DWELL_MS,
  AUTO_SCROLL_DWELL_MS,
  AUTO_SCROLL_HOLD_RECHECK_MS,
  AUTO_SCROLL_HOVER_ACTIVE_MS,
  AUTO_SCROLL_TOP_DWELL_MS,
  MANUAL_SCROLL_EPSILON_PX,
  computeRowStops,
  easeInOutCubic,
  hasBoardOverflow,
  isBottomStop,
  nextStopFrom,
  returnDurationMs,
  stepDurationMs,
} from './autoScroll.js';

/**
 * The auto-scroll cycle itself: measure, dwell, step, hold at the bottom,
 * return to the top, repeat — and get out of the way when the kitchen takes
 * over.
 *
 * It talks to a scroll element but knows nothing about React, and every source
 * of time (clock, timer, animation frame) is injected. That is what lets the
 * whole state machine be driven deterministically in a test: the browser
 * supplies the real ones, `autoScrollEngine.test.js` supplies fake ones.
 *
 * Exactly one timer and one animation frame are ever outstanding.
 */
export function createAutoScrollEngine({
  container,
  getContent = () => null,
  onStatus = () => {},
  now = () => Date.now(),
  frameTime = () => performance.now(),
  setTimer = (fn, ms) => window.setTimeout(fn, ms),
  clearTimer = (id) => window.clearTimeout(id),
  requestFrame = (fn) => window.requestAnimationFrame(fn),
  cancelFrame = (id) => window.cancelAnimationFrame(id),
  isHidden = () => document.hidden,
  reducedMotion = () =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  readPaddingTop = () => parseFloat(window.getComputedStyle(container).paddingTop) || 0,
}) {
  let disposed = false;
  let timer = 0;
  let frame = 0;
  let animating = false;
  let suspendedUntil = 0;
  let lastScrollTop = container.scrollTop;
  let pointerInside = false;
  let lastPointerMoveAt = 0;

  const dropTimer = () => {
    if (timer) {
      clearTimer(timer);
      timer = 0;
    }
  };

  const dropAnimation = () => {
    if (frame) {
      cancelFrame(frame);
      frame = 0;
    }
    if (animating) {
      // Hand smooth scrolling back to the stylesheet.
      container.style.scrollBehavior = '';
      animating = false;
    }
  };

  const schedule = (delay) => {
    dropTimer();
    timer = setTimer(run, Math.max(0, delay));
  };

  /**
   * Read the live layout: how far the board can travel, and where each row of
   * cards begins. Measured rather than assumed, so 2, 3, 4 or 5 columns and any
   * card height behave the same.
   */
  const measure = () => {
    if (!hasBoardOverflow(container.scrollHeight, container.clientHeight)) {
      return { overflowing: false, maxScroll: 0, stops: [0] };
    }

    const maxScroll = container.scrollHeight - container.clientHeight;
    const content = getContent();
    const rowTops = [];
    if (content) {
      // Content-space origin of the scroller, so a row's top is independent of
      // where the board happens to be scrolled at this instant.
      const origin =
        container.getBoundingClientRect().top + container.clientTop - container.scrollTop;
      let previousTop = null;
      for (const card of content.children) {
        const top = Math.round(card.getBoundingClientRect().top - origin);
        if (previousTop === null || top - previousTop > 1) {
          rowTops.push(top);
          previousTop = top;
        }
      }
    }

    return {
      overflowing: true,
      maxScroll,
      stops: computeRowStops({ rowTops, paddingTop: readPaddingTop(), maxScroll }),
    };
  };

  const animateTo = (target, duration, done) => {
    const from = container.scrollTop;
    const distance = target - from;
    if (Math.abs(distance) < 1) {
      done();
      return;
    }
    if (reducedMotion()) {
      container.scrollTop = target;
      lastScrollTop = container.scrollTop;
      done();
      return;
    }

    animating = true;
    // The stylesheet sets `scroll-behavior: smooth` on this element, which would
    // apply its own easing to every frame written here. Ours owns the motion for
    // its duration and then gives the rule back.
    container.style.scrollBehavior = 'auto';
    const startedAt = frameTime();

    const step = (stamp) => {
      if (disposed) return;
      const progress = Math.min(1, (stamp - startedAt) / duration);
      container.scrollTop = from + distance * easeInOutCubic(progress);
      if (progress < 1) {
        frame = requestFrame(step);
        return;
      }
      frame = 0;
      animating = false;
      container.style.scrollBehavior = '';
      // Read back rather than trusting the target: the browser clamps if the
      // queue shrank mid-flight.
      lastScrollTop = container.scrollTop;
      done();
    };

    frame = requestFrame(step);
  };

  /**
   * A hand is on this card: hovering it with a pointer that is still moving, or
   * holding a timer menu open. Moving it away now would be the board fighting
   * the kitchen.
   */
  const isHeld = (at) => {
    if (pointerInside && at - lastPointerMoveAt < AUTO_SCROLL_HOVER_ACTIVE_MS) return true;
    const content = getContent();
    return Boolean(content?.querySelector?.('[aria-expanded="true"]'));
  };

  /** The whole cycle, one decision per call. */
  function run() {
    timer = 0;
    if (disposed) return;
    if (isHidden()) {
      // Nothing to read on a hidden tab; becoming visible restarts the cycle.
      onStatus('paused');
      return;
    }

    const { overflowing, maxScroll, stops } = measure();
    if (!overflowing) {
      // Everything fits. No timer, no movement, nothing to indicate.
      onStatus('off');
      return;
    }

    const at = now();
    if (at < suspendedUntil) {
      onStatus('paused');
      schedule(suspendedUntil - at);
      return;
    }
    if (isHeld(at)) {
      onStatus('paused');
      schedule(AUTO_SCROLL_HOLD_RECHECK_MS);
      return;
    }

    onStatus('running');
    const scrollTop = container.scrollTop;
    const next = nextStopFrom(scrollTop, stops);

    if (next === null) {
      animateTo(0, returnDurationMs(scrollTop), () => schedule(AUTO_SCROLL_TOP_DWELL_MS));
      return;
    }

    animateTo(next, stepDurationMs(next - scrollTop), () =>
      schedule(isBottomStop(next, maxScroll) ? AUTO_SCROLL_BOTTOM_DWELL_MS : AUTO_SCROLL_DWELL_MS),
    );
  }

  /**
   * The staff took over. Drop whatever the board was doing mid-frame — never
   * finish an animation against someone's hand — and stay out of the way.
   */
  const interrupt = (quietMs) => {
    if (disposed) return;
    dropAnimation();
    lastScrollTop = container.scrollTop;
    suspendedUntil = Math.max(suspendedUntil, now() + quietMs);
    onStatus('paused');
    schedule(suspendedUntil - now());
  };

  return {
    /** Begin the cycle with a dwell, so nothing moves the instant it starts. */
    start() {
      if (disposed) return;
      schedule(AUTO_SCROLL_DWELL_MS);
    },

    interrupt,

    /**
     * Delay the next step without seizing the board: used when a ticket
     * arrives, where cutting a step short would strand a row half-visible.
     */
    hold(quietMs) {
      if (disposed) return;
      suspendedUntil = Math.max(suspendedUntil, now() + quietMs);
      if (animating) return;
      onStatus('paused');
      schedule(suspendedUntil - now());
    },

    /** Re-measure after a layout or queue change; start the cycle if idle. */
    kick() {
      if (disposed || animating || timer) return;
      schedule(AUTO_SCROLL_DWELL_MS);
    },

    /**
     * The queue shrank back to one screen: stop cleanly rather than idle at a
     * scroll offset the content no longer has.
     */
    settle() {
      if (disposed) return false;
      if (measure().overflowing) return true;
      dropAnimation();
      dropTimer();
      onStatus('off');
      return false;
    },

    /** Distinguish a human scrolling from the frames this engine just wrote. */
    handleScroll(quietMs) {
      if (disposed || animating) return;
      const top = container.scrollTop;
      const moved = Math.abs(top - lastScrollTop) > MANUAL_SCROLL_EPSILON_PX;
      lastScrollTop = top;
      if (moved) interrupt(quietMs);
    },

    setPointerInside(inside) {
      pointerInside = inside;
      if (inside) lastPointerMoveAt = now();
    },

    notePointerMove() {
      if (pointerInside) lastPointerMoveAt = now();
    },

    suspendForHidden() {
      dropAnimation();
      dropTimer();
      onStatus('paused');
    },

    stop() {
      disposed = true;
      dropTimer();
      dropAnimation();
    },

    /** Test and diagnostic surface only. */
    inspect() {
      return { animating, suspendedUntil, hasTimer: Boolean(timer) };
    },
  };
}
