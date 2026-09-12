"use client";

import type { CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";
import { formatTimeLabelFromValue } from "@/lib/dates";
import { CATEGORY_LABELS, CATEGORY_DOT_CLASSES } from "./category";
import type { EventItem } from "./types";

export function TimedEventBlock({
  event,
  top,
  height,
  left,
  width,
  canEdit,
  onOpen,
}: {
  event: EventItem;
  top: number;
  height: number;
  left: string;
  width: string;
  canEdit: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    disabled: !canEdit,
  });

  const style: CSSProperties = {
    position: "absolute",
    top,
    height: Math.max(height, 20),
    left,
    width,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 30 : 10,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      style={style}
      className={`overflow-hidden rounded-md border border-teal-200 bg-teal-50 px-1.5 py-1 text-left text-[11px] leading-tight dark:border-teal-900 dark:bg-teal-950/40 ${
        isDragging ? "opacity-50" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      {event.startTime && (
        <div className="text-teal-700 dark:text-teal-400">{formatTimeLabelFromValue(event.startTime)}</div>
      )}
      <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{event.title}</div>
      {event.category && (
        <div className="flex items-center gap-1 text-neutral-500">
          <span className={`h-1 w-1 rounded-full ${CATEGORY_DOT_CLASSES[event.category]}`} />
          {CATEGORY_LABELS[event.category]}
        </div>
      )}
    </button>
  );
}
