"use client";

import type { MachineStatus } from "@/src/types/dashboard";
import { formatPowerWatts } from "@/src/lib/format";

import DashboardCard from "./dashboard-card";
import InfoTooltip from "./info-tooltip";
import { getStatusTheme } from "./status";

interface StatusBlockProps {
  status: MachineStatus;
  powerWatts: number;
}

export default function StatusBlock({ status, powerWatts }: StatusBlockProps) {
  const statusTheme = getStatusTheme(status);

  return (
    <DashboardCard className="h-full lg:min-h-[250px]">
      <div className="mb-6 flex items-start justify-between">
        <h2 className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
          Live Status
        </h2>
        <InfoTooltip label="Machine state inferred from power signal thresholds. RUNNING reflects active cutting/rapid cycles, IDLE indicates powered but inactive, DISCONNECTED indicates no valid feed from source telemetry.">
          <button
            type="button"
            className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
            aria-label="State meaning"
          >
            status ℹ
          </button>
        </InfoTooltip>
      </div>

      <div className="space-y-4">
        <InfoTooltip label="Current machine operating state based on the latest power draw sample and continuity of telemetry updates.">
          <button
            type="button"
            className="motion-smooth inline-flex items-center gap-3 rounded-lg border border-border bg-secondary px-3 py-2"
            aria-label="Current machine status details"
          >
            <span
              className={`h-3 w-3 animate-pulse-status rounded-full ${statusTheme.dotClass}`}
              aria-hidden="true"
            />
            <span className={`text-3xl leading-none tracking-wide ${statusTheme.toneClass}`}>
              {status}
            </span>
          </button>
        </InfoTooltip>

        <InfoTooltip label="Instantaneous electrical power draw from the monitored CNC circuit. Higher values usually represent active spindle/tool movement.">
          <button
            type="button"
            className="motion-smooth inline-flex items-end gap-2 rounded-lg border border-border bg-secondary px-4 py-3"
            aria-label="Current power reading details"
          >
            <span className="font-data text-4xl font-semibold text-foreground">
              {formatPowerWatts(powerWatts)}
            </span>
          </button>
        </InfoTooltip>
      </div>
    </DashboardCard>
  );
}
