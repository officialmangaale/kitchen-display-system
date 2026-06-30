import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatTimer,
  isActiveKDSStatus,
  isTerminalKDSStatus,
  normalizeOrder,
} from './orderUtils.js';

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
