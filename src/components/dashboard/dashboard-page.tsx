"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardCard from "@/src/components/dashboard/dashboard-card";
import {
  notifyChannelChanged,
  notifyDeviceChanged,
  notifyElapsedUpdateFailed,
  notifyElapsedUpdated,
} from "@/src/components/dashboard/change-notifications";
import ChannelSwitcher from "@/src/components/dashboard/channel-switcher";
import Gauge from "@/src/components/dashboard/gauge";
import KpiCard from "@/src/components/dashboard/kpi-card";
import MachineSwitcher from "@/src/components/dashboard/machine-switcher";
import SheetPanel from "@/src/components/dashboard/sheet-panel";
import StatusBlock from "@/src/components/dashboard/status-block";
import UtilizationChart from "@/src/components/dashboard/utilization-chart";
import { useMachineData, useMachineList } from "@/src/hooks/use-machine-data";
import {
  ELAPSED_HOURS_MAX,
  ELAPSED_HOURS_MIN,
  ELAPSED_HOURS_STEP,
  isElapsedHoursInRange,
} from "@/src/lib/elapsed";
import { formatTime } from "@/src/lib/format";

function SkeletonCard({ className }: { className?: string }) {
  return (
    <DashboardCard className={className}>
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-7 w-36 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
      </div>
    </DashboardCard>
  );
}

