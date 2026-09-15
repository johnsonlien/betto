"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatTimeLabelFromValue } from "@/lib/dates";
import { formatCost } from "@/lib/calendar/cost";
import { CATEGORY_LABELS } from "./category";
import { useCategoryColors } from "./category-colors-context";
import type { EventItem } from "./types";

export function EventCard({
  event,
  canEdit,
  onOpen,
}: {
  event: EventItem;
  canEdit: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
    disabled: !canEdit,
  });
  const categoryColors = useCategoryColors();
  const color = event.category ? categoryColors[event.category] : null;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderLeftColor: color ?? undefined,
        borderLeftWidth: color ? 3 : undefined,
        backgroundColor: color ? `${color}1a` : undefined,
      }}
      className={`flex w-full flex-col gap-0.5 rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-left text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${
        isDragging ? "opacity-40" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      {(event.startTime || event.category) && (
        <span className="flex items-center gap-1 text-xs text-neutral-400">
          {event.startTime && <span>{formatTimeLabelFromValue(event.startTime)}</span>}
          {event.startTime && event.category && <span>·</span>}
          {event.category && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color ?? undefined }} />
              {CATEGORY_LABELS[event.category]}
            </span>
          )}
        </span>
      )}
      <span className="flex items-center justify-between gap-2">
        <span className="text-neutral-900 dark:text-neutral-100">{event.title}</span>
        {event.cost && <span className="shrink-0 text-xs text-neutral-400">{formatCost(event.cost)}</span>}
      </span>
      {event.locationName && <span className="truncate text-xs text-neutral-400">{event.locationName}</span>}
      {event.reservationUrl && (
        <a
          href={event.reservationUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="truncate text-xs text-teal-600 hover:underline dark:text-teal-400"
        >
          Reservation ↗
        </a>
      )}
    </button>
  );
}
