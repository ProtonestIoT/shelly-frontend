export const TOOLTIP_COPY = {
  statusMeaning:
    "Machine state is reported by Protonest state telemetry. RUNNING and IDLE come directly from the latest device status feed.",
  statusCurrent:
    "Current machine operating state from the latest state topic message for the selected device.",
  powerCurrent:
    "Instantaneous electrical power draw from the monitored CNC circuit. Higher values usually represent active spindle/tool movement.",
  kpiRuntime:
    "Runtime is the sum of machine operating hours during the selected period.",
  kpiElapsed:
    "Elapsed is the total measured hours in the selected period.",
  kpiBest:
    "Best Score is the highest utilization percentage achieved in any single session within this period.",
  kpiWeeklyBaseline:
    "Weekly baseline represents the expected productive operating hours target for one calendar week.",
} as const;
