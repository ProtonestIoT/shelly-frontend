"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  connectRealtimeMachineUpdates,
  fetchDashboardData,
  fetchMachineList,
} from "@/src/lib/api";
import { createLogger } from "@/src/lib/logging";
import type { DashboardData, MachineListItem } from "@/src/types/dashboard";

const STALE_AFTER_MS = 5 * 60 * 1000;
const log = createLogger("use-machine-data", "client");

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

export function useMachineData(machineId: string | null, pollIntervalMs = 10000) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(
    async (silent = false) => {
      if (!machineId) {
        setData(null);
        setError(null);
        setIsInitialLoading(false);
        return;
      }

      log.debug("machine_dashboard_load_start", {
        machineId,
        silent,
      });

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const nextData = await fetchDashboardData(machineId);
        setData(nextData);
        setError(null);
        log.info("machine_dashboard_load_success", {
          machineId,
          state: nextData.machine.state,
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
          silent,
          message,
        });
        if (!silent) {
          setData(null);
        }
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [machineId],
  );

  useEffect(() => {
    void loadDashboardData(false);

    if (!machineId) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadDashboardData(true);
    }, pollIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadDashboardData, machineId, pollIntervalMs]);

  useEffect(() => {
    if (!machineId) {
      return;
    }

    const unsubscribe = connectRealtimeMachineUpdates({
      machineId,
      onStateTopicMessage: () => {
        log.debug("machine_realtime_message", {
          machineId,
        });
        void loadDashboardData(true);
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
  }, [loadDashboardData, machineId]);

  const isStale = useMemo(() => {
    if (!data?.machine.lastUpdated) {
      return false;
    }
    const lastUpdatedMs = new Date(data.machine.lastUpdated).getTime();
    return Date.now() - lastUpdatedMs > STALE_AFTER_MS;
  }, [data?.machine.lastUpdated]);

  return {
    data,
    error,
    isInitialLoading,
    isRefreshing,
    isStale,
    refetch: loadDashboardData,
  };
}
