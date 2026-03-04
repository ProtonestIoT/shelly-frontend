# Product Requirements Document (PRD)

## 1. Product Overview

Product name: Shelly Frontend

Shelly Frontend is a web dashboard for monitoring CNC machine utilization in near real time. It combines machine state, active power, utilization history, and configurable operational targets (elapsed hours and power thresholds) into a single operator-facing interface.

The application is built with Next.js App Router and integrates with Protonest APIs plus websocket streams.

## 2. Problem Statement

Manufacturing teams need a fast way to see whether machines are running, under-utilized, stale, or disconnected without manually checking multiple systems.

Current pain points this product addresses:
- fragmented machine status and runtime data
- no simple daily/weekly/monthly utilization view in one place
- weak visibility into stale telemetry conditions
- inconsistent target configuration workflows

## 3. Target Users

Primary users:
- shop floor supervisors
- manufacturing operations managers
- production engineers

Secondary users:
- maintenance and reliability teams
- data/IT teams supporting telemetry pipelines

## 4. Goals and Non-Goals

Goals:
- Provide a clear live status view for each machine and channel.
- Show utilization metrics across today, week, and month periods.
- Surface stale/disconnected telemetry quickly and clearly.
- Allow authorized users to update elapsed-hour and threshold configurations.
- Keep dashboard loading and refresh behavior resilient when backend data is partially available.

Non-goals (current scope):
- User authentication/authorization UI.
- Historical analytics beyond the currently implemented short-term charting window.
- Multi-site portfolio management.
- Native mobile apps.

## 5. Core User Flows

1) Monitor machine health and utilization
- User opens dashboard.
- App fetches machine list and initial dashboard snapshot.
- User sees machine status, power, KPI cards, and utilization chart.

2) Switch machine or channel
- User selects a machine and channel.
- App loads selected context and updates KPIs/chart/status indicators.

3) Update operational targets
- User edits elapsed hours and power threshold values.
- App validates values and posts updates through API routes.
- User receives success/failure notifications.

4) Respond to telemetry degradation
- System shows stale/partial/disconnected warnings.
- User can identify affected machine/channel and investigate source feed.

## 6. Functional Requirements

FR-1 Machine and channel selection
- Must list available machines.
- Must support channel-level context per machine.

FR-2 Dashboard metrics and status
- Must display machine status: RUNNING, IDLE, DISCONNECTED, UNKNOWN.
- Must display current active power value.
- Must display period metrics for today/week/month including runtime, elapsed, utilization, and highest-score fields where available.

FR-3 History visualization
- Must render a 7-day utilization/history chart when data is available.
- Must show graceful fallback when chart data is unavailable.

FR-4 Data freshness signaling
- Must detect stale telemetry (threshold currently implemented as >5 minutes in client logic).
- Must display warning states for stale, partial, and disconnected telemetry.

FR-5 Configuration management
- Must allow updating elapsed target hours per machine.
- Must allow updating channel configuration values (hours and thresholds) with non-negative numeric validation.
- Must enforce elapsed-hours business rule range of 1..24 where elapsed-specific endpoint is used.

FR-6 API surface
- Must expose server routes for bootstrap, machines, dashboard data, elapsed update, configurations update, websocket auth, and websocket config.
- Must return structured JSON errors with appropriate 4xx/5xx semantics.

FR-7 Logging and observability
- Must use structured logger utility with runtime-aware behavior.
- Must redact sensitive keys in logs.

## 7. Non-Functional Requirements

NFR-1 Reliability
- API routes should avoid cached stale reads for live operational views (`Cache-Control: no-store` where implemented).

NFR-2 Performance
- Initial dashboard load should return at least one machine context quickly via bootstrap endpoint.
- Client should support responsive interactions when switching machine/channel.

NFR-3 Security and privacy
- Secrets must remain in environment variables and CI secrets.
- Logs must never expose tokens/passwords.

NFR-4 Maintainability
- Shared contracts should live in `src/types/dashboard.ts`.
- API integration boundaries should remain in `src/lib/protonest/*` and `src/lib/api.ts`.

NFR-5 Accessibility
- Dashboard controls should include meaningful ARIA labels (already present in dashboard copy definitions).

## 8. Data and Integration Requirements

Primary integration:
- Protonest API base and auth credentials from environment config.

Required environment groups:
- Protonest server credentials and project configuration
- websocket/public realtime config
- application logging toggles

Integration behavior:
- Server config should fail fast when required env values are missing.
- Public websocket config should normalize URL/topic prefixes and support disabled mode.

## 9. Success Metrics

Operational metrics:
- Dashboard data load success rate
- configuration update success rate
- websocket connection success/reconnect rate
- stale/disconnected incident detection latency

Product metrics:
- weekly active supervisor usage
- median time to detect disconnected telemetry
- reduction in manual status-check effort per shift

## 10. Release Plan

Phase 1 (current baseline)
- Live dashboard, machine/channel switching, KPI views, charting, and configuration updates.

Phase 2
- Add test runner and critical API/hook test coverage.
- Add user-role-aware safeguards for configuration changes.

Phase 3
- Enhanced historical analytics and alerting workflows.
- Optional export/reporting and site-level rollups.

## 11. Risks and Mitigations

Risk: telemetry outages or stale feeds reduce operator trust.
- Mitigation: explicit stale/partial/disconnected UI states and clear warning copy.

Risk: invalid config updates impact production targets.
- Mitigation: strict numeric validation and typed API contracts.

Risk: environment misconfiguration blocks startup/integration.
- Mitigation: fail-fast config parsing and installation documentation with env template.

Risk: missing automated tests increases regression risk.
- Mitigation: prioritize test infrastructure in next phase and enforce lint/build gates.

## 12. Open Questions

- What user roles are allowed to modify elapsed and threshold settings?
- What SLA should define acceptable telemetry staleness by machine type?
- Should stale/disconnected events trigger notifications outside the dashboard?
- What historical time window is required beyond the current short-term trend?
- What audit trail is required for configuration changes?

## 13. Current Implementation Notes and Gaps

- Baseline target exists in domain types/UI (`baseline.weeklyHours`) but current integration path commonly returns it as null.
- Two configuration write pathways exist (`/configurations/[machineId]` and `/elapsed/[machineId]`), which should be consolidated into one canonical flow.
- `PROTONEST_PROJECT_ID` is documented in environment setup but is not currently consumed by runtime config code.
- No automated test runner is configured yet, so regression protection relies on lint/build and manual validation.

## 14. Acceptance Criteria (Current Product)

- User can load dashboard and view machine status, power, and KPI summaries.
- User can switch machine/channel and see corresponding data updates.
- User can update elapsed/threshold values and receive clear success/failure feedback.
- User sees clear telemetry warning states for stale/partial/disconnected scenarios.
- API routes return predictable JSON with valid status codes for success and error paths.
