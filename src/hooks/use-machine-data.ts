"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  connectRealtimeMachineUpdates,
  fetchBootstrapData,
  fetchDashboardData,
  type RealtimeStateSnapshot,
  updateConfigurations,
} from "@/src/lib/api";
import { createLogger } from "@/src/lib/logging";
import type { DashboardData, DayHistory, MachineListItem } from "@/src/types/dashboard";

const STALE_AFTER_MS = 5 * 60 * 1000;
const log = createLogger("use-machine-data", "client");

export interface InitialDashboardSnapshot {
  machineId: string;
  channelId: string | null;
  data: DashboardData;
}

function toChannelSlot(channelId: string, stateChannelIds: string[]): 1 | 2 | null {
  if (channelId.endsWith(":0")) {
    return 1;
  }
  if (channelId.endsWith(":1")) {
    return 2;
  }

  const index = stateChannelIds.indexOf(channelId);
  if (index === 0) {
    return 1;
  }
  if (index === 1) {
    return 2;
  }

  return null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, value);
}

function toPercent(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return null;
  }

  if (numeric <= 1) {
    return numeric * 100;
  }

  return numeric;
}

function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return Math.max(0, numeric);
    }
  }

  return null;
}

function readNonNegativeNumberFromKeys(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    if (!(key in source)) {
      continue;
    }

    const next = toNonNegativeNumber(source[key]);
    if (next !== null) {
      return next;
    }
  }

  return null;
}

function readPercentFromKeys(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    if (!(key in source)) {
      continue;
    }

    const raw = source[key];
    const numeric =
      typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : null;

    if (numeric === null || !Number.isFinite(numeric)) {
      continue;
    }

    const next = toPercent(numeric);
    if (next !== null) {
      return next;
    }
  }

  return null;
}

