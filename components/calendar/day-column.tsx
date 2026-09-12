"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EventCard } from "./event-card";
import { DayGrid } from "./day-grid";
import { HEADER_HEIGHT, ALL_DAY_HEIGHT, ADD_BUTTON_HEIGHT } from "@/lib/calendar/time-grid";
import type { DayColumnData, EventItem } from "./types";

export function DayColumn({
  day,
  events,
  canEdit,
  onOpenEvent,
  selected,
  onHeaderClick,
  onHeaderPointerDown,
  onHeaderPointerEnter,
  onCreateInRange,
  wide,
}: {
  day: DayColumnData;
  events: EventItem[];
  canEdit: boolean;
  onOpenEvent: (eventId: string) => void;
  selected?: boolean;
  /** Fires on a plain click (mousedown+up on this same day, no drag) — focuses the day. */
  onHeaderClick?: (date: string) => void;
  /** Start of a possible drag-select gesture. */
  onHeaderPointerDown?: (date: string) => void;
  /** Cursor entered this day's header while a drag-select is in progress. */
  onHeaderPointerEnter?: (date: string) => void;
  /** A time range was selected in the grid and "+ Event" was clicked. */
  onCreateInRange: (startTime: string, endTime: string) => void;
  /** Fill the available width instead of a fixed column width (single-day view). */
  wide?: boolean;
}) {
  const allDayEvents = events.filter((e) => !e.startTime);
  const timedEvents = events.filter((e) => e.startTime);
  const { setNodeRef } = useDroppable({ id: `allday:${day.date}` });

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-md border border-neutral-200 p-1.5 dark:border-neutral-800 ${
        wide ? "min-w-0 flex-1" : "w-40 shrink-0"
      } ${day.inRange ? "" : "opacity-40"} ${
        selected ? "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onHeaderClick?.(day.date)}
        onPointerDown={() => onHeaderPointerDown?.(day.date)}
        onPointerEnter={() => onHeaderPointerEnter?.(day.date)}
        style={{ height: HEADER_HEIGHT }}
        className="select-none rounded-md bg-neutral-100 px-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {day.label}
      </button>

      {/* Fixed height so every column's grid starts at the same offset,
          keeping the shared hours axis aligned across the row. */}
      <SortableContext items={allDayEvents.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col gap-1 overflow-y-auto" style={{ height: ALL_DAY_HEIGHT }}>
          {allDayEvents.map((event) => (
            <EventCard key={event.id} event={event} canEdit={canEdit} onOpen={() => onOpenEvent(event.id)} />
          ))}
        </div>
      </SortableContext>

      {/* Reserved (empty) so the fixed top-zone height — and thus the grid's
          alignment with the shared hours axis — stays the same as before. */}
      <div style={{ height: ADD_BUTTON_HEIGHT }} />

      <DayGrid
        date={day.date}
        events={timedEvents}
        canEdit={canEdit && day.inRange}
        onOpenEvent={onOpenEvent}
        onCreateInRange={onCreateInRange}
      />
    </div>
  );
}
