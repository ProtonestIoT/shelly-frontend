import type { MachineStatus } from "@/src/types/dashboard";

interface StatusTheme {
  label: string;
  toneClass: string;
  dotClass: string;
  badgeClass: string;
}

export const UTILIZATION_RUNNING_THRESHOLD = 60;
export const UTILIZATION_IDLE_THRESHOLD = 30;

type UtilizationBand = "running" | "idle" | "disconnected";

export function getUtilizationBand(value: number): UtilizationBand {
  if (value >= UTILIZATION_RUNNING_THRESHOLD) {
    return "running";
  }
  if (value >= UTILIZATION_IDLE_THRESHOLD) {
    return "idle";
  }
  return "disconnected";
}

export function getStatusTheme(status: MachineStatus): StatusTheme {
  switch (status) {
    case "RUNNING":
      return {
        label: "Running",
        toneClass: "text-status-running",
        dotClass: "bg-status-running",
        badgeClass:
          "border-status-running/30 bg-status-running/12 text-status-running",
      };
    case "IDLE":
      return {
        label: "Idle",
        toneClass: "text-status-idle",
        dotClass: "bg-status-idle",
        badgeClass: "border-status-idle/30 bg-status-idle/12 text-status-idle",
      };
    case "DISCONNECTED":
      return {
        label: "Disconnected",
        toneClass: "text-status-disconnected",
        dotClass: "bg-status-disconnected",
        badgeClass:
          "border-status-disconnected/30 bg-status-disconnected/12 text-status-disconnected",
      };
    case "UNKNOWN":
      return {
        label: "Unknown",
        toneClass: "text-muted-foreground",
        dotClass: "bg-muted-foreground",
        badgeClass: "border-border bg-secondary text-muted-foreground",
      };
    default:
      return {
        label: "Unknown",
        toneClass: "text-muted-foreground",
        dotClass: "bg-muted-foreground",
        badgeClass: "border-border bg-secondary text-muted-foreground",
      };
  }
}

export function getStatusColorValue(status: MachineStatus): string {
  if (status === "RUNNING") {
    return "var(--color-status-running)";
  }
  if (status === "IDLE") {
    return "var(--color-status-idle)";
  }
  if (status === "DISCONNECTED") {
    return "var(--color-status-disconnected)";
  }
  return "var(--color-status-disconnected)";
}

export function getPercentToneClass(value: number | null): string {
  if (value === null) {
    return "text-muted-foreground";
  }

  const band = getUtilizationBand(value);

  if (band === "running") {
    return "text-status-running";
  }
  if (band === "idle") {
    return "text-status-idle";
  }
  return "text-status-disconnected";
}
