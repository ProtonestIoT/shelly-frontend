import type { DashboardData, MachineListItem } from "@/src/types/dashboard";

export type {
  DashboardData,
  DashboardMachine,
  DashboardPeriods,
  DayHistory,
  MachineListItem,
  MachineStatus,
  PeriodMetrics,
} from "@/src/types/dashboard";

const machineList: MachineListItem[] = [
  { id: "cnc-01", name: "CNC-01", state: "RUNNING" },
  { id: "cnc-02", name: "CNC-02", state: "IDLE" },
  { id: "cnc-03", name: "CNC-03", state: "DISCONNECTED" },
];

function isoDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

const sharedSheetUrl =
  "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing";

const dashboardByMachineId: Record<string, DashboardData> = {
  "cnc-01": {
    machine: {
      id: "cnc-01",
      name: "Mazak VCN 530C",
      state: "RUNNING",
      powerWatts: 1240,
      lastUpdated: new Date().toISOString(),
    },
    periods: {
      today: { runtimeMin: 320, elapsedMin: 480, occupancyPct: 67, highestScorePct: 88 },
      week: {
        runtimeMin: 2140,
        elapsedMin: 3360,
        occupancyPct: 64,
        highestScorePct: 91,
      },
      month: {
        runtimeMin: 8120,
        elapsedMin: 12960,
        occupancyPct: 63,
        highestScorePct: 92,
      },
    },
    history7d: [
      { date: isoDaysAgo(6), runtimeMin: 270, elapsedMin: 480, occupancyPct: 56 },
      { date: isoDaysAgo(5), runtimeMin: 310, elapsedMin: 480, occupancyPct: 65 },
      { date: isoDaysAgo(4), runtimeMin: 330, elapsedMin: 480, occupancyPct: 69 },
      { date: isoDaysAgo(3), runtimeMin: 285, elapsedMin: 480, occupancyPct: 59 },
      { date: isoDaysAgo(2), runtimeMin: 340, elapsedMin: 480, occupancyPct: 71 },
      { date: isoDaysAgo(1), runtimeMin: 315, elapsedMin: 480, occupancyPct: 66 },
      { date: isoDaysAgo(0), runtimeMin: 320, elapsedMin: 480, occupancyPct: 67 },
    ],
    sheet: { mode: "embed", url: sharedSheetUrl },
    baseline: { weeklyHours: 38.5 },
  },
  "cnc-02": {
    machine: {
      id: "cnc-02",
      name: "Haas VF-2",
      state: "IDLE",
      powerWatts: 45,
      lastUpdated: new Date().toISOString(),
    },
    periods: {
      today: { runtimeMin: 190, elapsedMin: 480, occupancyPct: 40, highestScorePct: 61 },
      week: {
        runtimeMin: 1430,
        elapsedMin: 3360,
        occupancyPct: 43,
        highestScorePct: 67,
      },
      month: {
        runtimeMin: 5950,
        elapsedMin: 12960,
        occupancyPct: 46,
        highestScorePct: 72,
      },
    },
    history7d: [
      { date: isoDaysAgo(6), runtimeMin: 155, elapsedMin: 480, occupancyPct: 32 },
      { date: isoDaysAgo(5), runtimeMin: 210, elapsedMin: 480, occupancyPct: 44 },
      { date: isoDaysAgo(4), runtimeMin: 170, elapsedMin: 480, occupancyPct: 35 },
      { date: isoDaysAgo(3), runtimeMin: 215, elapsedMin: 480, occupancyPct: 45 },
      { date: isoDaysAgo(2), runtimeMin: 198, elapsedMin: 480, occupancyPct: 41 },
      { date: isoDaysAgo(1), runtimeMin: 205, elapsedMin: 480, occupancyPct: 43 },
      { date: isoDaysAgo(0), runtimeMin: 190, elapsedMin: 480, occupancyPct: 40 },
    ],
    sheet: { mode: "link", url: sharedSheetUrl },
    baseline: { weeklyHours: 38.5 },
  },
  "cnc-03": {
    machine: {
      id: "cnc-03",
      name: "DMG Mori CMX 1100",
      state: "DISCONNECTED",
      powerWatts: 0,
      lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    periods: {
      today: { runtimeMin: 30, elapsedMin: 480, occupancyPct: 6, highestScorePct: null },
      week: {
        runtimeMin: 600,
        elapsedMin: 3360,
        occupancyPct: 18,
        highestScorePct: 29,
      },
      month: {
        runtimeMin: 4080,
        elapsedMin: 12960,
        occupancyPct: 31,
        highestScorePct: 48,
      },
    },
    history7d: [
      { date: isoDaysAgo(6), runtimeMin: 95, elapsedMin: 480, occupancyPct: 20 },
      { date: isoDaysAgo(5), runtimeMin: 60, elapsedMin: 480, occupancyPct: 13 },
      { date: isoDaysAgo(4), runtimeMin: 25, elapsedMin: 480, occupancyPct: 5 },
      { date: isoDaysAgo(3), runtimeMin: 0, elapsedMin: 480, occupancyPct: 0 },
      { date: isoDaysAgo(2), runtimeMin: 110, elapsedMin: 480, occupancyPct: 23 },
      { date: isoDaysAgo(1), runtimeMin: 80, elapsedMin: 480, occupancyPct: 17 },
      { date: isoDaysAgo(0), runtimeMin: 30, elapsedMin: 480, occupancyPct: 6 },
    ],
    sheet: { mode: "link", url: sharedSheetUrl },
    baseline: { weeklyHours: 38.5 },
  },
};

function cloneData(data: DashboardData): DashboardData {
  return {
    ...data,
    machine: { ...data.machine },
    periods: {
      today: { ...data.periods.today },
      week: { ...data.periods.week },
      month: { ...data.periods.month },
    },
    history7d: data.history7d.map((row) => ({ ...row })),
    sheet: { ...data.sheet },
    baseline: { ...data.baseline },
  };
}

function applyLiveTimestamp(data: DashboardData): DashboardData {
  if (data.machine.state === "DISCONNECTED") {
    return data;
  }

  return {
    ...data,
    machine: {
      ...data.machine,
      lastUpdated: new Date().toISOString(),
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchMachineList(): Promise<MachineListItem[]> {
  await delay(180);
  return machineList.map((machine) => ({ ...machine }));
}

export async function fetchDashboardData(machineId: string): Promise<DashboardData> {
  await delay(240);
  const selected = dashboardByMachineId[machineId];

  if (!selected) {
    throw new Error("No dashboard data available for selected machine.");
  }

  return applyLiveTimestamp(cloneData(selected));
}
