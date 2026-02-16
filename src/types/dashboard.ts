export type MachineStatus = "RUNNING" | "IDLE" | "DISCONNECTED" | "UNKNOWN";

export interface DayHistory {
  date: string;
  runtimeHours: number | null;
  elapsedHours: number | null;
  utilizationPct: number | null;
}

export interface PeriodMetrics {
  runtimeHours: number | null;
  elapsedHours: number | null;
  utilizationPct: number | null;
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
  status: MachineStatus;
  channels: string[];
}

export interface DashboardMachine {
  id: string;
  name: string;
  status: MachineStatus;
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
