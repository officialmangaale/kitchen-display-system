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
VITE_WS_BASE_URL=https://restaurant-prod.mangaale.com
VITE_USER_SERVICE_BASE_URL=https://user-prod.mangaale.com
```

`VITE_API_BASE_URL` and `VITE_WS_BASE_URL` are build-time values. They must
point to the restaurant service, not `kds.mangaale.com`; a missing value is a
configuration error and is never replaced with the browser origin. HTTPS
deployments should use `https://` for both values; the WebSocket URL builder
converts the configured scheme to `wss://`.

## Authentication

Sign in with a restaurant user that has the `manage_orders` permission. The shared user-service JWT is stored as `jwt_token` and is used for REST and WebSocket authentication.

## Backend API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/kds/orders` | Fetch active service-window orders |
| GET | `/kds/orders?stationId=grill` | Filter by configured station |
| PATCH | `/kds/orders/:id/status` | Update canonical order status |
| POST | `/kds/orders/:id/note` | Add kitchen note |
| PATCH | `/orders/:id/timer` | Set, change or clear the preparation timer |
| GET | `/ws/restaurants/orders?token=<jwt>` | Restaurant/counter-scoped WebSocket stream |

Order IDs in responses include strings such as `ord-482`; mutation endpoints use numeric IDs.

## Status and Alerts

```text
CONFIRMED -> PREPARING -> READY -> COMPLETED
```

`ready_to_serve` is accepted as an alias for canonical backend value `ready`. The active board is reconciled every 15 seconds while the WebSocket is interrupted, and hidden tabs do not issue polling requests. Initial load is silent; a new confirmed ticket and a transition to ready alert once after sound is enabled by a user gesture.

## Preparation Timer

A `PREPARING` order may carry a backend-scheduled auto-ready. The board reads
three fields off the order — `prep_timer_start`, `prep_duration_seconds` and
`prep_auto_ready_at` — and renders `Ready in MM:SS` counted down locally from
`prep_auto_ready_at`. Nothing is polled to make the clock move.

The timer is shared, not duplicated: `PATCH /orders/:id/timer` with
`prep_duration_seconds` is the same endpoint the Restaurant App calls, so both
surfaces read and write one persisted value and agree to within a render. A
duration of `0` clears the schedule. The presets are 5, 10 and 15 minutes.

Reaching `00:00` sends nothing. The backend sweeper performs the
`PREPARING -> READY` transition and the board picks it up through the same
WebSocket frame or polling refresh as any other status change, so a closed tab,
a lost connection or a service restart cannot lose or double-apply it. The
countdown is only ever shown while an order is `PREPARING`.

The kitchen card carries the editable control (5 / 10 / 15 min, Remove) as a
labelled row above `Mark Ready`. The read-only Dine-In card shows the same
countdown beside the status, with no way to change it. Both share an existing
fixed-height row rather than adding one, so every card stays exactly the same
size whether or not a timer is running.

## Smart Auto-Scroll

When the active queue is taller than the board, the order area cycles through it
on its own so nothing stays hidden below the fold. When the queue fits, the
board is completely stationary — there is no idle drift, no timer and no
indicator.

```text
pause 5s -> smooth step to the next row -> pause 5s -> ... -> bottom
bottom held 5.5s -> smooth return to the top -> pause 5s -> repeat
```

Steps are row-aligned rather than a fixed pixel distance: the row tops are
measured from the rendered grid, so 2, 3, 4 or 5 columns and either card height
behave the same, and the board never comes to rest with a card sliced across the
top or its buttons cut off. A step lasts 600–1000ms, scaled to its distance;
the return to the top is longer and never a jump.

The kitchen always wins. A wheel, a drag, a touch, a keypress or a tap on any
order action pauses the cycle immediately — cancelling a step mid-flight rather
than pulling the card out from under a hand — and it resumes 10 seconds after
the last interaction, only if the board still overflows. Hovering a card with a
moving pointer, or leaving a prep-timer menu open, holds it for as long as that
lasts. An arriving ticket holds the board still for 5 seconds so the existing
toast and alert tone can be read, without cutting an in-flight step short and
without changing the sort order. A hidden tab runs nothing at all.

Auto-scroll is presentation only. It adds no request, no subscription and no
per-card timer, and it never re-renders an order card: the cycle lives in refs
and publishes its state to one small header indicator (`Auto view`) through an
external store. Preparation countdowns keep ticking off their persisted
`prep_auto_ready_at` straight through a scroll, because no card is unmounted,
remounted or re-keyed to make the board move.

`utils/autoScroll.js` holds the geometry and timing as pure functions,
`utils/autoScrollEngine.js` the cycle itself with every clock injected, and
`hooks/useSmartAutoScroll.js` is one mount's worth of listeners around it —
one timer and one animation frame outstanding at any moment, all released on
unmount. The engine is covered by a simulated board in
`utils/autoScrollEngine.test.js`, including a 30-minute run that asserts it
never accumulates a second timer.

## Verification

```bash
npm test
npm run lint
npm run build
```
