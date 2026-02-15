export const TOOLTIP_COPY = {
  statusMeaning:
    "Machine state inferred from power signal thresholds. RUNNING reflects active cutting/rapid cycles, IDLE indicates powered but inactive, DISCONNECTED indicates no valid feed from source telemetry.",
  statusCurrent:
    "Current machine operating state based on the latest power draw sample and continuity of telemetry updates.",
  powerCurrent:
    "Instantaneous electrical power draw from the monitored CNC circuit. Higher values usually represent active spindle/tool movement.",
  kpiRuntime:
    "Runtime is the sum of intervals classified as active machine operation during the selected period.",
  kpiElapsed:
    "Elapsed is total observed period length. Occupancy = Runtime / Elapsed x 100.",
  kpiBest:
    "Best Score is the highest occupancy percentage achieved in any single session within this period.",
  kpiWeeklyBaseline:
    "Weekly baseline represents the expected productive operating hours target for one calendar week.",
} as const;
