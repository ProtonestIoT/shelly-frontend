"use client";

import { useEffect, useRef, useState } from "react";

import { TOOLTIP_COPY } from "@/src/lib/dashboard-copy";
import { formatHours, formatMinutes, formatPercent } from "@/src/lib/format";
import type { PeriodMetrics } from "@/src/types/dashboard";

import DashboardCard from "./dashboard-card";
import InfoTooltip from "./info-tooltip";
import SectionHeading from "./section-heading";
import { getPercentToneClass } from "./status";

interface KpiCardProps {
  title: "Today" | "This Week" | "This Month";
  data: PeriodMetrics;
  weeklyBaselineHours?: number;
  refreshKey?: string;
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

export default function KpiCard({ title, data, weeklyBaselineHours, refreshKey }: KpiCardProps) {
  const [animatedOccupancy, setAnimatedOccupancy] = useState(0);
  const hasInitializedRef = useRef(false);
  const currentValueRef = useRef(0);

  useEffect(() => {
    if (data.occupancyPct === null) {
      setAnimatedOccupancy(0);
      currentValueRef.current = 0;
      hasInitializedRef.current = true;
      return;
    }

    const targetValue = Math.round(data.occupancyPct);
    const startValue = hasInitializedRef.current ? currentValueRef.current : 0;

    if (startValue === targetValue) {
      setAnimatedOccupancy(targetValue);
      currentValueRef.current = targetValue;
      hasInitializedRef.current = true;
      return;
    }

    const durationMs = 700;
    const start = performance.now();
    let frameId = 0;

    frameId = window.requestAnimationFrame(function tick(now) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const nextValue = Math.round(startValue + (targetValue - startValue) * eased);
      setAnimatedOccupancy(nextValue);
      currentValueRef.current = nextValue;

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setAnimatedOccupancy(targetValue);
        currentValueRef.current = targetValue;
        hasInitializedRef.current = true;
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [data.occupancyPct, refreshKey]);

  return (
    <DashboardCard className="h-full lg:min-h-[250px]">
      <SectionHeading className="mb-3">{title}</SectionHeading>

      <div className="mb-3">
        <span className={`font-data text-4xl font-bold ${getPercentToneClass(data.occupancyPct)}`}>
          {data.occupancyPct === null ? "--" : formatPercent(animatedOccupancy)}
        </span>
        <span className="ml-2 text-sm text-muted-foreground">occupancy</span>
      </div>

      <div>
        <MetricRow
          label="Runtime"
          tooltip={TOOLTIP_COPY.kpiRuntime}
          value={formatMinutes(data.runtimeMin)}
        />
        <MetricRow
          label="Elapsed"
          tooltip={TOOLTIP_COPY.kpiElapsed}
          value={formatHours(data.elapsedMin)}
        />
        {data.highestScorePct !== null ? (
          <MetricRow
            label="Best Score"
            tooltip={TOOLTIP_COPY.kpiBest}
            value={formatPercent(data.highestScorePct)}
          />
        ) : null}
      </div>

      {title === "This Week" && typeof weeklyBaselineHours === "number" ? (
        <div className="mt-3 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          <InfoTooltip label={TOOLTIP_COPY.kpiWeeklyBaseline}>
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
