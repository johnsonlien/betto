"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { EventCard } from "./event-card";
import { Button } from "@/components/ui/button";
import type { EventItem } from "./types";

/**
 * Floating ideas not yet assigned to a day. Drag one onto a day's all-day
 * zone or timed grid to schedule it.
 */
export function PoolPanel({
  events,
  canEdit,
  onOpenEvent,
  onAddIdea,
}: {
  events: EventItem[];
  canEdit: boolean;
  onOpenEvent: (eventId: string) => void;
  onAddIdea: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: "pool" });

  return (
    <div className="sticky top-0 z-30 rounded-md border border-dashed border-neutral-300 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-neutral-500">Ideas not scheduled yet — drag one onto a day.</p>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={onAddIdea}>
            + Idea
          </Button>
        )}
      </div>

      <SortableContext items={events.map((e) => e.id)} strategy={horizontalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 gap-2 overflow-x-auto pb-1">
          {events.length === 0 ? (
            <p className="flex items-center text-xs text-neutral-400">No ideas yet.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="w-40 shrink-0">
                <EventCard event={event} canEdit={canEdit} onOpen={() => onOpenEvent(event.id)} />
              </div>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
