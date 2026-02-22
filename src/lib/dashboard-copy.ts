export const DASHBOARD_COPY = {
  statusCurrentTooltip: "Current machine status",
  powerCurrentTooltip: "Current active power",
  kpiRuntimeTodayTooltip: "Machine operating hours today.",
  kpiRuntimeWeekTooltip: "Machine operating hours in this week.",
  kpiRuntimeMonthTooltip: "Machine operating hours in this month.",
  kpiElapsedTodayTooltip:
    "Elapsed is the user-defined duration set for machine usage today.",
  kpiElapsedWeekTooltip:
    "Elapsed is the user-defined duration set for machine usage in this week.",
  kpiElapsedMonthTooltip:
    "Elapsed is the user-defined duration set for machine usage in this month.",
  kpiBestTooltip:
    "Highest utilization percentage achieved in any single day within this period.",
  kpiWeeklyBaselineTooltip:
    "Weekly baseline represents the expected productive operating hours target for one calendar week.",
  machineSwitcherTriggerAria: "Select machine",
  machineSwitcherListAria: "Machine list",
  machineSwitcherPlaceholder: "Select Machine",
  channelSwitcherTriggerAria: "Select channel",
  channelSwitcherListAria: "Channel list",
  channelSwitcherPlaceholder: "Select Channel",
  elapsedRangeValidation: (min: number, max: number) =>
    `Elapsed time must be between ${min} and ${max} hours.`,
  thresholdValidation: "Power threshold must be a non-negative number.",
  elapsedInputPlaceholder: (min: number, max: number) =>
    `Enter ${min}-${max} hours`,
  thresholdInputPlaceholder: "Enter threshold",
  elapsedUpdateSuccess: "Elapsed time updated.",
  elapsedUpdateFailure: "Failed to update elapsed time.",
  thresholdUpdateSuccess: "Power threshold updated.",
  thresholdUpdateFailure: "Failed to update power threshold.",
  staleBadge: "Stale (>5m)",
  nonBlockingWarningTitle: "Data refresh warning",
  loadingAriaLabel: "Loading dashboard data",
  telemetryDisconnectedTitle: "Machine Telemetry Disconnected",
  telemetryPartialTitle: "Machine Telemetry Partial",
  telemetryStaleTitle: "Telemetry Stale",
  telemetryDisconnectedBody:
    "No live feed detected from machine power source. Verify sensor link and gateway connectivity.",
  telemetryPartialBody:
    "Realtime runtime and power are available, but machine status mapping is not configured yet.",
  telemetryStaleBody:
    "Live feed is older than 5 minutes. Validate network path or data source health.",
  noDataTitle: "No Data",
  noDataPrefix: "Unable to load dashboard data.",
  chartTooltipUtilizationLabel: "Utilization",
  chartTooltipRuntimeLabel: "Runtime",
  chartTooltipElapsedLabel: "Elapsed",
  statusCurrentAria: "Current machine status details",
  powerCurrentAria: "Current active power details",
  metricDetailsAria: (label: string) => `${label} details`,
  weeklyBaselineAria: "Weekly baseline details",
  gaugeAria: (label: string) => `${label} gauge details`,
  gaugeUtilization: (label: string, normalized: number, statusText: string) =>
    `${label} utilization: ${normalized}% - ${statusText}`,
  gaugeUnavailable: (label: string) =>
    `${label} utilization is unavailable from current API`,
} as const;
