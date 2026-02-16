export type MachineStatus = "RUNNING" | "IDLE" | "DISCONNECTED" | "UNKNOWN";

export interface DayHistory {
  date: string;
  runtimeMin: number | null;
  elapsedMin: number | null;
  occupancyPct: number | null;
}

export interface PeriodMetrics {
  runtimeMin: number | null;
  elapsedMin: number | null;
  occupancyPct: number | null;
  highestScorePct: number | null;
}

export interface DashboardPeriods {
  today: PeriodMetrics;
  week: PeriodMetrics;
  month: PeriodMetrics;
}

export interface MachineListItem {
  id: string;
  name: string;
  state: MachineStatus;
}

export interface DashboardMachine {
  id: string;
  name: string;
  state: MachineStatus;
  powerWatts: number | null;
  lastUpdated: string;
}

export interface DashboardData {
  machine: DashboardMachine;
  periods: DashboardPeriods;
  history7d: DayHistory[];
  sheet: {
    mode: "embed" | "link";
    url: string;
  } | null;
  baseline: {
    weeklyHours: number | null;
  } | null;
}
