"use client";

import Link from "next/link";
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
  linkHref,
}: {
  day: DayColumnData;
  events: EventItem[];
  canEdit: boolean;
  onOpenEvent: (eventId: string) => void;
  onAddEvent: () => void;
  linkHref?: string;
}) {
  const { setNodeRef } = useDroppable({ id: day.date });

  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2 ${day.inRange ? "" : "opacity-40"}`}>
      {linkHref ? (
        <Link
          href={linkHref}
          className="text-sm font-medium text-neutral-700 hover:underline dark:text-neutral-300"
        >
          {day.label}
        </Link>
      ) : (
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{day.label}</span>
      )}

      <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-1.5">
          {events.map((event) => (
            <EventCard key={event.id} event={event} canEdit={canEdit} onOpen={() => onOpenEvent(event.id)} />
          ))}
        </div>
      </SortableContext>

      {canEdit && (
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
