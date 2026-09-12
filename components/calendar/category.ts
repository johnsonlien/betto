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
