"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatTimeLabelFromValue } from "@/lib/dates";
import { CATEGORY_LABELS, CATEGORY_DOT_CLASSES } from "./category";
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

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      style={{ transform: CSS.Transform.toString(transform), transition }}
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
              <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOT_CLASSES[event.category]}`} />
              {CATEGORY_LABELS[event.category]}
            </span>
          )}
        </span>
      )}
      <span className="text-neutral-900 dark:text-neutral-100">{event.title}</span>
      {event.locationName && <span className="truncate text-xs text-neutral-400">{event.locationName}</span>}
    </button>
  );
}
