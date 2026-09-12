"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { TimedEventBlock } from "./timed-event-block";
import {
  HOUR_HEIGHT,
  GRID_HEIGHT,
  timeToMinutes,
  minutesToTimeValue,
  snapMinutes,
  computeOverlapLayout,
} from "@/lib/calendar/time-grid";
import type { EventItem } from "./types";

type Range = { startMinutes: number; endMinutes: number };

export function DayGrid({
  date,
  events,
  canEdit,
  onOpenEvent,
  onCreateInRange,
}: {
  date: string;
  events: EventItem[];
  canEdit: boolean;
  onOpenEvent: (eventId: string) => void;
  /** Called with the selected range once the "+ Event" button is clicked. */
  onCreateInRange: (startTime: string, endTime: string) => void;
}) {
  const { setNodeRef: setDroppableRef } = useDroppable({ id: `grid:${date}` });
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [dragY, setDragY] = useState<{ start: number; current: number } | null>(null);
  const [selection, setSelection] = useState<Range | null>(null);

  function setRefs(node: HTMLDivElement | null) {
    gridRef.current = node;
    setDroppableRef(node);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!canEdit) return;
    if (e.target !== e.currentTarget) return; // don't hijack clicks/drags starting on an event block
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    setSelection(null);
    setDragY({ start: y, current: y });
  }

  useEffect(() => {
    if (!dragY) return;

    function handleMove(e: PointerEvent) {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const y = Math.max(0, Math.min(GRID_HEIGHT, e.clientY - rect.top));
      setDragY((prev) => (prev ? { ...prev, current: y } : prev));
    }

    function handleUp() {
      setDragY((prev) => {
        if (!prev) return null;
        const rawStart = (Math.min(prev.start, prev.current) / HOUR_HEIGHT) * 60;
        const rawEnd = (Math.max(prev.start, prev.current) / HOUR_HEIGHT) * 60;
        let startMinutes = snapMinutes(rawStart);
        let endMinutes = snapMinutes(rawEnd);
        if (endMinutes - startMinutes < 30) endMinutes = startMinutes + 60; // plain click -> default 1hr
        endMinutes = Math.min(24 * 60, endMinutes);
        setSelection({ startMinutes, endMinutes });
        return null;
      });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragY]);

  useEffect(() => {
    if (!selection) return;
    function handleOutsidePointerDown(e: PointerEvent) {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setSelection(null);
      }
    }
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [selection]);

  const positioned = events
    .filter((e): e is EventItem & { startTime: string } => Boolean(e.startTime))
    .map((e) => ({
      event: e,
      startMinutes: timeToMinutes(e.startTime),
      endMinutes: e.endTime ? timeToMinutes(e.endTime) : timeToMinutes(e.startTime) + 60,
    }));

  const layout = computeOverlapLayout(positioned.map((p) => ({ id: p.event.id, ...p })));
  const layoutById = new Map(layout.map((l) => [l.id, l]));

  return (
    <div
      ref={setRefs}
      onPointerDown={handlePointerDown}
      className="relative w-full"
      style={{
        height: GRID_HEIGHT,
        backgroundImage: `repeating-linear-gradient(to bottom, rgba(120,120,120,0.15) 0, rgba(120,120,120,0.15) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
      }}
    >
      {positioned.map(({ event, startMinutes, endMinutes }) => {
        const l = layoutById.get(event.id);
        const colCount = l?.colCount ?? 1;
        const colIndex = l?.colIndex ?? 0;
        return (
          <TimedEventBlock
            key={event.id}
            event={event}
            top={(startMinutes / 60) * HOUR_HEIGHT}
            height={((endMinutes - startMinutes) / 60) * HOUR_HEIGHT}
            left={`${(colIndex / colCount) * 100}%`}
            width={`${(1 / colCount) * 100}%`}
            canEdit={canEdit}
            onOpen={() => onOpenEvent(event.id)}
          />
        );
      })}

      {dragY && (
        <div
          className="pointer-events-none absolute inset-x-0 rounded bg-teal-300/40 dark:bg-teal-700/40"
          style={{ top: Math.min(dragY.start, dragY.current), height: Math.abs(dragY.current - dragY.start) }}
        />
      )}

      {selection && (
        <div
          className="absolute inset-x-0 z-20 flex items-start justify-center overflow-hidden rounded border border-teal-400 bg-teal-100/70 pt-1 dark:border-teal-700 dark:bg-teal-900/50"
          style={{
            top: (selection.startMinutes / 60) * HOUR_HEIGHT,
            height: ((selection.endMinutes - selection.startMinutes) / 60) * HOUR_HEIGHT,
          }}
        >
          <button
            type="button"
            onClick={() => {
              onCreateInRange(minutesToTimeValue(selection.startMinutes), minutesToTimeValue(selection.endMinutes));
              setSelection(null);
            }}
            className="rounded-md bg-teal-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-teal-700"
          >
            + Event
          </button>
        </div>
      )}
    </div>
  );
}
