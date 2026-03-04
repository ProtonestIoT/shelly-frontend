# Shelly Frontend

Dashboard application built with Next.js 16, React 19, and TypeScript.

## Quick Start

1. Follow the full setup guide in `INSTALLATION.md`.
2. Start development server:

```bash
pnpm dev
```

3. Open `http://localhost:3000`.

## Available Commands

- `pnpm dev` - Start local development server
- `pnpm lint` - Run ESLint
- `pnpm build` - Build for production
- `pnpm start` - Start built application

## Environment Setup

Copy and configure environment variables before running:

```bash
cp .env.example .env.local
```

See `INSTALLATION.md` for the complete variable list and troubleshooting.

## Project Notes

- App router code is under `src/app/`.
- Use `pnpm` for dependency management and scripts.
- No automated test runner is configured yet.
