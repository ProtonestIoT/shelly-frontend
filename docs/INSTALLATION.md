# Installation Guide

This guide helps you set up Shelly Frontend on your own machine.

## 1) Prerequisites

- Node.js 20 or newer
- pnpm 9 or newer
- Git

Check installed versions:

```bash
node -v
pnpm -v
git --version
```

If pnpm is missing:

```bash
npm install -g pnpm
```

## 2) Clone and install dependencies

```bash
git clone <your-repo-url>
cd cnc-status-hub
pnpm install
```

## 3) Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then update `.env.local` with your real values.

Required Protonest settings:

- `PROTONEST_API_BASE_URL`
- `PROTONEST_AUTH_EMAIL`
- `PROTONEST_AUTH_PASSWORD`
- `PROTONEST_PROJECT_ID`
- `PROTONEST_PROJECT_NAME`
- `PROTONEST_GOOGLE_SHEET_URL`

Date window settings:

- `PROTONEST_POWER_WINDOW_START_OFFSET_DAYS`
- `PROTONEST_POWER_WINDOW_END_OFFSET_DAYS`

Realtime websocket settings:

- `NEXT_PUBLIC_PROTONEST_WS_ENABLED`
- `NEXT_PUBLIC_PROTONEST_WS_URL`
- `NEXT_PUBLIC_PROTONEST_STATE_TOPIC_PREFIX`
- `NEXT_PUBLIC_PROTONEST_STREAM_TOPIC_PREFIX`

Logging settings:

- `APP_LOGGING_ENABLED`
- `APP_LOG_LEVEL`
- `NEXT_PUBLIC_APP_LOGGING_ENABLED`
- `NEXT_PUBLIC_APP_LOG_LEVEL`

## 4) Run locally

Start the development server:

```bash
pnpm dev
```

Open `http://localhost:3000` in your browser.

## 5) Validate your setup

Run linting:

```bash
pnpm lint
```

Run production build:

```bash
pnpm build
```

Run production server (after a successful build):

```bash
pnpm start
```

## 6) Common issues

- `pnpm: command not found`
  - Install pnpm globally: `npm install -g pnpm`
- `Module not found` errors
  - Remove `node_modules` and reinstall with `pnpm install`
- Auth or API request failures
  - Re-check all `PROTONEST_*` values in `.env.local`
- Websocket connection issues
  - Verify `NEXT_PUBLIC_PROTONEST_WS_ENABLED=true` and confirm WS URL/topic prefixes

## 7) Notes

- This repository currently has no configured test runner script.
- Use `pnpm` as the package manager for all commands.
