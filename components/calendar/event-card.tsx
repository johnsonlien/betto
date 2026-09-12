"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatTimeLabelFromValue } from "@/lib/dates";
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
      {event.startTime && (
        <span className="text-xs text-neutral-400">{formatTimeLabelFromValue(event.startTime)}</span>
      )}
      <span className="text-neutral-900 dark:text-neutral-100">{event.title}</span>
    </button>
  );
}
