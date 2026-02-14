export type MachineStatus = "RUNNING" | "IDLE" | "DISCONNECTED";

export interface DayHistory {
  date: string;
  runtimeMin: number;
  elapsedMin: number;
  occupancyPct: number;
}

export interface PeriodMetrics {
  runtimeMin: number;
  elapsedMin: number;
  occupancyPct: number;
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
  powerWatts: number;
  lastUpdated: string;
}

export interface DashboardData {
  machine: DashboardMachine;
  periods: DashboardPeriods;
  history7d: DayHistory[];
  sheet: {
    mode: "embed" | "link";
    url: string;
  };
  baseline: {
    weeklyHours: number;
  };
}
