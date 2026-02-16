export function formatHours(totalHours: number | null): string {
  if (totalHours === null) {
    return "--";
  }

  const safeHours = Math.max(0, totalHours);
  return `${safeHours.toFixed(1)}h`;
}

export function formatTimestamp(isoValue: string): string {
  const date = new Date(isoValue);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatChartDate(isoValue: string): string {
  const date = new Date(isoValue);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatShortDate(isoValue: string): string {
  const date = new Date(isoValue);

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return `${Math.round(value)}%`;
}

export function formatPowerWatts(powerWatts: number | null): string {
  if (powerWatts === null) {
    return "--";
  }

  return `${Math.round(powerWatts).toLocaleString()} W`;
}

export function formatRelativeAge(isoValue: string, now: Date): string {
  const updated = new Date(isoValue).getTime();
  const elapsedSeconds = Math.max(0, Math.round((now.getTime() - updated) / 1000));

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  return `${elapsedMinutes}m ago`;
}
