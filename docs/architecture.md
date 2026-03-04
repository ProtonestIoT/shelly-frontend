# Architecture Overview

This document explains how Shelly Frontend is organized and how data flows through the system.

## High-Level Stack

- Framework: Next.js 16 App Router
- UI: React 19 + Tailwind CSS v4
- API layer: Next.js route handlers under `src/app/api/protonest`
- Integration layer: `src/lib/protonest/client.ts`
- Realtime transport: WebSocket/STOMP via `@stomp/stompjs`

## Runtime Boundaries

### Client Layer

- `src/app/page.tsx` renders `DashboardPage`.
- `src/components/dashboard/dashboard-page.tsx` composes UI sections and user interactions.
- `src/hooks/use-machine-data.ts` orchestrates fetch, refresh, realtime merge, stale detection, and save actions.
- `src/lib/api.ts` is the client-facing API wrapper and websocket connector.

### Server Layer

- `src/app/api/protonest/**/route.ts` exposes internal API endpoints consumed by the client.
- `src/lib/protonest/client.ts` performs authenticated calls to upstream Protonest services.
- `src/lib/protonest/config.ts` parses required env vars and normalizes public websocket config.
- `src/lib/logging.ts` provides structured logging with redaction.

### Shared Contracts

- `src/types/dashboard.ts` defines machine status, dashboard payloads, configurations, and history models.

## Data Flow

## 1) Initial page load

1. Browser loads `/`.
2. `DashboardPage` uses `useMachineList()`.
3. Hook calls `fetchBootstrapData()` from `src/lib/api.ts`.
4. Client requests `GET /api/protonest/bootstrap`.
5. Route handler calls Protonest client methods to get machines and initial dashboard snapshot.
6. UI renders machine list and first dashboard data quickly.

## 2) Machine/channel change

1. User selects machine or channel.
2. `useMachineData()` calls `fetchDashboardData(machineId, channelId)`.
3. Client requests `GET /api/protonest/dashboard/[machineId]?channel=...`.
4. Route loads fresh dashboard data from Protonest integration.
5. Hook updates local state; components rerender KPI/chart/status cards.

## 3) Realtime updates

1. `useMachineData()` calls `connectRealtimeMachineUpdates(...)`.
2. Client fetches:
   - `GET /api/protonest/ws-config` for ws URL/topic prefixes
   - `GET /api/protonest/ws-auth` for token
3. STOMP client subscribes to state and stream topics per machine.
4. Incoming messages are parsed in `src/lib/api.ts` and merged into `DashboardData`.
5. UI updates status/power and marks stale state when `lastUpdated` exceeds 5 minutes.

## 4) Configuration updates

1. User submits elapsed hours or threshold value from dashboard controls.
2. Hook prepares payload based on selected machine/channel slot.
3. Client posts to `POST /api/protonest/configurations/[machineId]`.
4. Route validates numeric values and forwards update to Protonest client.
5. Hook reloads dashboard data to reflect persisted values.

## Key Design Decisions

- Bootstrap endpoint returns both machine list and initial dashboard snapshot to reduce first-render wait.
- Route handlers keep client free of Protonest credentials and auth token management.
- Realtime + polling/fetch are combined for resilience.
- Structured logging is centralized with sensitive key redaction.
- Shared TypeScript contracts reduce shape drift across client/server.

## Caching and Freshness

- Most live API routes: `Cache-Control: no-store`.
- `ws-config` route allows short caching (`max-age=30`, `stale-while-revalidate=120`).
- Client caches ws auth/config briefly in memory for connection setup efficiency.
- Staleness threshold in hook logic: 5 minutes.

## Environment and Configuration

Configured via `.env.local` (from `.env.example`):
- Protonest server credentials and project settings
- Public websocket flags/url/topic prefixes
- Logging flags/levels for server and client

`getServerConfig()` throws on missing required server configuration.

## Known Architectural Gaps

- Two write paths exist for elapsed/config updates (`/elapsed` and `/configurations`), while active UI flow mainly uses `/configurations`.
- No automated test harness is configured yet.
- Baseline weekly target is modeled in types but often absent (`null`) in integration output.

## Directory Map

- `src/app/` - route entry, global styles, API route handlers
- `src/components/dashboard/` - dashboard UI modules
- `src/hooks/` - client state/data orchestration
- `src/lib/` - API wrapper, integration logic, utilities
- `src/types/` - shared domain contracts
