export function buildKDSWebSocketUrl(token, scope = {}, baseURL = '', origin = 'http://localhost') {
  const url = new URL(baseURL || origin, origin);
  const basePath = url.pathname.replace(/\/+$/, '');
  url.pathname = `${basePath}/ws/restaurants/orders`;
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  if (scope?.restaurantId) url.searchParams.set('restaurant_id', scope.restaurantId);
  if (scope?.counterId) url.searchParams.set('counter_id', scope.counterId);
  return url.toString();
}
