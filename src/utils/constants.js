export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://restaurant-prod.mangaale.com';

export const TOKEN_KEY = 'jwt_token';
export const USER_ROLE_KEY = 'user_role';
export const USER_NAME_KEY = 'user_name';

export const STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'];

export const STATUS_ACTIONS = {
  NEW: {
    primary: { next: 'ACCEPTED', label: 'Accept Order' },
    secondary: [{ next: 'PREPARING', label: 'Start Directly' }],
  },
  ACCEPTED: {
    primary: { next: 'PREPARING', label: 'Start Cooking' },
    secondary: [],
  },
  PREPARING: {
    primary: { next: 'READY', label: 'Mark Ready' },
    secondary: [],
  },
  READY: {
    primary: { next: 'SERVED', label: 'Served' },
    secondary: [],
  },
  SERVED: {
    primary: null,
    secondary: [],
  },
};

export const STATUS_COLORS = {
  NEW: 'var(--primary)',
  ACCEPTED: 'var(--accent)',
  PREPARING: 'var(--info)',
  READY: 'var(--success)',
  SERVED: 'var(--muted)',
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
