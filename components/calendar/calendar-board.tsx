"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
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
import { HoursAxis } from "./hours-axis";
import { moveEvent } from "@/lib/actions/events";
import type { DayColumnData, EventItem, LocationOption, MapLocation } from "./types";

// MapLibre needs the browser and is only used on pages that pass mapLocations —
// load it lazily so the day view (which never shows the panel) doesn't ship it.
const LocationsPanel = dynamic(() => import("./locations-panel").then((m) => m.LocationsPanel), {
  ssr: false,
});

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
  locationOptions = [],
  mapLocations,
}: {
  calendarId: string;
  days: DayColumnData[];
  eventsByDate: Record<string, EventItem[]>;
  canEdit: boolean;
  dayHrefBase?: string;
  locationOptions?: LocationOption[];
  /** When provided, renders a locations map panel filterable by selected day(s). */
  mapLocations?: MapLocation[];
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Columns>(eventsByDate);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<{ date: string; event: EventItem | null } | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function dayIndex(date: string) {
    return days.findIndex((d) => d.date === date);
  }

  function handleHeaderPointerDown(date: string) {
    setDragAnchor(date);
  }

  function handleHeaderPointerEnter(date: string) {
    if (!dragAnchor) return;
    const startIdx = dayIndex(dragAnchor);
    const endIdx = dayIndex(date);
    if (startIdx === -1 || endIdx === -1) return;
    const [lo, hi] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    setSelectedDates(new Set(days.slice(lo, hi + 1).map((d) => d.date)));
  }

  function handleHeaderClick(date: string) {
    if (dayHrefBase) router.push(`${dayHrefBase}/${date}`);
  }

  useEffect(() => {
    if (!dragAnchor) return;
    const clearAnchor = () => setDragAnchor(null);
    window.addEventListener("pointerup", clearAnchor);
    return () => window.removeEventListener("pointerup", clearAnchor);
  }, [dragAnchor]);

  const dayRows = useMemo(() => {
    const rows: DayColumnData[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [days]);
  const isSingleDay = days.length === 1;

  const visibleLocations = useMemo(() => {
    if (!mapLocations) return undefined;
    if (selectedDates.size === 0) return mapLocations;
    return mapLocations.filter((loc) => loc.eventDates.some((d) => selectedDates.has(d)));
  }, [mapLocations, selectedDates]);

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
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {dayRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2">
                {!isSingleDay && <HoursAxis />}
                <div className="flex min-w-0 flex-1 gap-4 overflow-x-auto pb-2">
                {row.map((day) => (
                  <DayColumn
                    key={day.date}
                    day={day}
                    events={columns[day.date] ?? []}
                    canEdit={canEdit}
                    selected={selectedDates.has(day.date)}
                    wide={isSingleDay}
                    onHeaderClick={handleHeaderClick}
                    onHeaderPointerDown={handleHeaderPointerDown}
                    onHeaderPointerEnter={handleHeaderPointerEnter}
                    onOpenEvent={(eventId) => {
                      const ev = (columns[day.date] ?? []).find((e) => e.id === eventId) ?? null;
                      setDialogState({ date: day.date, event: ev });
                    }}
                    onAddEvent={() => setDialogState({ date: day.date, event: null })}
                  />
                ))}
                </div>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeEvent ? <EventCard event={activeEvent} canEdit={canEdit} onOpen={() => {}} /> : null}
          </DragOverlay>
        </DndContext>

        {visibleLocations && <LocationsPanel locations={visibleLocations} />}
      </div>

      {dialogState && (
        <EventDialog
          open={Boolean(dialogState)}
          onOpenChange={(open) => !open && setDialogState(null)}
          calendarId={calendarId}
          date={dialogState.date}
          event={dialogState.event}
          canEdit={canEdit}
          locationOptions={locationOptions}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}
