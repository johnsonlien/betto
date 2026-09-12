// Layout constants for the hourly time-grid. Shared between the hours axis,
// the day header/all-day zone (which must be a fixed height across every
// column so the grid — and thus the hours axis — lines up), and the grid
// itself.
export const HOUR_HEIGHT = 48; // px per hour
export const GRID_HEIGHT = HOUR_HEIGHT * 24;

export const HEADER_HEIGHT = 34;
export const ALL_DAY_HEIGHT = 84;
export const ADD_BUTTON_HEIGHT = 26;
export const GAP = 6;
export const TOP_ZONE_HEIGHT = HEADER_HEIGHT + ALL_DAY_HEIGHT + ADD_BUTTON_HEIGHT + GAP * 2;

const SNAP_MINUTES = 15;
const MAX_MINUTES = 24 * 60 - 1;

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTimeValue(minutes: number): string {
  const clamped = Math.max(0, Math.min(MAX_MINUTES, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export type OverlapInput = { id: string; startMinutes: number; endMinutes: number };
export type OverlapResult = { id: string; colIndex: number; colCount: number };

/**
 * Groups time-overlapping events into clusters and assigns each a column
 * index/count within its cluster, so overlapping events share the day's
 * width instead of fully covering each other. Simplified (not a full
 * interval-graph coloring) — fine for the handful of overlaps a trip
 * itinerary realistically has.
 */
export function computeOverlapLayout(events: OverlapInput[]): OverlapResult[] {
  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes);
  const results: OverlapResult[] = [];
  let cluster: OverlapInput[] = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;
    cluster.forEach((e, i) => results.push({ id: e.id, colIndex: i, colCount: cluster.length }));
    cluster = [];
  }

  for (const event of sorted) {
    if (cluster.length > 0 && event.startMinutes >= clusterEnd) {
      flushCluster();
      clusterEnd = -Infinity;
    }
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.endMinutes);
  }
  flushCluster();

  return results;
}
