# AGENTS.md

Repository guidance for autonomous coding agents working in `cnc-status-hub`.

## Project Snapshot

- Framework: Next.js 16 (App Router) + React 19 + TypeScript.
- Primary app location: `src/app/`.
- UI feature surface: `src/components/dashboard/`.
- Client data orchestration: `src/hooks/use-machine-data.ts`.
- API integration layer: `src/lib/api.ts` and `src/lib/protonest/`.
- Styling system: Tailwind CSS v4 with tokens in `src/app/globals.css`.
- Package manager: `pnpm` (lockfile/workspace files are present).

## Source of Truth (Read First)

- `package.json` for executable scripts.
- `tsconfig.json` for type-safety and path aliases.
- `eslint.config.mjs` for lint rules and ignore behavior.
- `src/app/layout.tsx` and `src/app/page.tsx` for route-entry patterns.
- `src/app/globals.css` for theme tokens, animation utilities, and motion rules.
- `src/lib/protonest/config.ts` for required env configuration behavior.

## Command Reference

Use `pnpm` unless a maintainer explicitly directs otherwise.

### Install

- `pnpm install`

### Development

- `pnpm dev` - start local dev server.

### Lint

- `pnpm lint` - run ESLint.

### Build

- `pnpm build` - production build (`next build`).

### Start (Production Runtime)

- `pnpm start` - start built app (`next start`).

### Test

- There is currently no `test` script in `package.json`.
- No Vitest/Jest/Playwright config file exists in this repository.

### Single Test Execution (Important)

- Not currently available because no test runner is configured.
- If a test runner is added, immediately document exact single-test commands here.
- Typical future patterns (only after script/config exists):
  - Vitest file: `pnpm vitest path/to/file.test.ts`
  - Vitest by name: `pnpm vitest -t "test name"`
  - Jest file: `pnpm jest path/to/file.test.ts`
  - Jest by name: `pnpm jest -t "test name"`

## Quality Gates and Completion Checklist

- Run `pnpm lint` after meaningful code changes.
- Run `pnpm build` before finalizing production-facing changes.
- If tests are added in the future, run full suite and at least one targeted/single test.
- Do not claim completion without command evidence.

## Code Style Guidelines

Follow existing local patterns in touched files. Keep diffs intentional and minimal.

### TypeScript and Types

- Keep strict-safe TypeScript; do not weaken compiler safety.
- Prefer `import type` for type-only imports.
- Prefer precise types over `any`.
- Do not use `@ts-ignore` or `@ts-expect-error` to bypass type problems.
- Reuse existing shared contracts from `src/types/dashboard.ts` when applicable.

### Imports

- Use ESM imports.
- Group imports consistently:
  1) external packages,
  2) absolute internal imports (`@/...`),
  3) relative imports.
- Keep side-effect imports (for example CSS) after package imports.

### Naming

- Components: PascalCase (for example `DashboardPage`, `KpiCard`).
- Functions and variables: camelCase.
- Constants: UPPER_SNAKE_CASE only for true constants; local values may remain camelCase.
- CSS custom properties: kebab-case semantic tokens (for example `--color-background`).
- Route files must keep Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`).

### React and Next.js Patterns

- Route entry files use default export function components.
- API handlers live in `src/app/api/**/route.ts` and return `NextResponse`.
- Client components should include `"use client"` only when required.
- Prefer Next.js primitives (`next/font`, `next/dynamic`) where already used.

### Formatting

- Match existing formatting style in touched files.
- Use double quotes in TS/TSX and config files.
- Keep semicolons and trailing commas where formatter/linter expects them.
- Prefer readable multi-line JSX over dense one-line blocks.

### Styling

- Use Tailwind utility classes in JSX.
- Reuse existing design tokens from `src/app/globals.css`.
- Respect reduced-motion behavior already defined in global styles.
- Avoid introducing conflicting theme token names.

### Error Handling and Logging

- Fail with explicit, actionable error messages.
- Avoid silent catches and empty fallback behavior.
- In API routes, follow existing pattern:
  - validate input early,
  - return 4xx for invalid client payloads,
  - return 5xx with safe error message for unexpected failures.
- Use `createLogger` from `src/lib/logging.ts` for structured logs.
- Never log secrets, tokens, passwords, or raw credentials.

## File Organization and Boundaries

- Keep dashboard UI composition in `src/components/dashboard/`.
- Keep hooks focused on data/state orchestration (`src/hooks/`).
- Keep integration logic in `src/lib/` and avoid leaking transport details into UI.
- Keep environment parsing/normalization in `src/lib/protonest/config.ts`.
- Do not mix external sandbox code (`websocket-test-external/`) into core app runtime paths.

## CI and Deployment Context

- CI workflow exists at `.github/workflows/azure-static-web-apps-jolly-meadow-0b1273d00.yml`.
- Main branch pushes and pull requests to `main` trigger Azure Static Web Apps workflow.
- Secrets are used for production environment values; never hardcode credentials.

## Agent Workflow Notes

- Before editing, inspect adjacent files and mirror local patterns.
- Prefer fixing root cause over adding patchwork conditionals.
- Keep refactors scoped to the requested task unless safety requires a broader fix.
- Update documentation when introducing new commands, tooling, or setup requirements.

## Cursor / Copilot Rules Check

- `.cursor/rules/`: not found.
- `.cursorrules`: not found.
- `.github/copilot-instructions.md`: not found.
- If any of these files are added later, merge their constraints into this document.

## Known Gaps (Current)

- No automated test runner is configured.
- Single-test execution is unavailable until a test runner is added.
- LSP TypeScript server may not be installed in some local agent environments.
