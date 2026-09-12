"use server";

// Nominatim (OpenStreetMap's free geocoder) — no API key or billing account,
// consistent with the OpenFreeMap tiles already used for the map itself.
// Usage policy requires identifying the app via User-Agent:
// https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
};

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");

  const res = await fetch(url, {
    headers: { "User-Agent": "Betto (collaborative trip calendar)" },
  });
  if (!res.ok) return [];

  const results = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return results.map((r) => ({
    label: r.display_name,
    lat: Number.parseFloat(r.lat),
    lng: Number.parseFloat(r.lon),
  }));
}
