export function formatMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatHours(totalMinutes: number): string {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = safeMinutes / 60;
  return `${hours.toFixed(1)}h`;
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

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatPowerWatts(powerWatts: number): string {
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
