"use client";

import { formatHours, formatMinutes, formatPercent } from "@/src/lib/format";
import type { PeriodMetrics } from "@/src/types/dashboard";

import DashboardCard from "./DashboardCard";
import InfoTooltip from "./InfoTooltip";
import SectionHeading from "./SectionHeading";
import { getPercentToneClass } from "./status";

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
            aria-label={`${label} details`}
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
  return (
    <DashboardCard className="h-full lg:min-h-[250px]">
      <SectionHeading className="mb-3">{title}</SectionHeading>

      <div className="mb-3">
        <span className={`font-data text-4xl font-bold ${getPercentToneClass(data.occupancyPct)}`}>
          {formatPercent(data.occupancyPct)}
        </span>
        <span className="ml-2 text-sm text-muted-foreground">occupancy</span>
      </div>

      <div>
        <MetricRow
          label="Runtime"
          tooltip="Runtime is the sum of intervals classified as active machine operation during the selected period."
          value={formatMinutes(data.runtimeMin)}
        />
        <MetricRow
          label="Elapsed"
          tooltip="Elapsed is total observed period length. Occupancy = Runtime / Elapsed x 100."
          value={formatHours(data.elapsedMin)}
        />
        {data.highestScorePct !== null ? (
          <MetricRow
            label="Best Score"
            tooltip="Best Score is the highest occupancy percentage achieved in any single session within this period."
            value={formatPercent(data.highestScorePct)}
          />
        ) : null}
      </div>

      {title === "This Week" && typeof weeklyBaselineHours === "number" ? (
        <div className="mt-3 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          <InfoTooltip label="Weekly baseline represents the expected productive operating hours target for one calendar week.">
            <button
              type="button"
              className="inline-flex w-full items-center justify-between text-left"
              aria-label="Weekly baseline details"
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
