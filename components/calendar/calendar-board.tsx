"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { DayColumn } from "./day-column";
import { EventCard } from "./event-card";
import { EventDialog } from "./event-dialog";
import { HoursAxis } from "./hours-axis";
import { PoolPanel } from "./pool-panel";
import { Button } from "@/components/ui/button";
import { CollaboratorAvatars, type Person } from "@/components/collaborator-avatars";
import { moveEvent, moveToGridSlot, moveToPool } from "@/lib/actions/events";
import { HOUR_HEIGHT, timeToMinutes, minutesToTimeValue, snapMinutes } from "@/lib/calendar/time-grid";
import type { DayColumnData, EventItem, LocationOption, MapLocation } from "./types";

// MapLibre needs the browser and is only used on pages that pass mapLocations —
// load it lazily so the day view (which never shows the panel) doesn't ship it.
const LocationsPanel = dynamic(() => import("./locations-panel").then((m) => m.LocationsPanel), {
  ssr: false,
});

type Columns = Record<string, EventItem[]>;

const ALL_DAY_PREFIX = "allday:";
const GRID_PREFIX = "grid:";
const POOL_ID = "pool";
const POOL_KEY = "__pool__";

/** Resolves a drop target to an all-day-list container (date), if it is one. */
function findAllDayContainer(columns: Columns, id: string): string | undefined {
  if (id.startsWith(ALL_DAY_PREFIX)) return id.slice(ALL_DAY_PREFIX.length);
  if (id.startsWith(GRID_PREFIX) || id === POOL_ID) return undefined;
  return Object.keys(columns).find(
    (date) => date !== POOL_KEY && columns[date].some((e) => e.id === id && !e.startTime)
  );
}

function isPoolTarget(columns: Columns, id: string): boolean {
  if (id === POOL_ID) return true;
  return (columns[POOL_KEY] ?? []).some((e) => e.id === id);
}

function findEventById(columns: Columns, id: string): EventItem | undefined {
  for (const date of Object.keys(columns)) {
    const found = columns[date].find((e) => e.id === id);
    if (found) return found;
  }
  return undefined;
}

function removeEvent(columns: Columns, id: string): Columns {
  const next: Columns = {};
  for (const key of Object.keys(columns)) {
    next[key] = columns[key].filter((e) => e.id !== id);
  }
  return next;
}

export type BoardHeader = {
  backHref: string;
  calendarTitle: string;
  dateRangeLabel: string;
  people: Person[];
};