export default function DashboardPage() {
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [selectedChannelByMachine, setSelectedChannelByMachine] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => new Date());
  const [elapsedDraftByMachine, setElapsedDraftByMachine] = useState<Record<string, string>>({});
  const [elapsedSaveMessage, setElapsedSaveMessage] = useState<string | null>(null);

  const { machines, isLoading: machineListLoading, error: machineListError } = useMachineList();

  const activeMachineId = selectedMachineId ?? machines[0]?.id ?? null;
  const activeMachine = machines.find((machine) => machine.id === activeMachineId);
  const availableChannels = activeMachine?.channels ?? [];
  const activeChannel = (() => {
    if (!activeMachineId) {
      return null;
    }

    const selectedChannel = selectedChannelByMachine[activeMachineId];
    if (selectedChannel && availableChannels.includes(selectedChannel)) {
      return selectedChannel;
    }

    return availableChannels[0] ?? null;
  })();

  const { data, error, isInitialLoading, isRefreshing, isStale, isUpdatingElapsed, saveElapsedHours } =
    useMachineData(activeMachineId, activeChannel, availableChannels);

  const machinesWithLiveStatus = useMemo(
    () =>
      machines.map((machine) => {
        if (machine.id === activeMachineId && data) {
          return {
            ...machine,
            status: data.machine.status,
          };
        }

        return machine;
      }),
    [activeMachineId, data, machines],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const hasData = Boolean(data);
  const hasError = Boolean(machineListError || error);
  const isBusy = machineListLoading || isInitialLoading || isRefreshing;
  const hasConnectionAlert = Boolean(
    data && (isStale || data.machine.status === "DISCONNECTED" || data.machine.status === "UNKNOWN"),
  );
  const hasChartData = Boolean(data?.history7d?.length);
  const elapsedInput = (() => {
    if (!activeMachineId) {
      return "";
    }

    const draft = elapsedDraftByMachine[activeMachineId];
    if (draft !== undefined) {
      return draft;
    }

    const serverElapsed = data?.periods.today.elapsedHours;
    return typeof serverElapsed === "number" && Number.isFinite(serverElapsed)
      ? serverElapsed.toFixed(2)
      : "";
  })();

  async function handleElapsedSave() {
    const parsed = Number(elapsedInput);
    if (!Number.isFinite(parsed) || !isElapsedHoursInRange(parsed)) {
      const message = `Elapsed time must be between ${ELAPSED_HOURS_MIN} and ${ELAPSED_HOURS_MAX} hours.`;
      setElapsedSaveMessage(message);
      notifyElapsedUpdateFailed(message);
      return;
    }

    try {
      await saveElapsedHours(parsed);
      if (activeMachineId) {
        setElapsedDraftByMachine((current) => ({
          ...current,
          [activeMachineId]: parsed.toFixed(2),
        }));
      }
      setElapsedSaveMessage("Elapsed time updated.");
      notifyElapsedUpdated(parsed);
    } catch {
      const message = "Failed to update elapsed time.";
      setElapsedSaveMessage(message);
      notifyElapsedUpdateFailed(message);
    }
  }

  function handleMachineSelect(machineId: string) {
    if (machineId === activeMachineId) {
      return;
    }

    setSelectedMachineId(machineId);

    const machine = machines.find((item) => item.id === machineId);
    notifyDeviceChanged(machine?.name ?? machineId);
  }

  function handleChannelSelect(channel: string) {
    if (!activeMachineId) {
      return;
    }

    if (channel === activeChannel) {
      return;
    }

    setSelectedChannelByMachine((current) => ({
      ...current,
      [activeMachineId]: channel,
    }));
    notifyChannelChanged(channel);
  }

  return (
    <div className="min-h-screen text-foreground" aria-busy={isBusy}>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <DashboardCard className="relative z-40 mb-4 p-4 sm:mb-6 animate-fade-up-delay-1" compact>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <MachineSwitcher
                machines={machinesWithLiveStatus}
                selected={activeMachineId}
                onSelect={handleMachineSelect}
                disabled={machineListLoading}
              />

              <div className="inline-flex items-center gap-2">
                <span className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Channel
                </span>
                <ChannelSwitcher
                  channels={availableChannels}
                  selected={activeChannel}
                  disabled={machineListLoading || !activeMachineId || availableChannels.length === 0}
                  onSelect={handleChannelSelect}
                />
              </div>

              {hasData ? (
                <div className="flex flex-wrap items-center gap-2">
                  {isStale ? (
                    <span className="rounded-full border border-status-disconnected/30 bg-status-disconnected/10 px-2 py-1 text-xs font-medium text-status-disconnected">
                      Stale (&gt;5m)
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="text-left lg:text-right">
              <p className="font-data text-lg text-foreground">
                Local time: <time dateTime={now.toISOString()} suppressHydrationWarning>{formatTime(now)}</time>
              </p>
            </div>
          </div>
        </DashboardCard>

        {hasConnectionAlert ? (
          <DashboardCard
            className="mb-4 border-status-disconnected/40 bg-status-disconnected/8 p-3 animate-fade-up-delay-1"
            role="alert"
          >
              <p className="text-sm font-semibold text-status-disconnected uppercase tracking-wide">
               {data?.machine.status === "DISCONNECTED"
                  ? "Machine Telemetry Disconnected"
                  : data?.machine.status === "UNKNOWN"
                    ? "Machine Telemetry Partial"
                    : "Telemetry Stale"}
             </p>
             <p className="text-sm text-foreground">
                 {data?.machine.status === "DISCONNECTED"
                   ? "No live feed detected from machine power source. Verify sensor link and gateway connectivity."
                   : data?.machine.status === "UNKNOWN"
                     ? "Realtime runtime and power are available, but machine status mapping is not configured yet."
                   : "Live feed is older than 5 minutes. Validate network path or data source health."}
              </p>
          </DashboardCard>
        ) : null}

        {hasError ? (
          <DashboardCard
            className="flex min-h-[420px] items-center justify-center p-6 text-center animate-fade-up-delay-2"
            role="alert"
          >
            <div className="max-w-lg">
              <h2 className="text-xl tracking-wide uppercase">No Data</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Unable to load dashboard data. {machineListError ?? error}
              </p>
            </div>
          </DashboardCard>
        ) : null}

        {!hasError && isInitialLoading && !hasData ? (
          <div className="space-y-4 sm:space-y-6" role="status" aria-live="polite" aria-label="Loading dashboard data">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <SkeletonCard className="lg:min-h-[250px] animate-fade-up-delay-1" />
              <SkeletonCard className="animate-fade-up-delay-1" />
              <SkeletonCard className="animate-fade-up-delay-2" />
              <SkeletonCard className="animate-fade-up-delay-3" />
            </div>
            <DashboardCard className="animate-fade-up-delay-2">
              <div className="animate-pulse space-y-4">
                <div className="h-3 w-36 rounded bg-muted" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="h-40 rounded bg-muted" />
                  <div className="h-40 rounded bg-muted" />
                  <div className="h-40 rounded bg-muted" />
                </div>
              </div>
            </DashboardCard>
            <DashboardCard className="animate-fade-up-delay-3">
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-44 rounded bg-muted" />
                <div className="h-72 rounded bg-muted" />
              </div>
            </DashboardCard>
          </div>
        ) : null}

        {!hasError && data ? (
          <main className="relative z-0 space-y-4 sm:space-y-6">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="h-full animate-fade-up animate-fade-up-delay-1">
                <StatusBlock status={data.machine.status} powerWatts={data.machine.powerWatts} />
              </div>
              {data.periods?.today ? (
                <div className="h-full animate-fade-up animate-fade-up-delay-1">
                  <KpiCard
                    title="Today"
                    data={data.periods.today}
                  />
                </div>
              ) : null}
              {data.periods?.week ? (
                <div className="h-full animate-fade-up animate-fade-up-delay-2">
                  <KpiCard
                    title="This Week"
                    data={data.periods.week}
                    weeklyBaselineHours={data.baseline?.weeklyHours ?? undefined}
                  />
                </div>
              ) : null}
              {data.periods?.month ? (
                <div className="h-full animate-fade-up animate-fade-up-delay-3">
                  <KpiCard
                    title="This Month"
                    data={data.periods.month}
                  />
                </div>
              ) : null}
            </section>

            <DashboardCard className="animate-fade-up-delay-2 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    Elapsed Hours
                  </span>
                  <input
                    type="number"
                    min={ELAPSED_HOURS_MIN}
                    max={ELAPSED_HOURS_MAX}
                    step={ELAPSED_HOURS_STEP}
                    value={elapsedInput}
                    onChange={(event) => {
                      if (activeMachineId) {
                        setElapsedDraftByMachine((current) => ({
                          ...current,
                          [activeMachineId]: event.target.value,
                        }));
                      }
                      if (elapsedSaveMessage) {
                        setElapsedSaveMessage(null);
                      }
                    }}
                    className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none ring-offset-0 placeholder:text-muted-foreground focus:border-primary"
                    placeholder={`Enter ${ELAPSED_HOURS_MIN}-${ELAPSED_HOURS_MAX} hours`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    void handleElapsedSave();
                  }}
                  disabled={isUpdatingElapsed || !activeMachineId}
                  className="h-10 rounded-md border border-primary/40 bg-primary/12 px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingElapsed ? "Saving..." : "Update Elapsed"}
                </button>
              </div>
              {elapsedSaveMessage ? (
                <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                  {elapsedSaveMessage}
                </p>
              ) : null}
            </DashboardCard>

            {data.periods ? (
              <DashboardCard className="animate-fade-up-delay-2">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Gauge label="Today" value={data.periods.today.utilizationPct} />
                  <Gauge label="Week" value={data.periods.week.utilizationPct} />
                  <Gauge label="Month" value={data.periods.month.utilizationPct} />
                </div>
              </DashboardCard>
            ) : null}

            {hasChartData ? (
              <div className="animate-fade-up animate-fade-up-delay-2">
                <UtilizationChart data={data.history7d} />
              </div>
            ) : null}

            {data.sheet ? (
              <div className="animate-fade-up animate-fade-up-delay-3">
                <SheetPanel url={data.sheet.url} />
              </div>
            ) : null}
          </main>
        ) : null}
      </div>
    </div>
  );
}
