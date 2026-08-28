import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUTO_SCROLL_BOTTOM_DWELL_MS,
  AUTO_SCROLL_DWELL_MS,
  AUTO_SCROLL_NEW_ORDER_HOLD_MS,
  AUTO_SCROLL_RESUME_DELAY_MS,
  STEP_DURATION_MAX_MS,
} from './autoScroll.js';
import { createAutoScrollEngine } from './autoScrollEngine.js';

/**
 * A virtual clock driving the engine's timers and frames, so a twenty-minute
 * shift on a kitchen wall runs in a millisecond and always the same way.
 */
function createScheduler() {
  let time = 0;
  let nextId = 1;
  const timers = new Map();
  let frames = new Map();

  return {
    now: () => time,
    peakTimers: 0,
    setTimer(fn, ms) {
      const id = nextId++;
      timers.set(id, { at: time + ms, fn });
      this.peakTimers = Math.max(this.peakTimers, timers.size);
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    requestFrame(fn) {
      const id = nextId++;
      frames.set(id, fn);
      return id;
    },
    cancelFrame(id) {
      frames.delete(id);
    },
    pending() {
      return { timers: timers.size, frames: frames.size };
    },
    advance(ms, onTick = () => {}) {
      const target = time + ms;
      while (time < target) {
        time += Math.min(16, target - time);

        const due = frames;
        frames = new Map();
        for (const fn of due.values()) fn(time);

        let fired = true;
        while (fired) {
          fired = false;
          for (const [id, timer] of [...timers.entries()]) {
            if (timer.at <= time) {
              timers.delete(id);
              fired = true;
              timer.fn();
            }
          }
        }

        onTick(time);
      }
    },
  };
}

/**
 * A board of fixed-height cards in a fixed-height scroller — the geometry
 * `KDSDashboard` renders, with the browser's scrollTop clamping included.
 */
function createBoard({
  rows,
  columns = 3,
  viewportHeight = 900,
  cardHeight = 400,
  gap = 22,
  padding = 28,
}) {
  const pitch = cardHeight + gap;
  const state = { rows, viewportHeight, scrollTop: 0, menuOpen: false };

  const contentHeight = () =>
    padding * 2 + state.rows * cardHeight + Math.max(0, state.rows - 1) * gap;
  const maxScroll = () => Math.max(0, contentHeight() - state.viewportHeight);

  const container = {
    clientTop: 0,
    style: {},
    get clientHeight() {
      return state.viewportHeight;
    },
    get scrollHeight() {
      return contentHeight();
    },
    get scrollTop() {
      return state.scrollTop;
    },
    set scrollTop(value) {
      state.scrollTop = Math.min(maxScroll(), Math.max(0, value));
    },
    getBoundingClientRect: () => ({ top: 0 }),
  };

  const content = {
    get children() {
      return Array.from({ length: state.rows * columns }, (_, index) => ({
        getBoundingClientRect: () => ({
          top: padding + Math.floor(index / columns) * pitch - state.scrollTop,
        }),
      }));
    },
    querySelector: (selector) =>
      state.menuOpen && selector === '[aria-expanded="true"]' ? {} : null,
  };

  return {
    container,
    content,
    state,
    pitch,
    padding,
    maxScroll,
    /** Browsers clamp a scroll offset the content no longer has. */
    reclamp() {
      state.scrollTop = Math.min(maxScroll(), Math.max(0, state.scrollTop));
    },
    /** An order completed or was cancelled: the queue shortens under the board. */
    setRows(next) {
      state.rows = next;
      this.reclamp();
    },
  };
}

function mount(board, overrides = {}) {
  const scheduler = createScheduler();
  const statuses = [];
  const engine = createAutoScrollEngine({
    container: board.container,
    getContent: () => board.content,
    onStatus: (status) => statuses.push(status),
    now: scheduler.now,
    frameTime: scheduler.now,
    setTimer: (fn, ms) => scheduler.setTimer(fn, ms),
    clearTimer: (id) => scheduler.clearTimer(id),
    requestFrame: (fn) => scheduler.requestFrame(fn),
    cancelFrame: (id) => scheduler.cancelFrame(id),
    isHidden: () => false,
    reducedMotion: () => false,
    readPaddingTop: () => board.padding,
    ...overrides,
  });
  return { engine, scheduler, statuses };
}

/**
 * Where the board came to rest, and for how long.
 *
 * A rest is a plateau of at least a second: the tail of an ease-out crawls
 * slowly enough that two 16ms samples can round to the same pixel, and that is
 * motion, not a stop a cook could read during.
 */
function restingPoints(samples, sampleMs = 16, minimumRestMs = 1_000) {
  const minimumRun = Math.round(minimumRestMs / sampleMs);
  const stops = [];
  let runStart = 0;
  for (let index = 1; index <= samples.length; index += 1) {
    if (index < samples.length && samples[index] === samples[runStart]) continue;
    if (index - runStart >= minimumRun) {
      stops.push({ at: samples[runStart], ms: (index - runStart) * sampleMs });
    }
    runStart = index;
  }
  return stops;
}

test('a board that fits the screen never moves and never announces itself', () => {
  // Two rows of 400px cards inside 900px: 878px of content, nothing hidden.
  const board = createBoard({ rows: 2 });
  const { engine, scheduler, statuses } = mount(board);
  engine.start();

  scheduler.advance(60_000);

  assert.equal(board.container.scrollTop, 0, 'the board stayed stationary');
  assert.equal(statuses.at(-1), 'off');
  assert.deepEqual(scheduler.pending(), { timers: 0, frames: 0 }, 'nothing left running');
});

test('one row below the fold: the board dwells, then steps exactly one row', () => {
  const board = createBoard({ rows: 3 });
  const { engine, scheduler } = mount(board);
  engine.start();

  scheduler.advance(AUTO_SCROLL_DWELL_MS - 200);
  assert.equal(board.container.scrollTop, 0, 'nothing moves during the dwell');

  scheduler.advance(200 + STEP_DURATION_MAX_MS + 32);
  assert.equal(
    board.container.scrollTop,
    board.maxScroll(),
    'a single hidden row is reached in one step',
  );
});

test('many rows below the fold: pause, one row, pause, one row, then the bottom', () => {
  // Six rows, two visible: four row-steps to the end of the queue.
  const board = createBoard({ rows: 6 });
  const { engine, scheduler } = mount(board);
  engine.start();

  const samples = [];
  scheduler.advance(45_000, () => samples.push(Math.round(board.container.scrollTop)));

  const stops = restingPoints(samples);
  assert.ok(stops.length >= 4, `expected several resting points, saw ${stops.length}`);

  const bottom = board.maxScroll();
  for (const stop of stops) {
    // Every rest is a row boundary or the bottom — never a sliced card.
    assert.ok(
      stop.at % board.pitch === 0 || Math.abs(stop.at - bottom) <= 1,
      `${stop.at} is neither a row boundary nor the bottom`,
    );
    // And every rest is long enough to read the cards it is showing.
    assert.ok(stop.ms >= 4_000, `a rest at ${stop.at} lasted only ${stop.ms}ms`);
  }

  // The first pass down the queue: one row per step, all the way to the end.
  const positions = stops.map((stop) => stop.at);
  const wrapped = positions.findIndex((stop, index) => index > 0 && stop < positions[index - 1]);
  const descent = wrapped === -1 ? positions : positions.slice(0, wrapped);

  assert.equal(descent[0], 0, 'the pass did not begin at the top');
  for (let index = 1; index < descent.length; index += 1) {
    const travelled = descent[index] - descent[index - 1];
    assert.ok(travelled > 0, 'the board went backwards mid-pass');
    assert.ok(travelled <= board.pitch + 1, `a step covered ${travelled}px, more than one row`);
  }
  assert.equal(descent.at(-1), bottom, 'the last card was reached');
  assert.ok(wrapped !== -1, 'the board never turned around to start again');
});

test('the bottom is held, then the board returns to the top smoothly and repeats', () => {
  const board = createBoard({ rows: 5 });
  const { engine, scheduler } = mount(board);
  engine.start();

  const bottom = board.maxScroll();
  let reachedBottomAt = null;
  let leftBottomAt = null;
  let backAtTopAt = null;
  const returnPath = [];

  scheduler.advance(90_000, (time) => {
    const top = Math.round(board.container.scrollTop);
    if (reachedBottomAt === null && top === bottom) reachedBottomAt = time;
    if (reachedBottomAt !== null && leftBottomAt === null && top < bottom) leftBottomAt = time;
    if (leftBottomAt !== null && backAtTopAt === null) {
      returnPath.push(top);
      if (top === 0) backAtTopAt = time;
    }
  });

  assert.ok(reachedBottomAt !== null, 'the board never reached the last card');
  assert.ok(
    leftBottomAt - reachedBottomAt >= AUTO_SCROLL_BOTTOM_DWELL_MS - 32,
    'the last cards were not held long enough to read',
  );
  assert.ok(backAtTopAt !== null, 'the board never came back to the top');
  assert.ok(
    returnPath.length > 10,
    'the return to the top was a jump rather than an animation',
  );
  assert.ok(
    backAtTopAt - leftBottomAt >= 800,
    'the return was faster than the readable band allows',
  );

  // And the cycle starts over rather than stopping at the top.
  const afterReturn = board.container.scrollTop;
  scheduler.advance(30_000);
  assert.ok(
    board.container.scrollTop !== afterReturn || afterReturn > 0,
    'the cycle did not restart',
  );
});

test('a wheel mid-step stops the board dead and keeps it still for the quiet period', () => {
  const board = createBoard({ rows: 6 });
  const { engine, scheduler } = mount(board);
  engine.start();

  // Interrupt part-way through the first step.
  scheduler.advance(AUTO_SCROLL_DWELL_MS + 300);
  const interruptedAt = board.container.scrollTop;
  assert.ok(interruptedAt > 0 && interruptedAt < board.pitch, 'expected a step in flight');

  engine.interrupt(AUTO_SCROLL_RESUME_DELAY_MS);
  scheduler.advance(200);
  assert.equal(
    Math.round(board.container.scrollTop),
    Math.round(interruptedAt),
    'the board kept animating against the hand on it',
  );

  scheduler.advance(AUTO_SCROLL_RESUME_DELAY_MS - 1_000);
  assert.equal(
    Math.round(board.container.scrollTop),
    Math.round(interruptedAt),
    'the board resumed before the quiet period was over',
  );

  scheduler.advance(AUTO_SCROLL_DWELL_MS + STEP_DURATION_MAX_MS + 2_000);
  assert.ok(board.container.scrollTop > interruptedAt, 'the board never resumed');
  assert.equal(
    board.container.scrollTop % board.pitch,
    0,
    'resuming realigned onto a row boundary',
  );
});

test('staff scrolling by hand is detected and never fought', () => {
  const board = createBoard({ rows: 6 });
  const { engine, scheduler } = mount(board);
  engine.start();

  board.container.scrollTop = 300;
  engine.handleScroll(AUTO_SCROLL_RESUME_DELAY_MS);

  scheduler.advance(AUTO_SCROLL_RESUME_DELAY_MS - 500);
  assert.equal(board.container.scrollTop, 300, 'the board moved while the staff were scrolling');

  scheduler.advance(AUTO_SCROLL_DWELL_MS + STEP_DURATION_MAX_MS + 1_500);
  assert.ok(board.container.scrollTop > 300, 'the board never resumed after the staff stopped');
});

test('a step the engine drove is not mistaken for a person scrolling', () => {
  const board = createBoard({ rows: 6 });
  const { engine, scheduler, statuses } = mount(board);
  engine.start();

  scheduler.advance(AUTO_SCROLL_DWELL_MS + STEP_DURATION_MAX_MS + 100, () => {
    // The browser fires a scroll event for every frame the engine writes.
    engine.handleScroll(AUTO_SCROLL_RESUME_DELAY_MS);
  });

  assert.equal(board.container.scrollTop, board.pitch, 'the step did not complete');
  assert.ok(statuses.includes('running'));
});

test('an arriving ticket holds the board still without stranding a half-row', () => {
  const board = createBoard({ rows: 6 });
  const { engine, scheduler } = mount(board);
  engine.start();

  // A ticket lands mid-step: the step must finish, then the board waits.
  scheduler.advance(AUTO_SCROLL_DWELL_MS + 300);
  engine.hold(AUTO_SCROLL_NEW_ORDER_HOLD_MS);
  scheduler.advance(STEP_DURATION_MAX_MS);

  assert.equal(
    board.container.scrollTop,
    board.pitch,
    'the in-flight step was cut short, leaving a row half-visible',
  );

  const settled = board.container.scrollTop;
  scheduler.advance(AUTO_SCROLL_NEW_ORDER_HOLD_MS - 1_500);
  assert.equal(board.container.scrollTop, settled, 'the board moved while the ticket was new');

  scheduler.advance(AUTO_SCROLL_DWELL_MS + STEP_DURATION_MAX_MS + 2_000);
  assert.ok(board.container.scrollTop > settled, 'the cycle never resumed after the arrival');
});

test('a hand hovering a card holds the cycle until the pointer goes quiet', () => {
  const board = createBoard({ rows: 6 });
  const { engine, scheduler } = mount(board);
  engine.start();

  engine.setPointerInside(true);
  scheduler.advance(AUTO_SCROLL_DWELL_MS + 2_000, () => engine.notePointerMove());
  assert.equal(board.container.scrollTop, 0, 'a card moved out from under the pointer');

  // The hand leaves; the cycle picks up again.
  engine.setPointerInside(false);
  scheduler.advance(AUTO_SCROLL_DWELL_MS + STEP_DURATION_MAX_MS + 2_000);
  assert.ok(board.container.scrollTop > 0, 'the cycle never resumed after the pointer left');
});

test('an open prep-timer menu pins the board it belongs to', () => {
  const board = createBoard({ rows: 6 });
  const { engine, scheduler } = mount(board);
  engine.start();

  board.state.menuOpen = true;
  scheduler.advance(30_000);
  assert.equal(board.container.scrollTop, 0, 'the board moved out from under an open menu');

  board.state.menuOpen = false;
  scheduler.advance(AUTO_SCROLL_DWELL_MS + STEP_DURATION_MAX_MS + 2_000);
  assert.ok(board.container.scrollTop > 0, 'the cycle never resumed after the menu closed');
});

test('orders completing until the queue fits stops auto-scroll and empties no space', () => {
  const board = createBoard({ rows: 6 });
  const { engine, scheduler, statuses } = mount(board);
  engine.start();

  scheduler.advance(25_000);
  assert.ok(board.container.scrollTop > 0, 'expected the board to have travelled');

  // Cooks clear the queue down to a single screen.
  board.setRows(2);
  assert.equal(engine.settle(), false, 'the engine kept running for a board that now fits');

  assert.equal(statuses.at(-1), 'off');
  assert.equal(board.container.scrollTop, 0, 'the board was left scrolled into empty space');

  scheduler.advance(60_000);
  assert.equal(board.container.scrollTop, 0, 'the board moved after auto-scroll turned off');
  assert.deepEqual(scheduler.pending(), { timers: 0, frames: 0 }, 'a timer outlived the cycle');
});

test('an order completing while at the bottom leaves the board on real content', () => {
  const board = createBoard({ rows: 6 });
  const { engine, scheduler } = mount(board);
  engine.start();

  scheduler.advance(40_000);
  board.setRows(4);
  assert.equal(engine.settle(), true, 'still overflowing, so the cycle continues');
  assert.ok(
    board.container.scrollTop <= board.maxScroll(),
    'the board was left below the end of the content',
  );

  scheduler.advance(60_000);
  assert.ok(board.container.scrollTop <= board.maxScroll());
});

test('a hidden tab costs nothing, and becoming visible restarts the cycle', () => {
  const board = createBoard({ rows: 6 });
  let hidden = false;
  const { engine, scheduler } = mount(board, { isHidden: () => hidden });
  engine.start();

  hidden = true;
  engine.suspendForHidden();
  scheduler.advance(120_000);
  assert.equal(board.container.scrollTop, 0, 'the board scrolled a tab nobody could see');
  assert.deepEqual(scheduler.pending(), { timers: 0, frames: 0 }, 'a hidden tab kept a timer');

  hidden = false;
  engine.start();
  scheduler.advance(AUTO_SCROLL_DWELL_MS + STEP_DURATION_MAX_MS + 1_000);
  assert.ok(board.container.scrollTop > 0, 'the cycle did not restart when the tab came back');
});

test('a resized window re-measures instead of reusing the old row stops', () => {
  const board = createBoard({ rows: 4 });
  const { engine, scheduler } = mount(board);
  engine.start();
  scheduler.advance(30_000);

  // The window is made tall enough for the whole queue: auto-scroll ends.
  board.state.viewportHeight = 2_000;
  board.reclamp();
  assert.equal(engine.settle(), false);
  assert.equal(board.container.scrollTop, 0);

  // Shrunk again: it comes back, measured against the new viewport.
  board.state.viewportHeight = 500;
  assert.equal(engine.settle(), true);
  engine.kick();
  scheduler.advance(AUTO_SCROLL_DWELL_MS + STEP_DURATION_MAX_MS + 1_000);
  assert.equal(board.container.scrollTop, board.pitch, 'the first step ignored the new viewport');
});

test('reduced motion keeps the dwells and drops only the travel', () => {
  const board = createBoard({ rows: 5 });
  const { engine, scheduler } = mount(board, { reducedMotion: () => true });
  engine.start();

  scheduler.advance(AUTO_SCROLL_DWELL_MS - 200);
  assert.equal(board.container.scrollTop, 0, 'the dwell was skipped');

  scheduler.advance(400);
  assert.equal(board.container.scrollTop, board.pitch, 'the step did not land on the row');
});

test('a shift-long run keeps exactly one timer and leaks no frames', () => {
  const board = createBoard({ rows: 8 });
  const { engine, scheduler } = mount(board);
  engine.start();

  let maxFrames = 0;
  scheduler.advance(30 * 60_000, () => {
    const pending = scheduler.pending();
    maxFrames = Math.max(maxFrames, pending.frames);
    assert.ok(pending.timers <= 1, `${pending.timers} timers outstanding`);
  });

  assert.ok(maxFrames <= 1, `${maxFrames} animation frames outstanding at once`);
  assert.equal(scheduler.peakTimers, 1, 'more than one timer existed at some point');

  engine.stop();
  assert.deepEqual(scheduler.pending(), { timers: 0, frames: 0 }, 'stop() left work behind');
});

test('stopping the engine mid-step restores the stylesheet scroll behaviour', () => {
  const board = createBoard({ rows: 6 });
  const { engine, scheduler } = mount(board);
  engine.start();

  scheduler.advance(AUTO_SCROLL_DWELL_MS + 300);
  assert.equal(board.container.style.scrollBehavior, 'auto', 'expected a step in flight');

  engine.stop();
  assert.equal(board.container.style.scrollBehavior, '', 'CSS smooth scrolling was left overridden');
});
