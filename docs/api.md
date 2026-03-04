# API Reference

This document describes the internal API routes exposed by Shelly Frontend under `src/app/api/protonest`.

## Base Path

- `/api/protonest`

## Common Behavior

- Most routes return `Cache-Control: no-store` for live data paths.
- Success responses use HTTP `200`.
- Validation failures use HTTP `400` (where input is validated).
- Unexpected failures use HTTP `500` with `{ "error": string }`.

## Endpoints

### GET `/api/protonest/bootstrap`

Returns machine list and an initial dashboard snapshot for the first available machine/channel.

Response (200):

```json
{
  "machines": [
    {
      "id": "machine-1",
      "name": "Machine 1",
      "status": "RUNNING",
      "channels": ["ch:0", "ch:1"]
    }
  ],
  "initialDashboard": {
    "machineId": "machine-1",
    "channelId": "ch:0",
    "data": {}
  }
}
```

Error (500):

```json
{ "error": "Failed to load bootstrap data." }
```

### GET `/api/protonest/machines`

Returns only machine list metadata.

Response (200):

```json
{
  "machines": [
    {
      "id": "machine-1",
      "name": "Machine 1",
      "status": "IDLE",
      "channels": ["ch:0", "ch:1"]
    }
  ]
}
```

### GET `/api/protonest/dashboard/[machineId]?channel=<channelId>`

Returns full dashboard data for the selected machine, optionally filtered by channel.

Path params:
- `machineId` (string)

Query params:
- `channel` (optional string)

Response (200):

```json
{
  "data": {
    "machine": {
      "id": "machine-1",
      "name": "Machine 1",
      "status": "RUNNING",
      "powerWatts": 1450,
      "lastUpdated": "2026-02-27T12:00:00.000Z"
    },
    "configurations": {
      "channel1Hours": 8,
      "channel2Hours": 8,
      "channel1Threshold": 300,
      "channel2Threshold": 300
    },
    "periods": {},
    "history7d": [],
    "sheet": null,
    "baseline": null
  }
}
```

### POST `/api/protonest/elapsed/[machineId]`

Updates elapsed target hours for a machine.

Path params:
- `machineId` (string)

Request body:

```json
{ "hours": 8.5 }
```

Validation:
- `hours` must be a finite number in the allowed elapsed range (from `src/lib/elapsed.ts`, currently 1..24).

Success (200):

```json
{ "ok": true }
```

Validation error (400):

```json
{ "error": "hours must be between 1 and 24." }
```

### POST `/api/protonest/configurations/[machineId]`

Updates both channel elapsed and threshold values in one payload.

Path params:
- `machineId` (string)

Request body:

```json
{
  "channel1Hours": 8,
  "channel2Hours": 8,
  "channel1Threshold": 300,
  "channel2Threshold": 300
}
```

Validation:
- All four fields must be finite non-negative numbers.

Success (200):

```json
{
  "ok": true,
  "data": {
    "channel1Hours": 8,
    "channel2Hours": 8,
    "channel1Threshold": 300,
    "channel2Threshold": 300
  }
}
```

Validation error (400):

```json
{
  "error": "channel1Hours, channel2Hours, channel1Threshold, and channel2Threshold must be non-negative finite numbers."
}
```

### GET `/api/protonest/ws-auth`

Returns server-issued websocket auth token used by client STOMP connection setup.

Response (200):

```json
{
  "accessToken": "...",
  "expiresAtMs": 1760000000000
}
```

### GET `/api/protonest/ws-config`

Returns public realtime websocket configuration.

Response (200):

```json
{
  "config": {
    "wsEnabled": true,
    "wsUrl": "wss://api.protonestconnect.co/ws",
    "stateTopicPrefix": "/topic/state",
    "streamTopicPrefix": "/topic/stream"
  }
}
```

Caching:
- `Cache-Control: public, max-age=30, stale-while-revalidate=120`

## Client API Wrapper

`src/lib/api.ts` wraps these routes and exposes:
- `fetchMachineList()`
- `fetchBootstrapData()`
- `fetchDashboardData(machineId, channelId)`
- `updateElapsedTime(machineId, hours)`
- `updateConfigurations(machineId, payload)`
- `connectRealtimeMachineUpdates(options)`

## Notes

- Route handlers call `src/lib/protonest/client.ts` for upstream Protonest integration.
- Shared response/domain shapes are defined in `src/types/dashboard.ts`.
