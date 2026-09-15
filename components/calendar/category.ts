import type { EventCategory } from "./types";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  LODGING: "Lodging",
  FOOD: "Food",
  ACTIVITY: "Activity",
  TRANSPORT: "Transport",
  OTHER: "Other",
};

export const CATEGORY_DOT_CLASSES: Record<EventCategory, string> = {
  LODGING: "bg-indigo-500",
  FOOD: "bg-orange-500",
  ACTIVITY: "bg-green-500",
  TRANSPORT: "bg-sky-500",
  OTHER: "bg-neutral-400",
};

export const CATEGORY_OPTIONS: EventCategory[] = ["LODGING", "FOOD", "ACTIVITY", "TRANSPORT", "OTHER"];

// Hex equivalents of the Tailwind dot colors above — the default event-cell
// accent color for each tag, used when a calendar has no custom override.
export const DEFAULT_CATEGORY_COLORS: Record<EventCategory, string> = {
  LODGING: "#6366f1", // indigo-500
  FOOD: "#f97316", // orange-500
  ACTIVITY: "#22c55e", // green-500
  TRANSPORT: "#0ea5e9", // sky-500
  OTHER: "#a3a3a3", // neutral-400
};

// A curated set of swatches offered in the tag-color settings dialog —
// keeps choices legible in both light and dark mode rather than allowing
// arbitrary/low-contrast picks.
export const CATEGORY_COLOR_PALETTE: string[] = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#a3a3a3", // neutral
];

/** Merges a calendar's custom per-tag colors (if any) over the built-in defaults. */
export function resolveCategoryColors(
  overrides: Partial<Record<EventCategory, string>> | null | undefined
): Record<EventCategory, string> {
  return { ...DEFAULT_CATEGORY_COLORS, ...overrides };
}
