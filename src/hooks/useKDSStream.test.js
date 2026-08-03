import assert from 'node:assert/strict';
import test from 'node:test';

import { buildKDSWebSocketUrl } from '../utils/websocketUrl.js';

test('KDS converts HTTPS service URL to WSS and preserves proxy prefix', () => {
  assert.equal(
    buildKDSWebSocketUrl(
      'jwt-token',
      { restaurantId: '44', counterId: '7' },
      'https://restaurant.example.test/api-main/',
    ),
    'wss://restaurant.example.test/api-main/ws/restaurants/orders?token=jwt-token&restaurant_id=44&counter_id=7',
  );
});

test('KDS converts HTTP service URL to WS', () => {
  assert.equal(
    buildKDSWebSocketUrl('token', {}, 'http://localhost:8082'),
    'ws://localhost:8082/ws/restaurants/orders?token=token',
  );
});

test('KDS never falls back to the static frontend origin', () => {
  assert.throws(
    () => buildKDSWebSocketUrl('token', {}, ''),
    (error) => error.code === 'CONFIGURATION_ERROR',
  );
});
