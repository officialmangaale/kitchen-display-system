export const FALLBACK_POLL_INTERVAL_MS = 15_000;
export const FALLBACK_POLL_ACTIVATION_DELAY_MS = 1_500;

export function shouldPollOrders(connectionStatus, visibilityState = 'visible') {
  return connectionStatus !== 'connected' && visibilityState === 'visible';
}

export function connectionStatusLabel(status) {
  if (status === 'connected') return 'LIVE';
  if (status === 'polling') return 'POLLING FALLBACK';
  if (status === 'reconnecting') return 'RECONNECTING...';
  return 'OFFLINE';
}
