import assert from 'node:assert/strict';
import test from 'node:test';

import { getConfiguredServiceBase } from './serviceConfig.js';

test('service base preserves an intentional proxy prefix and strips trailing slashes', () => {
  assert.equal(
    getConfiguredServiceBase('https://restaurant.example.test/api-main///', 'REST API'),
    'https://restaurant.example.test/api-main',
  );
});

test('missing service base is a configuration error instead of a frontend-origin fallback', () => {
  assert.throws(
    () => getConfiguredServiceBase('', 'REST API'),
    (error) => error.code === 'CONFIGURATION_ERROR' && /not configured/.test(error.message),
  );
});

test('credentials and query parameters are rejected from service bases', () => {
  assert.throws(() => getConfiguredServiceBase('https://user:pass@example.test', 'REST API'), /must not contain/);
  assert.throws(() => getConfiguredServiceBase('https://example.test?token=secret', 'REST API'), /must not contain/);
});

