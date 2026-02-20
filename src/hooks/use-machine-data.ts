"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  connectRealtimeMachineUpdates,
  fetchDashboardData,
  fetchMachineList,
  type RealtimeStateSnapshot,
  updateElapsedTime,
} from "@/src/lib/api";
import { createLogger } from "@/src/lib/logging";
import type { DashboardData, DayHistory, MachineListItem } from "@/src/types/dashboard";

const STALE_AFTER_MS = 5 * 60 * 1000;
const log = createLogger("use-machine-data", "client");

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

  if (numeric <= 100) {
    return numeric;
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
    if (key === "status" || key.endsWith("_utl")) {
      continue;
    }

    const isoDate = toIsoFromDdMmYyyy(key);
    if (!isoDate) {
      continue;
    }

    const runtimeHours = toFiniteNumber(value);
    const utilizationPct = toPercent(payload[`${key}_utl`]);

    rows.push({
      date: isoDate,
      runtimeHours,
      elapsedHours: 0,
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

  const thisWeekRuntime = payload
    ? toFiniteNumber(payload.thisweek) ?? current.periods.week.runtimeHours
    : current.periods.week.runtimeHours;
  const thisMonthRuntime = payload
    ? toFiniteNumber(payload.thismonth) ?? current.periods.month.runtimeHours
    : current.periods.month.runtimeHours;
  const thisWeekUtilization = payload
    ? toPercent(payload.thisweek_utl) ?? current.periods.week.utilizationPct
    : current.periods.week.utilizationPct;
  const thisMonthUtilization = payload
    ? toPercent(payload.thismonth_utl) ?? current.periods.month.utilizationPct
    : current.periods.month.utilizationPct;
  const weekHigh = payload
    ? toPercent(payload.weekHighutil) ?? current.periods.week.highestScorePct
    : current.periods.week.highestScorePct;
  const monthHigh = payload
    ? toPercent(payload.monthHighutil) ?? current.periods.month.highestScorePct
    : current.periods.month.highestScorePct;

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
        elapsedHours: current.periods.today.elapsedHours ?? 0,
      },
      week: {
        ...current.periods.week,
        runtimeHours: thisWeekRuntime,
        utilizationPct: thisWeekUtilization,
        elapsedHours: current.periods.week.elapsedHours ?? 0,
        highestScorePct: weekHigh,
      },
      month: {
        ...current.periods.month,
        runtimeHours: thisMonthRuntime,
        utilizationPct: thisMonthUtilization,
        elapsedHours: current.periods.month.elapsedHours ?? 0,
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
    periods: {
      today: {
        runtimeHours: null,
        elapsedHours: null,
        utilizationPct: null,
        highestScorePct: null,
      },
      week: {
        runtimeHours: null,
        elapsedHours: null,
        utilizationPct: null,
        highestScorePct: null,
      },
      month: {
        runtimeHours: null,
        elapsedHours: null,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMachines() {
      log.debug("machine_list_load_start");
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchMachineList();
        if (!mounted) {
          return;
        }
        setMachines(data);
        log.info("machine_list_load_success", {
          count: data.length,
        });
      } catch (caughtError) {
        if (!mounted) {
          return;
        }
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load machine list.";
        setError(message);
        log.error("machine_list_load_failed", {
          message,
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadMachines();

    return () => {
      mounted = false;
    };
  }, []);

  return { machines, isLoading, error };
}

export function useMachineData(
  machineId: string | null,
  channelId: string | null,
  stateChannelIds: string[],
) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingElapsed, setIsUpdatingElapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, DashboardData>>({});
  const loadedKeyRef = useRef<Set<string>>(new Set());
  const machineChannelKey = useMemo(
    () => toMachineChannelKey(machineId, channelId),
    [channelId, machineId],
  );

  const invalidateMachineCache = useCallback((targetMachineId: string) => {
    const keyPrefix = `${targetMachineId}::`;
    const nextCache: Record<string, DashboardData> = {};

    for (const [key, value] of Object.entries(cacheRef.current)) {
      if (!key.startsWith(keyPrefix)) {
        nextCache[key] = value;
      }
    }

    cacheRef.current = nextCache;

    loadedKeyRef.current = new Set(
      [...loadedKeyRef.current].filter((key) => !key.startsWith(keyPrefix)),
    );
  }, []);

  const loadDashboardData = useCallback(
    async (silent = false, force = false) => {
      if (!machineId || !machineChannelKey) {
        setData(null);
        setError(null);
        setIsInitialLoading(false);
        return;
      }

      if (!force && loadedKeyRef.current.has(machineChannelKey)) {
        const cached = cacheRef.current[machineChannelKey];
        if (cached) {
          setData(cached);
          setError(null);
          setIsInitialLoading(false);
        }
        return;
      }

      log.debug("machine_dashboard_load_start", {
        machineId,
        channelId,
        key: machineChannelKey,
        silent,
        force,
      });

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const nextData = await fetchDashboardData(machineId, channelId);
        setData(nextData);
        cacheRef.current[machineChannelKey] = nextData;
        loadedKeyRef.current.add(machineChannelKey);
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
          force,
          message,
        });
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [channelId, machineChannelKey, machineId],
  );

  useEffect(() => {
    if (!machineChannelKey) {
      setData(null);
      setError(null);
      setIsInitialLoading(false);
      return;
    }

    const cached = cacheRef.current[machineChannelKey];
    if (cached) {
      setData(cached);
      setError(null);
      void loadDashboardData(true, true);
      return;
    }

    void loadDashboardData(false, true);
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
        const targetKey = toMachineChannelKey(machineId, topicChannel ?? channelId);

        if (targetKey && cacheRef.current[targetKey]) {
          const nextCached = applyRealtimeStateSnapshot(
            cacheRef.current[targetKey],
            nextState,
          );
          cacheRef.current[targetKey] = nextCached;

          if (targetKey === machineChannelKey) {
            setData(nextCached);
            setError(null);
          }
        } else if (targetKey) {
          const bootstrap = createRealtimeBootstrapData(machineId);
          const nextCached = applyRealtimeStateSnapshot(bootstrap, nextState);
          cacheRef.current[targetKey] = nextCached;
          loadedKeyRef.current.add(targetKey);

          if (targetKey === machineChannelKey) {
            setData(nextCached);
            setError(null);
          }
        } else if (machineChannelKey) {
          setData((current) => {
            const base =
              current ??
              cacheRef.current[machineChannelKey] ??
              createRealtimeBootstrapData(machineId);
            const next = applyRealtimeStateSnapshot(base, nextState);
            cacheRef.current[machineChannelKey] = next;
            loadedKeyRef.current.add(machineChannelKey);
            return next;
          });
          setError(null);
        }

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

          const base =
            current ??
            cacheRef.current[machineChannelKey] ??
            createRealtimeBootstrapData(machineId);

          const next = {
            ...base,
            machine: {
              ...base.machine,
              powerWatts,
              lastUpdated: new Date().toISOString(),
            },
          };

          cacheRef.current[machineChannelKey] = next;
          loadedKeyRef.current.add(machineChannelKey);

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

      setIsUpdatingElapsed(true);
      setError(null);

      try {
        await updateElapsedTime(machineId, hours);
        invalidateMachineCache(machineId);
        await loadDashboardData(true, true);
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
    [invalidateMachineCache, loadDashboardData, machineId],
  );

  return {
    data,
    error,
    isInitialLoading,
    isRefreshing,
    isUpdatingElapsed,
    isStale,
    refetch: loadDashboardData,
    saveElapsedHours,
  };
}
