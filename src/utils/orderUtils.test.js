import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatTimer,
  getOrderAlertEvents,
  isActiveKDSStatus,
  isTerminalKDSStatus,
  normalizeOrder,
} from './orderUtils.js';

function order(id, status) {
  return normalizeOrder({
    id,
    status,
    placedAt: '2026-07-13T10:00:00+05:30',
    items: [],
  });
}

test('normalizeOrder maps legacy KDS states to canonical active states', () => {
  const order = normalizeOrder({
    id: 'ord-1195',
    status: 'NEW',
    placedAt: '2026-06-30T10:00:00+05:30',
    items: [],
  });

  assert.equal(order.status, 'CONFIRMED');
  assert.equal(isActiveKDSStatus(order.status), true);
});

test('terminal orders stay terminal so callers can remove them', () => {
  const order = normalizeOrder({
    id: 'ord-1195',
    status: 'SERVED',
    placedAt: '2026-06-30T10:00:00+05:30',
  });

  assert.equal(order.status, 'COMPLETED');
  assert.equal(isTerminalKDSStatus(order.status), true);
});

test('formatTimer freezes against timerStoppedAt', () => {
  const display = formatTimer(
    '2026-06-30T10:00:00+05:30',
    15,
    '2026-06-30T10:07:00+05:30',
  );

  assert.equal(display, '7m');
});

test('ready_to_serve compatibility value maps to Ready', () => {
  assert.equal(order('ord-1', 'ready_to_serve').status, 'READY');
});

test('completed orders are terminal and not active', () => {
  const completed = order('ord-2', 'completed');
  assert.equal(isTerminalKDSStatus(completed.status), true);
  assert.equal(isActiveKDSStatus(completed.status), false);
});

test('initial order hydration never emits sound events', () => {
  const next = new Map([['ord-3', order('ord-3', 'confirmed')]]);
  assert.deepEqual(getOrderAlertEvents(new Map(), next, false), []);
});

test('new confirmed order emits once and polling duplicate stays silent', () => {
  const confirmed = order('ord-4', 'confirmed');
  const next = new Map([['ord-4', confirmed]]);
  assert.deepEqual(
    getOrderAlertEvents(new Map(), next, true).map((event) => event.type),
    ['new'],
  );
  assert.deepEqual(getOrderAlertEvents(next, new Map(next), true), []);
});

test('transition to ready emits once and reconnect duplicate stays silent', () => {
  const previous = new Map([['ord-5', order('ord-5', 'preparing')]]);
  const ready = new Map([['ord-5', order('ord-5', 'ready')]]);
  assert.deepEqual(
    getOrderAlertEvents(previous, ready, true).map((event) => event.type),
    ['ready'],
  );
  assert.deepEqual(getOrderAlertEvents(ready, new Map(ready), true), []);
});
