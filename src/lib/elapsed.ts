export const ELAPSED_HOURS_MIN = 1;
export const ELAPSED_HOURS_MAX = 24;
export const ELAPSED_HOURS_STEP = 0.5;

export function isElapsedHoursInRange(hours: number): boolean {
  return hours >= ELAPSED_HOURS_MIN && hours <= ELAPSED_HOURS_MAX;
}
