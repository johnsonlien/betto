"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, formatDateOnly, formatTimeLabelFromValue, startOfMonth, startOfWeek } from "@/lib/dates";
import { CATEGORY_DOT_CLASSES } from "./category";
import type { EventItem } from "./types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_EVENTS = 3;

/** All-day/untimed events first, then timed events sorted by start time. */
function sortForCell(events: EventItem[]): EventItem[] {
  return [...events].sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return -1;
    if (!b.startTime) return 1;
    return a.startTime.localeCompare(b.startTime);
  });
}

export function MonthView({
  month,
  columns,
  inRangeDates,
  canEdit,
  onOpenEvent,
  onDayClick,
  onAddEvent,
}: {
  /** First-of-month, UTC midnight. */
  month: Date;
  columns: Record<string, EventItem[]>;
  /** Dates ("YYYY-MM-DD") that fall within the calendar's trip range. */
  inRangeDates: Set<string>;
  canEdit: boolean;
  onOpenEvent: (date: string, eventId: string) => void;
  onDayClick: (date: string) => void;
  onAddEvent: (date: string) => void;
}) {
  // null until mounted — computing "today" during SSR risks a hydration
  // mismatch against a viewer's browser (different clock/timezone), so the
  // "today" badge only appears once the client has settled on a value itself.
  const [todayStr, setTodayStr] = useState<string | null>(null);
  useEffect(() => setTodayStr(formatDateOnly(new Date())), []);

  const cells = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = addDays(startOfMonth(addDays(monthStart, 32)), -1); // last day of `month`
    const gridStart = startOfWeek(monthStart);
    const gridEnd = addDays(startOfWeek(monthEnd), 6);
    const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;

    return Array.from({ length: totalDays }, (_, i) => {
      const date = addDays(gridStart, i);
      const dateStr = formatDateOnly(date);
      return {
        date,
        dateStr,
        dayOfMonth: date.getUTCDate(),
        inMonth: date.getUTCMonth() === monthStart.getUTCMonth(),
        inRange: inRangeDates.has(dateStr),
      };
    });
  }, [month, inRangeDates]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-400">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, dateStr, dayOfMonth, inMonth, inRange }) => {
          const events = sortForCell(columns[dateStr] ?? []);
          const visible = events.slice(0, MAX_VISIBLE_EVENTS);
          const hiddenCount = events.length - visible.length;
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={`group flex min-h-[104px] flex-col gap-1 rounded-md border border-neutral-200 p-1.5 dark:border-neutral-800 ${
                inMonth ? "bg-white dark:bg-neutral-950" : "bg-neutral-50 dark:bg-neutral-900/40"
              } ${!inRange ? "opacity-40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onDayClick(dateStr)}
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs hover:underline ${
                    isToday
                      ? "bg-teal-600 font-medium text-white hover:no-underline"
                      : inMonth
                        ? "text-neutral-700 dark:text-neutral-300"
                        : "text-neutral-300 dark:text-neutral-700"
                  }`}
                >
                  {dayOfMonth}
                </button>
                {canEdit && inRange && (
                  <button
                    type="button"
                    onClick={() => onAddEvent(dateStr)}
                    className="opacity-0 text-xs leading-none text-neutral-400 hover:text-neutral-700 focus:opacity-100 group-hover:opacity-100 dark:hover:text-neutral-200"
                    aria-label="Add event"
                  >
                    +
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {visible.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEvent(dateStr, event.id);
                    }}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {event.category && (
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_DOT_CLASSES[event.category]}`} />
                    )}
                    {event.startTime && (
                      <span className="shrink-0 text-neutral-400">{formatTimeLabelFromValue(event.startTime)}</span>
                    )}
                    <span className="truncate">{event.title}</span>
                  </button>
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onDayClick(dateStr)}
                    className="px-1 text-left text-[10px] text-neutral-400 hover:underline"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
