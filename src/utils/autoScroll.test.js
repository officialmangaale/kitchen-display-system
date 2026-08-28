import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUTO_SCROLL_DWELL_MS,
  AUTO_SCROLL_RESUME_DELAY_MS,
  OVERFLOW_EPSILON_PX,
  RETURN_DURATION_MAX_MS,
  RETURN_DURATION_MIN_MS,
  STEP_DURATION_MAX_MS,
  STEP_DURATION_MIN_MS,
  computeRowStops,
  easeInOutCubic,
  hasBoardOverflow,
  hasNewOrders,
  isBottomStop,
  nextStopFrom,
  returnDurationMs,
  stepDurationMs,
} from './autoScroll.js';

// A board of 400px cards with 22px gaps inside a container padded by 28px:
// the layout the dashboard actually renders on a desktop screen.
const ROW_PITCH = 422;
const PADDING = 28;

function rowTops(count) {
  return Array.from({ length: count }, (_, index) => PADDING + index * ROW_PITCH);
}

test('a board that fits its viewport produces no stops to travel to', () => {
  assert.equal(hasBoardOverflow(900, 900), false);
  assert.equal(hasBoardOverflow(900 + OVERFLOW_EPSILON_PX, 900), false);
  assert.deepEqual(computeRowStops({ rowTops: rowTops(2), paddingTop: PADDING, maxScroll: 0 }), [0]);
});

test('overflow is only overflow once it clears the rounding epsilon', () => {
  assert.equal(hasBoardOverflow(909, 900), true);
});

test('stops land on row boundaries, keeping the row inset the first row has', () => {
  // Four rows of cards, two of them visible: 4 * 422 - 22 + 56 padding = 1722.
  const maxScroll = 1722 - 900;
  const stops = computeRowStops({ rowTops: rowTops(4), paddingTop: PADDING, maxScroll });

  assert.equal(stops[0], 0, 'the top is always reachable');
  assert.equal(stops[stops.length - 1], maxScroll, 'the bottom is always reachable');
  for (const stop of stops.slice(1, -1)) {
    assert.equal(stop % ROW_PITCH, 0, `${stop} is not a row boundary`);
  }
});

test('the cycle advances one row at a time and then reports the bottom', () => {
  const maxScroll = 1722 - 900;
  const stops = computeRowStops({ rowTops: rowTops(4), paddingTop: PADDING, maxScroll });

  const first = nextStopFrom(0, stops);
  assert.equal(first, ROW_PITCH, 'the first step reveals exactly the next row');

  const visited = [];
  let position = 0;
  for (let guard = 0; guard < 10; guard += 1) {
    const next = nextStopFrom(position, stops);
    if (next === null) break;
    visited.push(next);
    position = next;
  }

  assert.deepEqual(visited, stops.slice(1));
  assert.equal(nextStopFrom(maxScroll, stops), null, 'nothing follows the bottom');
  assert.equal(isBottomStop(maxScroll, maxScroll), true);
  assert.equal(isBottomStop(ROW_PITCH, maxScroll), false);
});

test('a row boundary a hair above the bottom collapses into the bottom', () => {
  // The last row overhangs by 6px — resting on its boundary would clip it.
  const stops = computeRowStops({ rowTops: rowTops(3), paddingTop: PADDING, maxScroll: ROW_PITCH * 2 + 6 });
  assert.deepEqual(stops, [0, ROW_PITCH, ROW_PITCH * 2 + 6]);
});

test('a board one row deep still offers the top and the bottom', () => {
  const stops = computeRowStops({ rowTops: rowTops(2), paddingTop: PADDING, maxScroll: 120 });
  assert.deepEqual(stops, [0, 120]);
  assert.equal(nextStopFrom(0, stops), 120);
});

test('a stop already reached is not offered again', () => {
  const stops = [0, 400, 800];
  assert.equal(nextStopFrom(398, stops), 800, 'within the settle tolerance counts as arrived');
  assert.equal(nextStopFrom(390, stops), 400);
});

test('step durations stay inside the readable band whatever the distance', () => {
  assert.equal(stepDurationMs(0), STEP_DURATION_MIN_MS);
  assert.equal(stepDurationMs(40), STEP_DURATION_MIN_MS, 'a short hop never crawls');
  assert.equal(stepDurationMs(4000), STEP_DURATION_MAX_MS, 'a long hop never drifts');
  assert.ok(stepDurationMs(700) > STEP_DURATION_MIN_MS);
  assert.ok(stepDurationMs(700) < STEP_DURATION_MAX_MS);
});

test('the return to the top is never instant and never a crawl', () => {
  assert.equal(returnDurationMs(10), RETURN_DURATION_MIN_MS);
  assert.equal(returnDurationMs(100_000), RETURN_DURATION_MAX_MS);
  assert.ok(returnDurationMs(2400) > RETURN_DURATION_MIN_MS);
});

test('easing starts and ends at rest', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
  assert.equal(easeInOutCubic(-1), 0, 'clamped below');
  assert.equal(easeInOutCubic(2), 1, 'clamped above');
  assert.ok(easeInOutCubic(0.1) < 0.1, 'eases in');
  assert.ok(easeInOutCubic(0.9) > 0.9, 'eases out');
});

test('only arrivals hold the board still, not completions', () => {
  assert.equal(hasNewOrders(['a', 'b'], ['a', 'b', 'c']), true);
  assert.equal(hasNewOrders(['a', 'b'], ['a']), false, 'an order leaving is not an arrival');
  assert.equal(hasNewOrders(['a', 'b'], ['b', 'a']), false, 're-sorting is not an arrival');
  assert.equal(hasNewOrders([], []), false);
  assert.equal(hasNewOrders([], ['a']), true);
});

test('an interaction buys more quiet time than a routine dwell', () => {
  assert.ok(AUTO_SCROLL_RESUME_DELAY_MS > AUTO_SCROLL_DWELL_MS);
});
