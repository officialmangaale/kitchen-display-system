export function readKDSScope(search = window.location.search) {
  const params = new URLSearchParams(search);
  const restaurantId = params.get('restaurant_id')?.trim() || '';
  const rawCounterId = params.get('counter_id')?.trim() || '';
  const counterId = rawCounterId.toUpperCase() === 'ALL' ? '' : rawCounterId;
  return {
    restaurantId,
    counterId,
    managerMode: !counterId,
  };
}

export function appendScope(path, scope = {}) {
  const url = new URL(path, window.location.origin);
  if (scope.restaurantId) {
    url.searchParams.set('restaurant_id', scope.restaurantId);
  }
  if (scope.counterId) {
    url.searchParams.set('counter_id', scope.counterId);
  }
  return `${url.pathname}${url.search}`;
}
