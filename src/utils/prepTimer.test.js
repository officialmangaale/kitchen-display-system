import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PREP_TIMER_PRESET_MINUTES,
  canHavePrepTimer,
  formatCountdown,
  getPrepRemainingSeconds,
  hasPrepTimer,
  readPrepTimerFields,
} from './prepTimer.js';
import { normalizeOrder } from './orderUtils.js';

const NOW = Date.parse('2026-08-22T10:00:00.000Z');

function preparingOrder(autoReadyAt) {
  return { status: 'PREPARING', prepAutoReadyAt: autoReadyAt };
}

test('countdown is measured from the persisted auto-ready timestamp', () => {
  const order = preparingOrder('2026-08-22T10:08:42.000Z');
  assert.equal(getPrepRemainingSeconds(order, NOW), 522);
  assert.equal(formatCountdown(getPrepRemainingSeconds(order, NOW)), '08:42');
});

test('an elapsed timer clamps at zero rather than counting into negatives', () => {
  const order = preparingOrder('2026-08-22T09:59:00.000Z');
  assert.equal(getPrepRemainingSeconds(order, NOW), 0);
  assert.equal(formatCountdown(getPrepRemainingSeconds(order, NOW)), '00:00');
});

test('no countdown applies outside PREPARING, however stale the timestamp', () => {
  for (const status of ['CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED']) {
    const order = { status, prepAutoReadyAt: '2026-08-22T10:08:42.000Z' };
    assert.equal(canHavePrepTimer(status), false, status);
    assert.equal(getPrepRemainingSeconds(order, NOW), null, status);
    assert.equal(hasPrepTimer(order), false, status);
  }
});

test('a PREPARING order without a scheduled auto-ready has no countdown', () => {
  const order = preparingOrder(null);
  assert.equal(hasPrepTimer(order), false);
  assert.equal(getPrepRemainingSeconds(order, NOW), null);
});

test('countdown formatting pads under a minute and widens past an hour', () => {
  assert.equal(formatCountdown(42), '00:42');
  assert.equal(formatCountdown(3), '00:03');
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(600), '10:00');
  assert.equal(formatCountdown(3661), '1:01:01');
  assert.equal(formatCountdown(-5), '00:00');
});

test('normalizeOrder carries the backend timer fields onto the order', () => {
  const order = normalizeOrder({
    id: 'ord-125',
    status: 'PREPARING',
    placedAt: '2026-08-22T09:50:00.000Z',
    items: [],
    prep_timer_start: '2026-08-22T09:58:00.000Z',
    prep_duration_seconds: 600,
    prep_auto_ready_at: '2026-08-22T10:08:00.000Z',
  });

  assert.equal(order.prepAutoReadyAt, '2026-08-22T10:08:00.000Z');
  assert.equal(order.prepDurationSeconds, 600);
  assert.equal(order.prepTimerStart, '2026-08-22T09:58:00.000Z');
  assert.equal(hasPrepTimer(order), true);
  assert.equal(getPrepRemainingSeconds(order, NOW), 480);
});

test('an order the backend sends without timer fields normalizes to no timer', () => {
  const order = normalizeOrder({
    id: 'ord-126',
    status: 'PREPARING',
    placedAt: '2026-08-22T09:50:00.000Z',
    items: [],
  });

  assert.equal(order.prepAutoReadyAt, null);
  assert.equal(order.prepDurationSeconds, null);
  assert.equal(hasPrepTimer(order), false);
});

test('a cleared timer reads as explicit nulls, not as "unchanged"', () => {
  const fields = readPrepTimerFields({
    prep_timer_start: null,
    prep_duration_seconds: null,
    prep_auto_ready_at: null,
  });

  assert.deepEqual(fields, {
    prepTimerStart: null,
    prepDurationSeconds: null,
    prepAutoReadyAt: null,
  });
});

test('timer fields are read through the shared data envelope', () => {
  const fields = readPrepTimerFields({
    data: { order_id: 125, prep_auto_ready_at: '2026-08-22T10:15:00.000Z', prep_duration_seconds: 900 },
  });

  assert.equal(fields.prepAutoReadyAt, '2026-08-22T10:15:00.000Z');
  assert.equal(fields.prepDurationSeconds, 900);
});

test('a payload with no timer information is reported as unknown, not empty', () => {
  assert.equal(readPrepTimerFields({ message: 'ok' }), null);
  assert.equal(readPrepTimerFields(null), null);
});

test('an unparseable auto-ready timestamp is treated as no timer', () => {
  const order = preparingOrder('not-a-date');
  assert.equal(getPrepRemainingSeconds(order, NOW), null);
  assert.equal(hasPrepTimer(order), false);
});

test('the offered presets match the agreed durations', () => {
  assert.deepEqual(PREP_TIMER_PRESET_MINUTES, [5, 10, 15]);
});
