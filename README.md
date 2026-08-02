# Mangaale KDS Frontend

Kitchen Display System for restaurant operations with authenticated WebSocket updates, polling reconciliation, SLA monitoring, status filters, and station filtering when station assignments exist.

## Setup

```bash
npm install
npm run dev
```

Set the backend URL with:

```text
VITE_API_BASE_URL=https://restaurant-prod.mangaale.com
VITE_USER_SERVICE_BASE_URL=https://user-prod.mangaale.com
```

## Authentication

Sign in with a restaurant user that has the `manage_orders` permission. The shared user-service JWT is stored as `jwt_token` and is used for REST and WebSocket authentication.

## Backend API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/kds/orders` | Fetch active service-window orders |
| GET | `/kds/orders?stationId=grill` | Filter by configured station |
| PATCH | `/kds/orders/:id/status` | Update canonical order status |
| POST | `/kds/orders/:id/note` | Add kitchen note |
| GET | `/ws/restaurants/orders?token=<jwt>` | Restaurant/counter-scoped WebSocket stream |

Order IDs in responses include strings such as `ord-482`; mutation endpoints use numeric IDs.

## Status and Alerts

```text
CONFIRMED -> PREPARING -> READY -> COMPLETED
```

`ready_to_serve` is accepted as an alias for canonical backend value `ready`. The active board is reconciled every 15 seconds while the WebSocket is interrupted, and hidden tabs do not issue polling requests. Initial load is silent; a new confirmed ticket and a transition to ready alert once after sound is enabled by a user gesture.

## Verification

```bash
npm test
npm run lint
npm run build
```
