"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EventCard } from "./event-card";
import type { DayColumnData, EventItem } from "./types";

export function DayColumn({
  day,
  events,
  canEdit,
  onOpenEvent,
  onAddEvent,
  selected,
  onHeaderClick,
  onHeaderPointerDown,
  onHeaderPointerEnter,
  wide,
}: {
  day: DayColumnData;
  events: EventItem[];
  canEdit: boolean;
  onOpenEvent: (eventId: string) => void;
  onAddEvent: () => void;
  selected?: boolean;
  /** Fires on a plain click (mousedown+up on this same day, no drag) — focuses the day. */
  onHeaderClick?: (date: string) => void;
  /** Start of a possible drag-select gesture. */
  onHeaderPointerDown?: (date: string) => void;
  /** Cursor entered this day's header while a drag-select is in progress. */
  onHeaderPointerEnter?: (date: string) => void;
  /** Fill the available width instead of a fixed column width (single-day view). */
  wide?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: day.date });

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border border-neutral-200 p-1.5 dark:border-neutral-800 ${
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
        className="select-none rounded-md bg-neutral-100 px-2 py-1.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {day.label}
      </button>

      <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-1.5">
          {events.map((event) => (
            <EventCard key={event.id} event={event} canEdit={canEdit} onOpen={() => onOpenEvent(event.id)} />
          ))}
        </div>
      </SortableContext>

      {canEdit && day.inRange && (
        <button
          type="button"
          onClick={onAddEvent}
          className="rounded-md px-2 py-1 text-left text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
        >
          Add event
        </button>
      )}
    </div>
  );
}
