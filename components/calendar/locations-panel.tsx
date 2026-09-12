"use client";

import { Map, Marker } from "react-map-gl/maplibre";
import { MAP_STYLE } from "./map-style";
import type { MapLocation } from "./types";

export function LocationsPanel({ locations }: { locations: MapLocation[] }) {
  if (locations.length === 0) {
    return (
      <aside className="flex h-80 w-full shrink-0 items-center justify-center rounded-md border border-neutral-200 p-4 text-center text-sm text-neutral-400 dark:border-neutral-800 lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)] lg:w-[28rem]">
        No pinned locations yet.
      </aside>
    );
  }

  const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
  const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;

  return (
    <aside className="h-80 w-full shrink-0 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)] lg:w-[28rem]">
      <Map
        initialViewState={{ longitude: avgLng, latitude: avgLat, zoom: 10 }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
      >
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
