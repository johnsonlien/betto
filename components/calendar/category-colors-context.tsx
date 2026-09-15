"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_CATEGORY_COLORS } from "./category";
import type { EventCategory } from "./types";

const CategoryColorsContext = createContext<Record<EventCategory, string>>(DEFAULT_CATEGORY_COLORS);

/** Provided once by CalendarBoard so deeply-nested event cells (EventCard, TimedEventBlock, MonthView) can read the calendar's tag colors without prop-drilling through every layer between. */
export function CategoryColorsProvider({
  colors,
  children,
}: {
  colors: Record<EventCategory, string>;
  children: ReactNode;
}) {
  return <CategoryColorsContext.Provider value={colors}>{children}</CategoryColorsContext.Provider>;
}

export function useCategoryColors() {
  return useContext(CategoryColorsContext);
}
