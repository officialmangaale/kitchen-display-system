import { getConfiguredServiceBase } from './serviceConfig.js';

export function buildKDSWebSocketUrl(token, scope = {}, baseURL = '') {
  const configuredBase = getConfiguredServiceBase(baseURL, 'KDS WebSocket base URL');
  const url = new URL(configuredBase);
  const basePath = url.pathname.replace(/\/+$/, '');
  url.pathname = `${basePath}/ws/restaurants/orders`;
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  if (scope?.restaurantId) url.searchParams.set('restaurant_id', scope.restaurantId);
  if (scope?.counterId) url.searchParams.set('counter_id', scope.counterId);
  return url.toString();
}
