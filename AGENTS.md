# AGENTS.md

Repository guidance for autonomous coding agents working in `cnc-status-hub`.

## Project Snapshot

- Framework: Next.js 16 (App Router) with React 19 and TypeScript.
- Package manager signal: `pnpm-lock.yaml` and `pnpm-workspace.yaml` are present.
- Current app shape: minimal starter app in `app/`.
- Linting: ESLint v9 with `eslint-config-next` (`core-web-vitals` + `typescript`).
- Styling: Tailwind CSS v4 via `@tailwindcss/postcss` and `app/globals.css`.
- TypeScript mode: strict (`"strict": true` in `tsconfig.json`).

## Source of Truth (Read First)

- `package.json` for executable scripts.
- `eslint.config.mjs` for lint rules and ignore behavior.
- `tsconfig.json` for type constraints and path aliasing.
- `app/layout.tsx` and `app/page.tsx` for local code style patterns.
- `app/globals.css` for CSS and theme variable conventions.

## Command Reference

Use the package manager already used in this repo (prefer `pnpm`).

### Install

- `pnpm install`

### Development

- `pnpm dev` - start local dev server.

### Build

- `pnpm build` - production build (`next build`).

### Start (production runtime)

- `pnpm start` - start built app (`next start`).

### Lint

- `pnpm lint` - run ESLint using project config.

### Test

- There is currently **no** `test` script in `package.json`.
- No Jest/Vitest/Playwright config files were found in this repository.

### Single Test Execution (Important)

- Not currently available because no test runner is configured.
- If a runner is introduced, add exact single-test commands here immediately.
- Typical future patterns (only after script/config exists):
  - Vitest file: `pnpm vitest path/to/file.test.ts`
  - Vitest test name: `pnpm vitest -t "test name"`
  - Jest file: `pnpm jest path/to/file.test.ts`
  - Jest test name: `pnpm jest -t "test name"`

## Code Style Guidelines

Follow observed project conventions; do not invent a conflicting style.

### TypeScript and Types

- Keep TypeScript strict-safe; do not weaken strictness.
- Prefer explicit type imports where relevant:
  - Example: `import type { Metadata } from "next";`
- Use framework types when available (e.g., `NextConfig`, `Metadata`).
- Do not introduce `any` unless absolutely unavoidable.
- Do not use `@ts-ignore` / `@ts-expect-error` as shortcuts.

### Imports

- Use ESM imports.
- Group imports in this order when possible:
  1) external packages,
  2) internal absolute imports (`@/...`),
  3) relative imports.
- Keep side-effect style imports (like CSS) after package imports.
- Prefer `import type` for type-only imports.

### Naming

- Components: PascalCase (`RootLayout`, `Home`).
- Functions: camelCase (unless framework requires otherwise).
- Constants: camelCase for local constants (`geistSans`, `geistMono`).
- CSS custom properties: kebab-case prefixed with semantic meaning
  (e.g., `--background`, `--foreground`, `--font-geist-sans`).

### React / Next.js Patterns

- Use function components and default export for route entry files.
- Keep App Router conventions:
  - `app/layout.tsx` for root layout and metadata.
  - `app/page.tsx` for route page UI.
- Prefer Next.js primitives where relevant (`next/image`, `next/font`).

### Formatting

- Match existing formatting style:
  - Double quotes in TS/TSX and config files.
  - Trailing commas where formatter adds them.
  - Semicolons enabled.
- Keep JSX readable with one prop per line when lines grow.
- Avoid compacting JSX in ways that reduce readability.

### Styling

- Tailwind utility classes are used directly in JSX.
- Global design tokens live in `app/globals.css` (`:root` + `@theme inline`).
- Respect existing CSS variable theme model for background/foreground.

### Error Handling

- There is no custom error-handling framework in this repo yet.
- For new server/client logic:
  - Fail fast with clear error messages.
  - Avoid silent catches.
  - Return typed, explicit error states for UI/data boundaries.
- Do not add broad try/catch without a concrete recovery path.

### File Organization

- Keep route-related UI under `app/` following App Router conventions.
- Prefer small, focused modules over large multi-purpose files.
- If introducing shared code, use clear folder names and stable boundaries.

## Lint and Quality Expectations

- Run `pnpm lint` after meaningful changes.
- Run `pnpm build` before considering work complete for production-facing edits.
- If adding tests in the future, ensure both full-suite and single-test commands are
  documented in this file.

## Agent Workflow Notes

- Before edits, read nearby files and follow local patterns first.
- Keep diffs minimal; avoid opportunistic refactors in bugfix tasks.
- Prefer improving existing files over creating abstractions too early.
- Document any newly introduced command (especially test commands) in `AGENTS.md`.

## Cursor / Copilot Rules Check

- `.cursor/rules/`: not found.
- `.cursorrules`: not found.
- `.github/copilot-instructions.md`: not found.
- If these files are added later, merge their constraints into this document.

## Current Gaps to Keep in Mind

- No automated test setup is currently present.
- No CI workflow files were found in `.github/workflows/`.
- This appears close to a starter baseline; keep conventions consistent as code grows.
