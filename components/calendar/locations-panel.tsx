"use client";

import { useEffect, useState } from "react";
import { Layer, Map, Marker, Source } from "react-map-gl/maplibre";
import { MAP_STYLE } from "./map-style";
import type { MapLocation } from "./types";

// maplibre-gl v6 is ESM-only and loads its web worker (which does all vector
// tile parsing) from a separate file at runtime — bundlers can't rewrite
// that URL automatically, so without pointing it at the real bundled worker
// file, no tiles ever render (the map looks empty, or breaks further once
// zooming requests tiles the worker was never able to parse).
const MAPLIBRE_WORKER_URL = new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href;

// Same free public OSRM demo instance used for the "optimize" server action
// (see lib/actions/routing.ts) — road-following geometry only, called
// directly from the browser since OSRM sends open CORS headers and this is
// read-only.
const OSRM_BASE = "https://router.project-osrm.org";

export type RouteDayStops = {
  date: string;
  /** Ordered by the day's event start times. */
  points: { lat: number; lng: number }[];
};

export function LocationsPanel({
  locations,
  fill,
  routeStops,
  showRoutes,
}: {
  locations: MapLocation[];
  /** Fill the parent container's own size instead of the fixed sticky-sidebar sizing (e.g. inside a resizable pane). */
  fill?: boolean;
  /** Per-day ordered stops to draw a road route through, when showRoutes is on. */
  routeStops?: RouteDayStops[];
  showRoutes?: boolean;
}) {
  const [routeGeometries, setRouteGeometries] = useState<Record<string, [number, number][]>>({});

  useEffect(() => {
    if (!showRoutes || !routeStops || routeStops.length === 0) {
      setRouteGeometries({});
      return;
    }

    let cancelled = false;
    Promise.all(
      routeStops.map(async (day) => {
        const coords = day.points.map((p) => `${p.lng},${p.lat}`).join(";");
        try {
          const res = await fetch(`${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`);
          if (!res.ok) return null;
          const data = await res.json();
          const coordinates = data.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
          return coordinates ? ([day.date, coordinates] as const) : null;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setRouteGeometries(Object.fromEntries(results.filter((r): r is readonly [string, [number, number][]] => r !== null)));
    });

    return () => {
      cancelled = true;
    };
  }, [showRoutes, routeStops]);

  const asideClassName = fill
    ? "h-full w-full overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800"
    : "h-80 w-full shrink-0 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)] lg:w-[28rem]";

  if (locations.length === 0) {
    return (
      <aside
        className={`flex items-center justify-center p-4 text-center text-sm text-neutral-400 ${asideClassName}`}
      >
        No pinned locations yet.
      </aside>
    );
  }

  const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
  const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;

  return (
    <aside className={asideClassName}>
      <Map
        initialViewState={{ longitude: avgLng, latitude: avgLat, zoom: 10 }}
        mapStyle={MAP_STYLE}
        workerUrl={MAPLIBRE_WORKER_URL}
        style={{ width: "100%", height: "100%" }}
      >
        {Object.entries(routeGeometries).map(([date, coordinates]) => (
          <Source
            key={date}
            id={`route-${date}`}
            type="geojson"
            data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } }}
          >
            <Layer
              id={`route-line-${date}`}
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#0d9488", "line-width": 3, "line-opacity": 0.7 }}
            />
          </Source>
        ))}

        {locations.map((loc) => (
          <Marker key={loc.id} longitude={loc.lng} latitude={loc.lat}>
            <div
              title={loc.name}
              className="h-3.5 w-3.5 rounded-full bg-teal-600 ring-2 ring-white dark:ring-neutral-900"
            />
          </Marker>
        ))}
      </Map>
    </aside>
  );
}
