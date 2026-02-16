"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardCard from "@/src/components/dashboard/dashboard-card";
import Gauge from "@/src/components/dashboard/gauge";
import KpiCard from "@/src/components/dashboard/kpi-card";
import MachineSwitcher from "@/src/components/dashboard/machine-switcher";
import OccupancyChart from "@/src/components/dashboard/occupancy-chart";
import SectionHeading from "@/src/components/dashboard/section-heading";
import SheetPanel from "@/src/components/dashboard/sheet-panel";
import StatusBlock from "@/src/components/dashboard/status-block";
import { getStatusTheme } from "@/src/components/dashboard/status";
import { useMachineData, useMachineList } from "@/src/hooks/use-machine-data";
import { formatRelativeAge, formatTime, formatTimestamp } from "@/src/lib/format";

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
  const [now, setNow] = useState(() => new Date());

  const { machines, isLoading: machineListLoading, error: machineListError } = useMachineList();

  const activeMachineId = selectedMachineId ?? machines[0]?.id ?? null;

  const { data, error, isInitialLoading, isRefreshing, isStale } = useMachineData(activeMachineId);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const statusTheme = useMemo(
    () => getStatusTheme(data?.machine.state ?? "DISCONNECTED"),
    [data?.machine.state],
  );

  const hasData = Boolean(data);
  const hasError = Boolean(machineListError || error);
  const isBusy = machineListLoading || isInitialLoading || isRefreshing;
  const lastUpdatedAge = data ? formatRelativeAge(data.machine.lastUpdated, now) : null;
  const hasConnectionAlert = Boolean(
    data && (isStale || data.machine.state === "DISCONNECTED" || data.machine.state === "UNKNOWN"),
  );
  const hasChartData = Boolean(
    data?.history7d?.some((row) => typeof row.occupancyPct === "number"),
  );

  return (
    <div className="min-h-screen text-foreground" aria-busy={isBusy}>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <DashboardCard className="relative z-40 mb-4 p-4 sm:mb-6 animate-fade-up-delay-1" compact>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <MachineSwitcher
                machines={machines}
                selected={activeMachineId}
                onSelect={setSelectedMachineId}
                disabled={machineListLoading}
              />

              {hasData ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase ${statusTheme.badgeClass}`}
                  >
                    <span className={`h-2 w-2 animate-pulse-status rounded-full ${statusTheme.dotClass}`} />
                    {statusTheme.label}
                  </div>
                  {isStale ? (
                    <span className="rounded-full border border-status-disconnected/30 bg-status-disconnected/10 px-2 py-1 text-xs font-medium text-status-disconnected">
                      Stale (&gt;5m)
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground" aria-live="polite">
                    {isRefreshing ? "Refreshing..." : "Live updates every 10s"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="text-left lg:text-right">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Last updated:{" "}
                {data ? (
                  <>
                    <time dateTime={data.machine.lastUpdated}>{formatTimestamp(data.machine.lastUpdated)}</time>
                    <span className="ml-1 text-foreground/80">({lastUpdatedAge})</span>
                  </>
                ) : (
                  "-"
                )}
              </p>
              <p className="font-data text-lg text-foreground">
                Local time: <time dateTime={now.toISOString()}>{formatTime(now)}</time>
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
               {data?.machine.state === "DISCONNECTED"
                 ? "Machine Telemetry Disconnected"
                 : data?.machine.state === "UNKNOWN"
                   ? "Machine Telemetry Partial"
                   : "Telemetry Stale"}
             </p>
             <p className="text-sm text-foreground">
               {data?.machine.state === "DISCONNECTED"
                 ? "No live feed detected from machine power source. Verify sensor link and gateway connectivity."
                 : data?.machine.state === "UNKNOWN"
                   ? "Realtime total worktime is available, but status/power metrics are not exposed by current APIs yet."
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
                <StatusBlock status={data.machine.state} powerWatts={data.machine.powerWatts} />
              </div>
              {data.periods?.today ? (
                <div className="h-full animate-fade-up animate-fade-up-delay-1">
                  <KpiCard
                    title="Today"
                    data={data.periods.today}
                    refreshKey={data.machine.lastUpdated}
                  />
                </div>
              ) : null}
              {data.periods?.week ? (
                <div className="h-full animate-fade-up animate-fade-up-delay-2">
                  <KpiCard
                    title="This Week"
                    data={data.periods.week}
                    weeklyBaselineHours={data.baseline?.weeklyHours ?? undefined}
                    refreshKey={data.machine.lastUpdated}
                  />
                </div>
              ) : null}
              {data.periods?.month ? (
                <div className="h-full animate-fade-up animate-fade-up-delay-3">
                  <KpiCard
                    title="This Month"
                    data={data.periods.month}
                    refreshKey={data.machine.lastUpdated}
                  />
                </div>
              ) : null}
            </section>

            {data.periods ? (
              <DashboardCard className="animate-fade-up-delay-2">
                <SectionHeading>Utilization Gauges</SectionHeading>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Gauge label="Today" value={data.periods.today.occupancyPct} />
                  <Gauge label="Week" value={data.periods.week.occupancyPct} />
                  <Gauge label="Month" value={data.periods.month.occupancyPct} />
                </div>
              </DashboardCard>
            ) : null}

            {hasChartData ? (
              <div className="animate-fade-up animate-fade-up-delay-2">
                <OccupancyChart data={data.history7d} />
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
