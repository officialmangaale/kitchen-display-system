const viteEnv = import.meta.env || {};

export const BASE_URL =
  viteEnv.VITE_API_BASE_URL || '';
// Keep REST and WebSocket origins independently configurable. Falling back
// from WS to a configured REST origin is safe; falling back to window.origin
// is not, because the KDS host serves an SPA rather than the API.
export const WS_BASE_URL =
  viteEnv.VITE_WS_BASE_URL || BASE_URL;
export const USER_SERVICE_BASE_URL =
  viteEnv.VITE_USER_SERVICE_BASE_URL || '';

export const TOKEN_KEY = 'jwt_token';
export const USER_ROLE_KEY = 'user_role';
export const USER_NAME_KEY = 'user_name';
export const ACTIVE_STATUSES = ['CONFIRMED', 'PREPARING', 'READY'];
export const TERMINAL_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'CANCELED',
  'REJECTED',
  'DECLINED',
  'FAILED',
  'EXPIRED',
  'DELIVERED',
  'DONE',
];
export const STATUSES = [...ACTIVE_STATUSES, ...TERMINAL_STATUSES];

export const STATUS_ACTIONS = {
  CONFIRMED: {
    primary: { next: 'PREPARING', label: 'Start Preparing' },
    secondary: [],
  },
  PREPARING: {
    primary: { next: 'READY', label: 'Mark Ready' },
    secondary: [],
  },
  READY: {
    primary: { next: 'COMPLETED', label: 'Complete' },
    secondary: [],
  },
  COMPLETED: {
    primary: null,
    secondary: [],
  },
};

export const STATUS_COLORS = {
  CONFIRMED: 'var(--primary)',
  PREPARING: 'var(--info)',
  READY: 'var(--success)',
  COMPLETED: 'var(--muted)',
};

export const PRIORITY_COLORS = {
  NORMAL: 'var(--muted)',
  HIGH: 'var(--accent)',
  RUSH: 'var(--danger)',
};

export const NOTE_MAX_LENGTH = 500;
