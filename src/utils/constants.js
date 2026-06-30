export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://restaurant-prod.mangaale.com';

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
    primary: { next: 'PREPARING', label: 'Accept' },
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

export const DEFAULT_STATIONS = [
  { id: 'all', label: 'All' },
  { id: 'grill', label: 'Grill' },
  { id: 'fryer', label: 'Fryer' },
  { id: 'tandoor', label: 'Tandoor' },
  { id: 'beverage', label: 'Beverage' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'salad', label: 'Salad' },
];

export const NOTE_MAX_LENGTH = 500;
