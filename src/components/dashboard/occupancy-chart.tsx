"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DayHistory } from "@/src/types/dashboard";
import { formatChartDate, formatMinutes, formatPercent, formatShortDate } from "@/src/lib/format";

import DashboardCard from "./dashboard-card";
import SectionHeading from "./section-heading";

interface OccupancyChartProps {
  data: DayHistory[];
}

interface TooltipPayload {
  payload?: DayHistory;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload;
  if (!row) {
    return null;
  }

  return (
    <div className="rounded-md border border-overlay-border bg-overlay p-3 shadow-lg">
      <p className="text-sm font-semibold text-overlay-foreground">{formatShortDate(row.date)}</p>
      <p className="text-sm text-overlay-foreground/75">
        Occupancy: <span className="font-data font-semibold text-overlay-foreground">{formatPercent(row.occupancyPct)}</span>
      </p>
      <p className="text-sm text-overlay-foreground/75">
        Runtime: <span className="font-data text-overlay-foreground">{formatMinutes(row.runtimeMin)}</span>
      </p>
      <p className="text-sm text-overlay-foreground/75">
        Elapsed: <span className="font-data text-overlay-foreground">{formatMinutes(row.elapsedMin)}</span>
      </p>
    </div>
  );
}

export default function OccupancyChart({ data }: OccupancyChartProps) {
  return (
    <DashboardCard compact>
      <SectionHeading>7-Day Occupancy</SectionHeading>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "'Space Grotesk'" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "'JetBrains Mono'" }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine
            y={60}
            stroke="hsl(var(--status-running))"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
          />
          <ReferenceLine
            y={30}
            stroke="hsl(var(--status-disconnected))"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="occupancyPct"
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{
              r: 4,
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--card))",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--card))",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </DashboardCard>
  );
}
