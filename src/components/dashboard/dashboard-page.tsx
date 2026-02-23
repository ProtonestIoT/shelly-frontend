"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardCard from "@/src/components/dashboard/dashboard-card";
import {
  notifyChannelChanged,
  notifyDeviceChanged,
  notifyElapsedUpdateFailed,
  notifyElapsedUpdated,
  notifyThresholdUpdated,
  notifyThresholdUpdateFailed,
} from "@/src/components/dashboard/change-notifications";
import ChannelSwitcher from "@/src/components/dashboard/channel-switcher";
import ControlButton from "@/src/components/dashboard/control-button";
import ControlInputField from "@/src/components/dashboard/control-input-field";
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
import { DASHBOARD_COPY } from "@/src/lib/dashboard-copy";

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
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(
    null,
  );
  const [selectedChannelByMachine, setSelectedChannelByMachine] = useState<
    Record<string, string>
  >({});
  const [now, setNow] = useState(() => new Date());
  const [elapsedDraftByMachineChannel, setElapsedDraftByMachineChannel] = useState<
    Record<string, string>
  >({});
  const [thresholdDraftByMachineChannel, setThresholdDraftByMachineChannel] =
    useState<Record<string, string>>({});
  const [activeMobileTab, setActiveMobileTab] = useState<
    "overview" | "configurations"
  >("overview");
  const [elapsedSaveMessage, setElapsedSaveMessage] = useState<string | null>(
    null,
  );
  const [thresholdSaveMessage, setThresholdSaveMessage] = useState<
    string | null
  >(null);

  const {
    machines,
    isLoading: machineListLoading,
    isRefreshing: machineListRefreshing,
    error: machineListError,
    refetch: refetchMachines,
  } = useMachineList();

  const activeMachineId =
    selectedMachineId &&
    machines.some((machine) => machine.id === selectedMachineId)
      ? selectedMachineId
      : (machines[0]?.id ?? null);
  const activeMachine = machines.find(
    (machine) => machine.id === activeMachineId,
  );
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

  const {
    data,
    error,
    isInitialLoading,
    isRefreshing,
    isStale,
    isUpdatingElapsed,
    isUpdatingThreshold,
    saveElapsedHours,
    savePowerThreshold,
  } = useMachineData(activeMachineId, activeChannel, availableChannels);

  const activeMachineChannelKey =
    activeMachineId && activeChannel
      ? `${activeMachineId}::${activeChannel}`
      : null;

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
  const combinedError = machineListError ?? error;
  const isBackendFetching =
    machineListLoading ||
    machineListRefreshing ||
    isInitialLoading ||
    isRefreshing ||
    isUpdatingElapsed ||
    isUpdatingThreshold;
  const showSidebarSkeleton = machineListLoading && !hasData;
  const hasBlockingError = Boolean(
    combinedError && !hasData && !isBackendFetching,
  );
  const hasNonBlockingError = Boolean(
    combinedError && hasData && !isBackendFetching,
  );
  const isBusy = isBackendFetching;
  const hasConnectionAlert = Boolean(
    data &&
    (isStale ||
      data.machine.status === "DISCONNECTED" ||
      data.machine.status === "UNKNOWN"),
  );
  const hasChartData = Boolean(data?.history7d?.length);

  const activeChannelSlot = (() => {
    if (!activeChannel) {
      return null;
    }
    if (activeChannel.endsWith(":0")) {
      return 1;
    }
    if (activeChannel.endsWith(":1")) {
      return 2;
    }
    const index = availableChannels.indexOf(activeChannel);
    if (index === 0) {
      return 1;
    }
    if (index === 1) {
      return 2;
    }
    return null;
  })();

  const elapsedInput = (() => {
    if (!activeMachineChannelKey) {
      return "";
    }

    const draft = elapsedDraftByMachineChannel[activeMachineChannelKey];
    if (draft !== undefined) {
      return draft;
    }

    if (!data?.configurations || !activeChannelSlot) {
      return "";
    }

    const configuredElapsedHours =
      activeChannelSlot === 1
        ? data.configurations.channel1Hours
        : data.configurations.channel2Hours;

    return Number.isFinite(configuredElapsedHours)
      ? configuredElapsedHours.toFixed(2)
      : "";
  })();

  const thresholdInput = (() => {
    if (!activeMachineChannelKey) {
      return "";
    }

    const draft = thresholdDraftByMachineChannel[activeMachineChannelKey];
    if (draft !== undefined) {
      return draft;
    }

    if (!data?.configurations || !activeChannelSlot) {
      return "";
    }

    const threshold =
      activeChannelSlot === 1
        ? data.configurations.channel1Threshold
        : data.configurations.channel2Threshold;
    return Number.isFinite(threshold) ? threshold.toFixed(2) : "";
  })();

  async function handleElapsedSave() {
    const parsed = Number(elapsedInput);
    if (!Number.isFinite(parsed) || !isElapsedHoursInRange(parsed)) {
      const message = DASHBOARD_COPY.elapsedRangeValidation(
        ELAPSED_HOURS_MIN,
        ELAPSED_HOURS_MAX,
      );
      setElapsedSaveMessage(message);
      notifyElapsedUpdateFailed(message);
      return;
    }

    try {
      await saveElapsedHours(parsed);
      if (activeMachineChannelKey) {
        setElapsedDraftByMachineChannel((current) => ({
          ...current,
          [activeMachineChannelKey]: parsed.toFixed(2),
        }));
      }
      setElapsedSaveMessage(DASHBOARD_COPY.elapsedUpdateSuccess);
      notifyElapsedUpdated(parsed);
    } catch {
      const message = DASHBOARD_COPY.elapsedUpdateFailure;
      setElapsedSaveMessage(message);
      notifyElapsedUpdateFailed(message);
    }
  }

  async function handleThresholdSave() {
    if (!activeMachineId || !activeChannel) {
      return;
    }

    const parsed = Number(thresholdInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      const message = DASHBOARD_COPY.thresholdValidation;
      setThresholdSaveMessage(message);
      notifyThresholdUpdateFailed(message);
      return;
    }

    try {
      await savePowerThreshold(activeChannel, parsed);
      if (activeMachineChannelKey) {
        setThresholdDraftByMachineChannel((current) => ({
          ...current,
          [activeMachineChannelKey]: parsed.toFixed(2),
        }));
      }
      setThresholdSaveMessage(DASHBOARD_COPY.thresholdUpdateSuccess);
      notifyThresholdUpdated(parsed);
    } catch {
      const message = DASHBOARD_COPY.thresholdUpdateFailure;
      setThresholdSaveMessage(message);
      notifyThresholdUpdateFailed(message);
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
      <div className="mx-auto w-full max-w-[1920px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <DashboardCard className="mb-4 p-4 lg:hidden" compact>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Device
                </p>
                <div className="mt-2">
                  <MachineSwitcher
                    machines={machinesWithLiveStatus}
                    selected={activeMachineId}
                    onSelect={handleMachineSelect}
                    disabled={machineListLoading}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Channel
                </p>
                <div className="mt-2">
                  <ChannelSwitcher
                    channels={availableChannels}
                    selected={activeChannel}
                    disabled={
                      machineListLoading ||
                      !activeMachineId ||
                      availableChannels.length === 0
                    }
                    onSelect={handleChannelSelect}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <ControlButton
                  fullWidth
                  onClick={() => {
                    void refetchMachines();
                  }}
                  disabled={machineListLoading || machineListRefreshing}
                >
                  {machineListRefreshing ? "Refreshing..." : "Refresh Devices"}
                </ControlButton>
              </div>
            </div>

            <p className="font-data text-sm text-foreground">
              Local time:{" "}
              <time dateTime={now.toISOString()} suppressHydrationWarning>
                {formatTime(now)}
              </time>
            </p>

            {hasData && isStale ? (
              <span className="inline-flex rounded-full border border-status-disconnected/30 bg-status-disconnected/10 px-2 py-1 text-xs font-medium text-status-disconnected">
                {DASHBOARD_COPY.staleBadge}
              </span>
            ) : null}
          </div>
        </DashboardCard>

        <div className="mb-4 grid grid-cols-2 gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => {
              setActiveMobileTab("overview");
            }}
            className={`h-10 rounded-md border px-3 text-sm font-semibold ${
              activeMobileTab === "overview"
                ? "border-primary/40 bg-primary/12 text-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            Data Overview
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMobileTab("configurations");
            }}
            className={`h-10 rounded-md border px-3 text-sm font-semibold ${
              activeMobileTab === "configurations"
                ? "border-primary/40 bg-primary/12 text-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            Configurations
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
          <aside
            className={`${
              activeMobileTab === "configurations" ? "block" : "hidden"
            } space-y-4 lg:sticky lg:top-4 lg:block lg:self-start`}
          >
            {showSidebarSkeleton ? (
              <>
                <DashboardCard
                  className="hidden animate-fade-up-delay-1 p-4 lg:block"
                  compact
                >
                  <div className="animate-pulse space-y-3">
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                  </div>
                </DashboardCard>
                <DashboardCard className="animate-fade-up-delay-2 p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-3 w-28 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                    <div className="h-3 w-36 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                  </div>
                </DashboardCard>
              </>
            ) : (
              <>
                <DashboardCard
                  className="hidden animate-fade-up-delay-1 p-4 lg:block"
                  compact
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                        Device
                      </p>
                      <div className="mt-2">
                        <MachineSwitcher
                          machines={machinesWithLiveStatus}
                          selected={activeMachineId}
                          onSelect={handleMachineSelect}
                          disabled={machineListLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                        Channel
                      </p>
                      <div className="mt-2">
                        <ChannelSwitcher
                          channels={availableChannels}
                          selected={activeChannel}
                          disabled={
                            machineListLoading ||
                            !activeMachineId ||
                            availableChannels.length === 0
                          }
                          onSelect={handleChannelSelect}
                        />
                      </div>
                    </div>

                    <ControlButton
                      fullWidth
                      onClick={() => {
                        void refetchMachines();
                      }}
                      disabled={machineListLoading || machineListRefreshing}
                    >
                      {machineListRefreshing
                        ? "Refreshing..."
                        : "Refresh Devices"}
                    </ControlButton>

                    <p className="font-data text-sm text-foreground">
                      Local time:{" "}
                      <time
                        dateTime={now.toISOString()}
                        suppressHydrationWarning
                      >
                        {formatTime(now)}
                      </time>
                    </p>

                    {hasData && isStale ? (
                      <span className="inline-flex rounded-full border border-status-disconnected/30 bg-status-disconnected/10 px-2 py-1 text-xs font-medium text-status-disconnected">
                        {DASHBOARD_COPY.staleBadge}
                      </span>
                    ) : null}
                  </div>
                </DashboardCard>

                <DashboardCard className="animate-fade-up-delay-2 p-4">
                  <div className="space-y-3">
                    <ControlInputField
                      label="Elapsed Hours"
                      type="number"
                      min={ELAPSED_HOURS_MIN}
                      max={ELAPSED_HOURS_MAX}
                      step={ELAPSED_HOURS_STEP}
                      value={elapsedInput}
                      onChange={(nextValue) => {
                        if (activeMachineChannelKey) {
                          setElapsedDraftByMachineChannel((current) => ({
                            ...current,
                            [activeMachineChannelKey]: nextValue,
                          }));
                        }
                        if (elapsedSaveMessage) {
                          setElapsedSaveMessage(null);
                        }
                      }}
                      placeholder={DASHBOARD_COPY.elapsedInputPlaceholder(
                        ELAPSED_HOURS_MIN,
                        ELAPSED_HOURS_MAX,
                      )}
                    />

                    <ControlButton
                      fullWidth
                      onClick={() => {
                        void handleElapsedSave();
                      }}
                      disabled={isUpdatingElapsed || !activeMachineId || !activeChannelSlot}
                    >
                      {isUpdatingElapsed ? "Saving..." : "Update Elapsed"}
                    </ControlButton>

                    <ControlInputField
                      label={`Power Threshold (${activeChannel ?? "N/A"})`}
                      type="number"
                      min={0}
                      step={0.1}
                      value={thresholdInput}
                      onChange={(nextValue) => {
                        if (activeMachineChannelKey) {
                          setThresholdDraftByMachineChannel((current) => ({
                            ...current,
                            [activeMachineChannelKey]: nextValue,
                          }));
                        }
                        if (thresholdSaveMessage) {
                          setThresholdSaveMessage(null);
                        }
                      }}
                      placeholder={DASHBOARD_COPY.thresholdInputPlaceholder}
                      disabled={!activeChannelSlot}
                    />

                    <ControlButton
                      fullWidth
                      onClick={() => {
                        void handleThresholdSave();
                      }}
                      disabled={
                        isUpdatingThreshold ||
                        !activeMachineId ||
                        !activeChannel ||
                        !activeChannelSlot
                      }
                    >
                      {isUpdatingThreshold ? "Saving..." : "Update Threshold"}
                    </ControlButton>

                    {elapsedSaveMessage ? (
                      <p
                        className="text-xs text-muted-foreground"
                        aria-live="polite"
                      >
                        {elapsedSaveMessage}
                      </p>
                    ) : null}

                    {thresholdSaveMessage ? (
                      <p
                        className="text-xs text-muted-foreground"
                        aria-live="polite"
                      >
                        {thresholdSaveMessage}
                      </p>
                    ) : null}
                  </div>
                </DashboardCard>

                {hasNonBlockingError ? (
                  <DashboardCard
                    className="border-status-disconnected/40 bg-status-disconnected/8 p-3 animate-fade-up-delay-1"
                    role="status"
                  >
                    <p className="text-xs font-semibold text-status-disconnected uppercase tracking-wide">
                      {DASHBOARD_COPY.nonBlockingWarningTitle}
                    </p>
                    <p className="text-sm text-foreground">{combinedError}</p>
                  </DashboardCard>
                ) : null}
              </>
            )}
          </aside>

          <section
            className={`${
              activeMobileTab === "overview" ? "block" : "hidden"
            } space-y-4 sm:space-y-6 lg:block`}
          >
            {isBackendFetching ? (
              <div
                className="space-y-4 sm:space-y-6"
                role="status"
                aria-live="polite"
                aria-label={DASHBOARD_COPY.loadingAriaLabel}
              >
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

            {!isBackendFetching && hasConnectionAlert ? (
              <DashboardCard
                className="border-status-disconnected/40 bg-status-disconnected/8 p-3 animate-fade-up-delay-1"
                role="alert"
              >
                <p className="text-sm font-semibold text-status-disconnected uppercase tracking-wide">
                  {data?.machine.status === "DISCONNECTED"
                    ? DASHBOARD_COPY.telemetryDisconnectedTitle
                    : data?.machine.status === "UNKNOWN"
                      ? DASHBOARD_COPY.telemetryPartialTitle
                      : DASHBOARD_COPY.telemetryStaleTitle}
                </p>
                <p className="text-sm text-foreground">
                  {data?.machine.status === "DISCONNECTED"
                    ? DASHBOARD_COPY.telemetryDisconnectedBody
                    : data?.machine.status === "UNKNOWN"
                      ? DASHBOARD_COPY.telemetryPartialBody
                      : DASHBOARD_COPY.telemetryStaleBody}
                </p>
              </DashboardCard>
            ) : null}

            {!isBackendFetching && hasBlockingError ? (
              <DashboardCard
                className="flex min-h-[420px] items-center justify-center p-6 text-center animate-fade-up-delay-2"
                role="alert"
              >
                <div className="max-w-lg">
                  <h2 className="text-xl tracking-wide uppercase">
                    {DASHBOARD_COPY.noDataTitle}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {DASHBOARD_COPY.noDataPrefix} {combinedError}
                  </p>
                </div>
              </DashboardCard>
            ) : null}

            {!isBackendFetching && !hasBlockingError && data ? (
              <main className="relative z-0 space-y-4 sm:space-y-6">
                <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="h-full animate-fade-up animate-fade-up-delay-1">
                    <StatusBlock
                      status={data.machine.status}
                      powerWatts={data.machine.powerWatts}
                    />
                  </div>
                  {data.periods?.today ? (
                    <div className="h-full animate-fade-up animate-fade-up-delay-1">
                      <KpiCard title="Today" data={data.periods.today} />
                    </div>
                  ) : null}
                  {data.periods?.week ? (
                    <div className="h-full animate-fade-up animate-fade-up-delay-2">
                      <KpiCard
                        title="This Week"
                        data={data.periods.week}
                        weeklyBaselineHours={
                          data.baseline?.weeklyHours ?? undefined
                        }
                      />
                    </div>
                  ) : null}
                  {data.periods?.month ? (
                    <div className="h-full animate-fade-up animate-fade-up-delay-3">
                      <KpiCard title="This Month" data={data.periods.month} />
                    </div>
                  ) : null}
                </section>

                {data.periods ? (
                  <DashboardCard className="animate-fade-up-delay-2">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Gauge
                        label="Today"
                        value={data.periods.today.utilizationPct}
                      />
                      <Gauge
                        label="Week"
                        value={data.periods.week.utilizationPct}
                      />
                      <Gauge
                        label="Month"
                        value={data.periods.month.utilizationPct}
                      />
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
          </section>
        </div>
      </div>
    </div>
  );
}
