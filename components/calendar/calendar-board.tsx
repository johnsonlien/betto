"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { DayColumn } from "./day-column";
import { EventCard } from "./event-card";
import { EventDialog } from "./event-dialog";
import { moveEvent } from "@/lib/actions/events";
import type { DayColumnData, EventItem } from "./types";

type Columns = Record<string, EventItem[]>;

function findContainer(columns: Columns, id: string): string | undefined {
  if (id in columns) return id;
  return Object.keys(columns).find((date) => columns[date].some((event) => event.id === id));
}

export function CalendarBoard({
  calendarId,
  days,
  eventsByDate,
  canEdit,
  dayHrefBase,
}: {
  calendarId: string;
  days: DayColumnData[];
  eventsByDate: Record<string, EventItem[]>;
  canEdit: boolean;
  dayHrefBase?: string;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Columns>(eventsByDate);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<{ date: string; event: EventItem | null } | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeEvent = useMemo(() => {
    if (!activeId) return null;
    const container = findContainer(columns, activeId);
    return container ? columns[container].find((e) => e.id === activeId) ?? null : null;
  }, [activeId, columns]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(columns, String(active.id));
    const overContainer = findContainer(columns, String(over.id));
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumns((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((e) => e.id === active.id);
      const overIndex = overItems.findIndex((e) => e.id === over.id);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((e) => e.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex),
        ],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const overContainer = findContainer(columns, String(over.id));
    const activeContainer = findContainer(columns, String(active.id));
    if (!overContainer || !activeContainer) return;

    const items = columns[overContainer];
    const activeIndex = items.findIndex((e) => e.id === active.id);
    const overIndex = over.id in columns ? items.length - 1 : items.findIndex((e) => e.id === over.id);
    const targetIndex = overIndex < 0 ? Math.max(items.length - 1, 0) : overIndex;

    if (activeContainer === overContainer && activeIndex !== targetIndex && activeIndex !== -1) {
      setColumns((prev) => ({ ...prev, [overContainer]: arrayMove(prev[overContainer], activeIndex, targetIndex) }));
    }

    startTransition(async () => {
      await moveEvent(String(active.id), overContainer, targetIndex);
      router.refresh();
    });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {days.map((day) => (
            <DayColumn
              key={day.date}
              day={day}
              events={columns[day.date] ?? []}
              canEdit={canEdit}
              linkHref={dayHrefBase ? `${dayHrefBase}/${day.date}` : undefined}
              onOpenEvent={(eventId) => {
                const ev = (columns[day.date] ?? []).find((e) => e.id === eventId) ?? null;
                setDialogState({ date: day.date, event: ev });
              }}
              onAddEvent={() => setDialogState({ date: day.date, event: null })}
            />
          ))}
        </div>

        <DragOverlay>
          {activeEvent ? <EventCard event={activeEvent} canEdit={canEdit} onOpen={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      {dialogState && (
        <EventDialog
          open={Boolean(dialogState)}
          onOpenChange={(open) => !open && setDialogState(null)}
          calendarId={calendarId}
          date={dialogState.date}
          event={dialogState.event}
          canEdit={canEdit}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}
