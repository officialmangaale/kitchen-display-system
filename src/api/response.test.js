import assert from 'node:assert/strict';
import test from 'node:test';

import { readServiceResponse } from './response.js';

function response({ status = 200, contentType, body = '', ok = status >= 200 && status < 300 }) {
  return {
    status,
    ok,
    headers: { get: (name) => name === 'content-type' ? contentType : null },
    text: async () => body,
  };
}

test('HTML from an SPA fallback becomes a sanitized upstream error', async () => {
  await assert.rejects(
    () => readServiceResponse(response({ contentType: 'text/html', body: '<!doctype html>' }), 'KDS REST API'),
    (error) => error.code === 'UPSTREAM_NOT_JSON' && !error.message.includes('<!doctype'),
  );
});

test('JSON responses are parsed only when content type is JSON', async () => {
  const value = await readServiceResponse(
    response({ contentType: 'application/json; charset=utf-8', body: '{"orders":[]}' }),
    'KDS REST API',
  );
  assert.deepEqual(value, { orders: [] });
});

