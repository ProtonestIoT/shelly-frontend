"use client";

import type { MachineStatus } from "@/src/types/dashboard";
import { DASHBOARD_COPY } from "@/src/lib/dashboard-copy";
import { formatPowerWatts } from "@/src/lib/format";

import DashboardCard from "./dashboard-card";
import InfoTooltip from "./info-tooltip";
import { getStatusTheme } from "./status";

interface StatusBlockProps {
  status: MachineStatus;
  powerWatts: number | null;
}

export default function StatusBlock({ status, powerWatts }: StatusBlockProps) {
  const statusTheme = getStatusTheme(status);

  return (
    <DashboardCard className="h-full lg:min-h-[250px]">
      <div className="mb-6 flex items-start justify-between">
        <h2 className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
          Live Status
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        <InfoTooltip label={DASHBOARD_COPY.statusCurrentTooltip}>
          <button
            type="button"
            className={`motion-smooth inline-flex items-center gap-3 rounded-lg border px-3 py-2 ${statusTheme.badgeClass}`}
            aria-label={DASHBOARD_COPY.statusCurrentAria}
          >
            <span
              className={`h-3 w-3 animate-pulse-status rounded-full ${statusTheme.dotClass}`}
              aria-hidden="true"
            />
            <span
              className={`text-2xl leading-none tracking-wide wrap-anywhere ${statusTheme.toneClass}`}
            >
              {status}
            </span>
          </button>
        </InfoTooltip>

        <InfoTooltip label={DASHBOARD_COPY.powerCurrentTooltip}>
          <button
            type="button"
            className="motion-smooth inline-flex items-end gap-2 rounded-lg border border-border bg-secondary px-4 py-3"
            aria-label={DASHBOARD_COPY.powerCurrentAria}
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