function toIsoFromDdMmYyyy(value: string): string | null {
  const [dayRaw, monthRaw, yearRaw] = value.split("-");
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toHistory(payload: Record<string, unknown>): DayHistory[] {
  const rows: DayHistory[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (
      key === "status" ||
      key.endsWith("_utl") ||
      key.endsWith("_elapsedhr")
    ) {
      continue;
    }

    const isoDate = toIsoFromDdMmYyyy(key);
    if (!isoDate) {
      continue;
    }

    const runtimeHours = toFiniteNumber(value);
    const utilizationPct = toPercent(payload[`${key}_utl`]);
    const elapsedHours = toNonNegativeNumber(payload[`${key}_elapsedhr`]) ?? 0;

    rows.push({
      date: isoDate,
      runtimeHours,
      elapsedHours,
      utilizationPct,
    });
  }

  return rows.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function toMachineChannelKey(machineId: string | null, channelId: string | null): string | null {
  if (!machineId) {
    return null;
  }

  return `${machineId}::${channelId ?? "default"}`;
}

function parseChannelFromStateTopic(topic: string | null): string | null {
  if (!topic || !topic.startsWith("frontend/")) {
    return null;
  }

  const channel = topic.slice("frontend/".length).trim();
  return channel || null;
}

function applyRealtimeStateSnapshot(
  current: DashboardData,
  snapshot: RealtimeStateSnapshot,
): DashboardData {
  const payload = snapshot.payload;
  const history7d = payload ? toHistory(payload) : current.history7d;
  const latestDay = history7d.at(-1);

  const todayRuntime = latestDay?.runtimeHours ?? current.periods.today.runtimeHours;
  const todayUtilization = latestDay?.utilizationPct ?? current.periods.today.utilizationPct;
  const todayElapsed =
    (payload
      ? readNonNegativeNumberFromKeys(payload, [
          "today_elapsedhr",
          "todayElapsedhr",
          "todayElapsedHr",
        ])
      : null) ??
    latestDay?.elapsedHours ??
    current.periods.today.elapsedHours ??
    0;

  const thisWeekRuntime = payload
    ? toFiniteNumber(payload.thisweek) ?? current.periods.week.runtimeHours
    : current.periods.week.runtimeHours;
  const thisMonthRuntime = payload
    ? toFiniteNumber(payload.thismonth) ?? current.periods.month.runtimeHours
    : current.periods.month.runtimeHours;
  const thisWeekUtilization = payload
    ? readPercentFromKeys(payload, ["thisweek_utl", "thisWeek_utl", "thisWeekUtl"]) ??
      current.periods.week.utilizationPct
    : current.periods.week.utilizationPct;
  const thisMonthUtilization = payload
    ? readPercentFromKeys(payload, ["thismonth_utl", "thisMonth_utl", "thisMonthUtl"]) ??
      current.periods.month.utilizationPct
    : current.periods.month.utilizationPct;
  const weekHigh = payload
    ? readPercentFromKeys(payload, ["weekHighutil", "weekHighUtil"]) ??
      current.periods.week.highestScorePct
    : current.periods.week.highestScorePct;
  const monthHigh = payload
    ? readPercentFromKeys(payload, ["monthHighutil", "monthHighUtil"]) ??
      current.periods.month.highestScorePct
    : current.periods.month.highestScorePct;
  const thisWeekElapsed = payload
    ? readNonNegativeNumberFromKeys(payload, [
        "thisWeek_elapsedhr",
        "thisweek_elapsedhr",
        "thisWeekElapsedhr",
        "thisWeekElapsedHr",
      ]) ??
      current.periods.week.elapsedHours ??
      0
    : current.periods.week.elapsedHours ?? 0;
  const thisMonthElapsed = payload
    ? readNonNegativeNumberFromKeys(payload, [
        "thisMonth_elapsedhr",
        "thismonth_elapsedhr",
        "thisMonthElapsedhr",
        "thisMonthElapsedHr",
      ]) ??
      current.periods.month.elapsedHours ??
      0
    : current.periods.month.elapsedHours ?? 0;

  return {
    ...current,
    machine: {
      ...current.machine,
      status: snapshot.status ?? current.machine.status,
      lastUpdated: snapshot.timestamp ?? new Date().toISOString(),
    },
    periods: {
      today: {
        ...current.periods.today,
        runtimeHours: todayRuntime,
        utilizationPct: todayUtilization,
        elapsedHours: todayElapsed,
      },
      week: {
        ...current.periods.week,
        runtimeHours: thisWeekRuntime,
        utilizationPct: thisWeekUtilization,
        elapsedHours: thisWeekElapsed,
        highestScorePct: weekHigh,
      },
      month: {
        ...current.periods.month,
        runtimeHours: thisMonthRuntime,
        utilizationPct: thisMonthUtilization,
        elapsedHours: thisMonthElapsed,
        highestScorePct: monthHigh,
      },
    },
    history7d,
  };
}

function createRealtimeBootstrapData(machineId: string): DashboardData {
  return {
    machine: {
      id: machineId,
      name: machineId,
      status: "UNKNOWN",
      powerWatts: null,
      lastUpdated: new Date().toISOString(),
    },
    configurations: {
      channel1Hours: 0,
      channel2Hours: 0,
      channel1Threshold: 0,
      channel2Threshold: 0,
    },
    periods: {
      today: {
        runtimeHours: null,
        elapsedHours: 0,
        utilizationPct: null,
        highestScorePct: null,
      },
      week: {
        runtimeHours: null,
        elapsedHours: 0,
        utilizationPct: null,
        highestScorePct: null,
      },
      month: {
        runtimeHours: null,
        elapsedHours: 0,
        utilizationPct: null,
        highestScorePct: null,
      },
    },
    history7d: [],
    sheet: null,
    baseline: null,
  };
}

export function useMachineList() {
  const [machines, setMachines] = useState<MachineListItem[]>([]);
  const [initialDashboard, setInitialDashboard] = useState<InitialDashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMachines = useCallback(async (refresh = false) => {
    log.debug("machine_list_load_start", { refresh });

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const payload = await fetchBootstrapData();
      setMachines(payload.machines);
      setInitialDashboard(payload.initialDashboard);
      log.info("machine_list_load_success", {
        count: payload.machines.length,
        hasInitialDashboard: Boolean(payload.initialDashboard),
        refresh,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load machine list.";
      setError(message);
      log.error("machine_list_load_failed", {
        message,
        refresh,
      });
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      await loadMachines(false);
      if (!mounted) {
        return;
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadMachines]);

  const refetch = useCallback(async () => {
    await loadMachines(true);
  }, [loadMachines]);

  return { machines, initialDashboard, isLoading, isRefreshing, error, refetch };
}

export function useMachineData(
  machineId: string | null,
  channelId: string | null,
  stateChannelIds: string[],
  initialSnapshot: InitialDashboardSnapshot | null = null,
) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingElapsed, setIsUpdatingElapsed] = useState(false);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const machineChannelKey = useMemo(
    () => toMachineChannelKey(machineId, channelId),
    [channelId, machineId],
  );
  const consumedInitialKeyRef = useRef<string | null>(null);

  const loadDashboardData = useCallback(
    async (silent = false) => {
      if (!machineId || !machineChannelKey) {
        setData(null);
        setError(null);
        setIsInitialLoading(false);
        return;
      }

      log.debug("machine_dashboard_load_start", {
        machineId,
        channelId,
        key: machineChannelKey,
        silent,
      });

      if (silent) {
        setIsRefreshing(true);
      } else {
        const initialKey = toMachineChannelKey(initialSnapshot?.machineId ?? null, initialSnapshot?.channelId ?? null);
        const canUseInitialSnapshot =
          initialSnapshot !== null &&
          initialKey !== null &&
          machineChannelKey === initialKey &&
          consumedInitialKeyRef.current !== initialKey;

        if (canUseInitialSnapshot) {
          setData(initialSnapshot.data);
          setIsInitialLoading(false);
          setError(null);
          consumedInitialKeyRef.current = initialKey;
          void loadDashboardData(true);
          return;
        }

        setIsInitialLoading(true);
      }

      try {
        const nextData = await fetchDashboardData(machineId, channelId);
        setData(nextData);
        setError(null);
        log.info("machine_dashboard_load_success", {
          machineId,
          channelId,
          status: nextData.machine.status,
          lastUpdated: nextData.machine.lastUpdated,
        });
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load dashboard data.";
        setError(message);
        log.error("machine_dashboard_load_failed", {
          machineId,
          channelId,
          silent,
          message,
        });
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [channelId, initialSnapshot, machineChannelKey, machineId],
  );

  useEffect(() => {
    if (!machineChannelKey) {
      setData(null);
      setError(null);
      setIsInitialLoading(false);
      return;
    }

    void loadDashboardData(false);
  }, [loadDashboardData, machineChannelKey]);

  useEffect(() => {
    if (!machineId) {
      return;
    }

    const unsubscribe = connectRealtimeMachineUpdates({
      machineId,
      channelId,
      stateChannelIds,
      onStateTopicMessage: (nextState) => {
        const topicChannel = parseChannelFromStateTopic(nextState.topic);
        if (topicChannel && channelId && topicChannel !== channelId) {
          return;
        }

        setData((current) => {
          const base = current ?? createRealtimeBootstrapData(machineId);
          return applyRealtimeStateSnapshot(base, nextState);
        });
        setError(null);

        log.debug("machine_realtime_message", {
          machineId,
          topic: nextState.topic,
          status: nextState.status,
          hasPayload: Boolean(nextState.payload),
        });
      },
      onPowerUpdate: (powerWatts) => {
        setData((current) => {
          if (!machineChannelKey) {
            return current;
          }

          const base = current ?? createRealtimeBootstrapData(machineId);

          const next = {
            ...base,
            machine: {
              ...base.machine,
              powerWatts,
              lastUpdated: new Date().toISOString(),
            },
          };

          return next;
        });
        setError(null);
      },
      onError: (message) => {
        setError(message);
        log.warn("machine_realtime_error", {
          machineId,
          message,
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, [channelId, machineChannelKey, machineId, stateChannelIds]);

  const isStale = useMemo(() => {
    if (!data?.machine.lastUpdated) {
      return false;
    }
    const lastUpdatedMs = new Date(data.machine.lastUpdated).getTime();
    return Date.now() - lastUpdatedMs > STALE_AFTER_MS;
  }, [data?.machine.lastUpdated]);

  const saveElapsedHours = useCallback(
    async (hours: number) => {
      if (!machineId) {
        throw new Error("No machine selected.");
      }

      if (!channelId) {
        throw new Error("No channel selected.");
      }

      const slot = toChannelSlot(channelId, stateChannelIds);
      if (!slot) {
        throw new Error(`Cannot map channel '${channelId}' to configuration slot.`);
      }

      const current = data?.configurations ?? {
        channel1Hours: 0,
        channel2Hours: 0,
        channel1Threshold: 0,
        channel2Threshold: 0,
      };

      const payload = {
        channel1Hours: slot === 1 ? hours : current.channel1Hours,
        channel2Hours: slot === 2 ? hours : current.channel2Hours,
        channel1Threshold: current.channel1Threshold,
        channel2Threshold: current.channel2Threshold,
      };

      setIsUpdatingElapsed(true);
      setError(null);

      try {
        await updateConfigurations(machineId, payload);
        await loadDashboardData(true);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update elapsed hours.";
        setError(message);
        log.error("machine_elapsed_update_failed", {
          machineId,
          hours,
          message,
        });
        throw caughtError;
      } finally {
        setIsUpdatingElapsed(false);
      }
    },
    [
      channelId,
      data?.configurations,
      loadDashboardData,
      machineId,
      stateChannelIds,
    ],
  );

  const savePowerThreshold = useCallback(
    async (targetChannelId: string, threshold: number) => {
      if (!machineId) {
        throw new Error("No machine selected.");
      }

      if (!Number.isFinite(threshold) || threshold < 0) {
        throw new Error("Threshold must be a non-negative number.");
      }

      const slot = toChannelSlot(targetChannelId, stateChannelIds);
      if (!slot) {
        throw new Error(`Cannot map channel '${targetChannelId}' to configuration slot.`);
      }

      const current = data?.configurations ?? {
        channel1Hours: 0,
        channel2Hours: 0,
        channel1Threshold: 0,
        channel2Threshold: 0,
      };

      const payload = {
        channel1Hours: current.channel1Hours,
        channel2Hours: current.channel2Hours,
        channel1Threshold:
          slot === 1 ? threshold : current.channel1Threshold,
        channel2Threshold:
          slot === 2 ? threshold : current.channel2Threshold,
      };

      setIsUpdatingThreshold(true);
      setError(null);

      try {
        await updateConfigurations(machineId, payload);
        await loadDashboardData(true);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update power threshold.";
        setError(message);
        log.error("machine_threshold_update_failed", {
          machineId,
          targetChannelId,
          threshold,
          message,
        });
        throw caughtError;
      } finally {
        setIsUpdatingThreshold(false);
      }
    },
    [
      data?.configurations,
      loadDashboardData,
      machineId,
      stateChannelIds,
    ],
  );

  return {
    data,
    error,
    isInitialLoading,
    isRefreshing,
    isUpdatingElapsed,
    isUpdatingThreshold,
    isStale,
    refetch: loadDashboardData,
    saveElapsedHours,
    savePowerThreshold,
  };
}
