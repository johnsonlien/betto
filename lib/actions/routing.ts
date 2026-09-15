"use server";

import { prisma } from "@/lib/prisma";
import { parseDateOnly, formatTimeInputValue } from "@/lib/dates";
import { requireEditAccess } from "@/lib/actions/require-edit-access";

// Free public OSRM demo instance — no API key/billing, consistent with the
// Nominatim/OpenFreeMap choices already used for geocoding and map tiles.
// It's a shared demo server (no uptime guarantee), so callers should treat
// failures as non-fatal.
const OSRM_BASE = "https://router.project-osrm.org";

type OsrmTripResponse = {
  code: string;
  waypoints?: { waypoint_index: number }[];
};

export type OptimizedDay = {
  date: string;
  events: { id: string; startTime: string; endTime: string | null }[];
};

/**
 * Reorders which event happens in which of a day's existing time slots to
 * minimize driving between them (via OSRM's /trip endpoint) — it does not
 * invent new times or change how many stops there are, just permutes events
 * across the day's own set of start/end times so no new overlaps appear.
 * Skipped for days with fewer than 3 timed, located events (nothing
 * meaningful to reorder) or if the routing service is unavailable.
 */
async function optimizeDay(calendarId: string, dateStr: string): Promise<OptimizedDay | null> {
  const date = parseDateOnly(dateStr);

  const events = await prisma.event.findMany({
    where: { calendarId, date, startTime: { not: null }, locationId: { not: null } },
    include: { location: { select: { lat: true, lng: true } } },
    orderBy: { startTime: "asc" },
  });
  if (events.length < 3) return null;

  const coords = events.map((e) => `${e.location!.lng},${e.location!.lat}`).join(";");

  let data: OsrmTripResponse;
  try {
    const res = await fetch(`${OSRM_BASE}/trip/v1/driving/${coords}?source=first&roundtrip=false`);
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  }
  if (data.code !== "Ok" || !data.waypoints) return null;

  const slots = events.map((e) => ({ startTime: e.startTime!, endTime: e.endTime }));

  const updates = events.map((event, i) => {
    const slot = slots[data.waypoints![i].waypoint_index];
    return { id: event.id, startTime: slot.startTime, endTime: slot.endTime };
  });

  await prisma.$transaction(
    updates.map((u) => prisma.event.update({ where: { id: u.id }, data: { startTime: u.startTime, endTime: u.endTime } }))
  );

  return {
    date: dateStr,
    events: updates.map((u) => ({
      id: u.id,
      startTime: formatTimeInputValue(u.startTime),
      endTime: u.endTime ? formatTimeInputValue(u.endTime) : null,
    })),
  };
}

/** Optimizes each of the given days independently (a day's events never move to another day). */
export async function optimizeRoutes(calendarId: string, dateStrs: string[]): Promise<OptimizedDay[]> {
  await requireEditAccess(calendarId);

  const results: OptimizedDay[] = [];
  for (const dateStr of dateStrs) {
    // Sequential, and each day's own service call — a shared public demo
    // server shouldn't be hit with a burst of concurrent requests.
    const result = await optimizeDay(calendarId, dateStr);
    if (result) results.push(result);
  }
  return results;
}
