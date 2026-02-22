"use client";

import { DASHBOARD_COPY } from "@/src/lib/dashboard-copy";
import { formatHours, formatPercent } from "@/src/lib/format";
import type { PeriodMetrics } from "@/src/types/dashboard";

import DashboardCard from "./dashboard-card";
import InfoTooltip from "./info-tooltip";
import SectionHeading from "./section-heading";

interface KpiCardProps {
  title: "Today" | "This Week" | "This Month";
  data: PeriodMetrics;
  weeklyBaselineHours?: number;
}

function MetricRow({ label, tooltip, value }: { label: string; tooltip: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <div className="inline-flex items-center gap-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <InfoTooltip label={tooltip}>
          <button
            type="button"
            className="h-4 w-4 rounded-full border border-border text-[10px] leading-none text-muted-foreground"
            aria-label={DASHBOARD_COPY.metricDetailsAria(label)}
          >
            i
          </button>
        </InfoTooltip>
      </div>
      <span className="font-data text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function KpiCard({ title, data, weeklyBaselineHours }: KpiCardProps) {
  const runtimeTooltip =
    title === "Today"
      ? DASHBOARD_COPY.kpiRuntimeTodayTooltip
      : title === "This Week"
        ? DASHBOARD_COPY.kpiRuntimeWeekTooltip
        : DASHBOARD_COPY.kpiRuntimeMonthTooltip;
  const elapsedTooltip =
    title === "Today"
      ? DASHBOARD_COPY.kpiElapsedTodayTooltip
      : title === "This Week"
        ? DASHBOARD_COPY.kpiElapsedWeekTooltip
        : DASHBOARD_COPY.kpiElapsedMonthTooltip;

  return (
    <DashboardCard className="h-full lg:min-h-[250px]">
      <SectionHeading className="mb-3">{title}</SectionHeading>

      <div className="mb-3">
        <span className="font-data text-4xl font-bold text-foreground">
          {formatHours(data.runtimeHours)}
        </span>
        <span className="ml-2 text-sm text-muted-foreground">runtime</span>
      </div>

      <div>
        <MetricRow
          label="Runtime"
          tooltip={runtimeTooltip}
          value={formatHours(data.runtimeHours)}
        />
        <MetricRow
          label="Elapsed"
          tooltip={elapsedTooltip}
          value={formatHours(data.elapsedHours)}
        />
        {title !== "Today" ? (
          <MetricRow
            label="Best Utilization"
            tooltip={DASHBOARD_COPY.kpiBestTooltip}
            value={formatPercent(data.highestScorePct)}
          />
        ) : null}
      </div>

      {title === "This Week" && typeof weeklyBaselineHours === "number" ? (
        <div className="mt-3 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          <InfoTooltip label={DASHBOARD_COPY.kpiWeeklyBaselineTooltip}>
            <button
              type="button"
              className="inline-flex w-full items-center justify-between text-left"
              aria-label={DASHBOARD_COPY.weeklyBaselineAria}
            >
              <span>Weekly baseline: {weeklyBaselineHours.toFixed(1)}h</span>
              <span className="text-xs text-muted-foreground">ℹ</span>
            </button>
          </InfoTooltip>
        </div>
      ) : null}
    </DashboardCard>
  );
}