export function CalendarBoard({
  calendarId,
  days,
  eventsByDate,
  canEdit,
  dayHrefBase,
  locationOptions = [],
  mapLocations,
  poolEvents: initialPoolEvents = [],
  header,
}: {
  calendarId: string;
  days: DayColumnData[];
  eventsByDate: Record<string, EventItem[]>;
  canEdit: boolean;
  dayHrefBase?: string;
  locationOptions?: LocationOption[];
  /** When provided, renders a locations map panel filterable by selected day(s). */
  mapLocations?: MapLocation[];
  /** Unscheduled "idea pool" events. Only meaningful with `header` (the board view). */
  poolEvents?: EventItem[];
  /** Renders a header row (title, date range, collaborators, idea-pool toggle) above the board. */
  header?: BoardHeader;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Columns>({ ...eventsByDate, [POOL_KEY]: initialPoolEvents });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<{
    date: string | null;
    event: EventItem | null;
    prefill?: { startTime: string; endTime: string } | null;
  }>({ date: days[0]?.date ?? "", event: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const [showPool, setShowPool] = useState(false);
  const [, startTransition] = useTransition();

  const poolEvents = columns[POOL_KEY] ?? [];

  function openDialog(date: string | null, event: EventItem | null, prefill?: { startTime: string; endTime: string }) {
    setDialogState({ date, event, prefill });
    setDialogOpen(true);
  }

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
    return findEventById(columns, activeId) ?? null;
  }, [activeId, columns]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  // No live shuffle-preview while dragging (list order and the pool/grid
  // branching would multiply the complexity) — everything is computed and
  // applied once, on drop.
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (overIdStr.startsWith(GRID_PREFIX)) {
      const toDate = overIdStr.slice(GRID_PREFIX.length);
      const draggedRect = active.rect.current.translated;
      if (!draggedRect) return;

      const offsetY = draggedRect.top - over.rect.top;
      const rawMinutes = (offsetY / HOUR_HEIGHT) * 60;
      const startMinutes = Math.max(0, Math.min(23 * 60, snapMinutes(rawMinutes)));

      const activeEventData = findEventById(columns, activeIdStr);
      const duration =
        activeEventData?.startTime && activeEventData.endTime
          ? timeToMinutes(activeEventData.endTime) - timeToMinutes(activeEventData.startTime)
          : 60;
      const endMinutes = Math.min(24 * 60, startMinutes + duration);

      const newStartTime = minutesToTimeValue(startMinutes);
      const newEndTime = minutesToTimeValue(endMinutes);

      setColumns((prev) => {
        if (!activeEventData) return prev;
        const withoutActive = removeEvent(prev, activeIdStr);
        const moved: EventItem = { ...activeEventData, startTime: newStartTime, endTime: newEndTime };
        withoutActive[toDate] = [...(withoutActive[toDate] ?? []), moved];
        return withoutActive;
      });

      startTransition(async () => {
        await moveToGridSlot(activeIdStr, toDate, newStartTime, newEndTime);
        router.refresh();
      });
      return;
    }

    if (isPoolTarget(columns, overIdStr)) {
      const poolList = columns[POOL_KEY] ?? [];
      const overIndex = overIdStr === POOL_ID ? poolList.length : poolList.findIndex((e) => e.id === overIdStr);
      const targetIndex = overIndex >= 0 ? overIndex : poolList.length;

      setColumns((prev) => {
        const activeEventData = findEventById(prev, activeIdStr);
        if (!activeEventData) return prev;
        const withoutActive = removeEvent(prev, activeIdStr);
        const moved: EventItem = { ...activeEventData, startTime: null, endTime: null };
        const list = withoutActive[POOL_KEY] ?? [];
        withoutActive[POOL_KEY] = [...list.slice(0, targetIndex), moved, ...list.slice(targetIndex)];
        return withoutActive;
      });

      startTransition(async () => {
        await moveToPool(activeIdStr, targetIndex);
        router.refresh();
      });
      return;
    }

    const overContainer = findAllDayContainer(columns, overIdStr);
    if (!overContainer) return;

    const wasTimed = Boolean(findEventById(columns, activeIdStr)?.startTime);
    const overList = columns[overContainer] ?? [];
    const overEventIndex = overList.findIndex((e) => e.id === overIdStr);
    const targetIndex = overEventIndex >= 0 ? overEventIndex : overList.length;

    setColumns((prev) => {
      const activeEventData = findEventById(prev, activeIdStr);
      if (!activeEventData) return prev;
      const withoutActive = removeEvent(prev, activeIdStr);
      const moved: EventItem = wasTimed ? { ...activeEventData, startTime: null, endTime: null } : activeEventData;
      const list = withoutActive[overContainer] ?? [];
      withoutActive[overContainer] = [...list.slice(0, targetIndex), moved, ...list.slice(targetIndex)];
      return withoutActive;
    });

    startTransition(async () => {
      await moveEvent(activeIdStr, overContainer, targetIndex, wasTimed);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {header && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Link
              href={header.backHref}
              className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              &larr; {header.calendarTitle}
            </Link>
            <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">{header.dateRangeLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPool((s) => !s)}>
              {showPool ? "Hide" : "Show"} idea pool{poolEvents.length > 0 ? ` (${poolEvents.length})` : ""}
            </Button>
            <CollaboratorAvatars people={header.people} />
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {header && showPool && (
          <PoolPanel
            events={poolEvents}
            canEdit={canEdit}
            onOpenEvent={(eventId) => {
              const ev = poolEvents.find((e) => e.id === eventId) ?? null;
              openDialog(null, ev);
            }}
            onAddIdea={() => openDialog(null, null)}
          />
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
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
                        openDialog(day.date, ev);
                      }}
                      onCreateInRange={(startTime, endTime) => openDialog(day.date, null, { startTime, endTime })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {visibleLocations && <LocationsPanel locations={visibleLocations} />}
        </div>

        <DragOverlay>
          {activeEvent ? <EventCard event={activeEvent} canEdit={canEdit} onOpen={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        calendarId={calendarId}
        date={dialogState.date}
        event={dialogState.event}
        canEdit={canEdit}
        locationOptions={locationOptions}
        prefill={dialogState.prefill}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
