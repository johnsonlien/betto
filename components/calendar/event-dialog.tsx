"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEvent, updateEvent, deleteEvent } from "@/lib/actions/events";
import type { EventItem } from "./types";

type Draft = {
  title: string;
  startTime: string;
  endTime: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = { title: "", startTime: "", endTime: "", notes: "" };

export function EventDialog({
  open,
  onOpenChange,
  calendarId,
  date,
  event,
  canEdit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarId: string;
  date: string;
  event: EventItem | null;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraft(
      event
        ? {
            title: event.title,
            startTime: event.startTime ?? "",
            endTime: event.endTime ?? "",
            notes: event.notes ?? "",
          }
        : EMPTY_DRAFT
    );
  }, [open, event]);

  const isEditing = Boolean(event);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        if (event) {
          await updateEvent(event.id, draft);
        } else {
          await createEvent(calendarId, { ...draft, date });
        }
        onOpenChange(false);
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleDelete() {
    if (!event) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteEvent(event.id);
        onOpenChange(false);
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{canEdit ? (isEditing ? "Edit event" : "New event") : "Event"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={draft.title}
              disabled={!canEdit}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Dinner at the harbor"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="event-start">Starts</Label>
              <Input
                id="event-start"
                type="time"
                value={draft.startTime}
                disabled={!canEdit}
                onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="event-end">Ends</Label>
              <Input
                id="event-end"
                type="time"
                value={draft.endTime}
                disabled={!canEdit}
                onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-notes">Notes</Label>
            <Textarea
              id="event-notes"
              value={draft.notes}
              disabled={!canEdit}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Reservation under Lien, ask for the patio"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {canEdit && (
          <DialogFooter>
            {isEditing && (
              <Button type="button" variant="ghost" onClick={handleDelete} disabled={isPending}>
                Delete
              </Button>
            )}
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isEditing ? "Save changes" : "Add event"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
