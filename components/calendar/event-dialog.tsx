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
import { createLocation } from "@/lib/actions/locations";
import { searchAddress, type GeocodeResult } from "@/lib/actions/geocode";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "./category";
import type { EventCategory, EventItem, LocationOption } from "./types";

const NEW_LOCATION = "__new__";

type Draft = {
  title: string;
  startTime: string;
  endTime: string;
  notes: string;
  category: EventCategory | "";
  locationId: string;
};

const EMPTY_DRAFT: Draft = { title: "", startTime: "", endTime: "", notes: "", category: "", locationId: "" };

export function EventDialog({
  open,
  onOpenChange,
  calendarId,
  date,
  event,
  canEdit,
  locationOptions,
  prefill,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarId: string;
  /** null when creating an unscheduled idea-pool event. */
  date: string | null;
  event: EventItem | null;
  canEdit: boolean;
  locationOptions: LocationOption[];
  /** Prefills start/end time when creating a new event (e.g. from a grid time-range selection). */
  prefill?: { startTime: string; endTime: string } | null;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAddressQuery("");
    setAddressResults([]);
    setNewLocationName("");
    setNewLocationCoords(null);
    setDraft(
      event
        ? {
            title: event.title,
            startTime: event.startTime ?? "",
            endTime: event.endTime ?? "",
            notes: event.notes ?? "",
            category: event.category ?? "",
            locationId: event.locationId ?? "",
          }
        : prefill
          ? { ...EMPTY_DRAFT, startTime: prefill.startTime, endTime: prefill.endTime }
          : EMPTY_DRAFT
    );
  }, [open, event, prefill]);

  const isPoolItem = date === null;

  const isEditing = Boolean(event);

  async function handleSearchAddress() {
    if (!addressQuery.trim()) return;
    setIsSearching(true);
    setAddressResults([]);
    try {
      setAddressResults(await searchAddress(addressQuery));
    } finally {
      setIsSearching(false);
    }
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        let locationId: string | null = draft.locationId || null;

        if (draft.locationId === NEW_LOCATION) {
          if (!newLocationName.trim() || !newLocationCoords) {
            setError("Search for an address and pick a result first");
            return;
          }
          const created = await createLocation(calendarId, {
            name: newLocationName,
            lat: newLocationCoords.lat,
            lng: newLocationCoords.lng,
          });
          locationId = created.id;
        }

        const payload = {
          title: draft.title,
          startTime: isPoolItem ? undefined : draft.startTime,
          endTime: isPoolItem ? undefined : draft.endTime,
          notes: draft.notes,
          category: draft.category || null,
          locationId,
        };

        if (event) {
          await updateEvent(event.id, payload);
        } else {
          await createEvent(calendarId, { ...payload, date });
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

          {isPoolItem ? (
            <p className="text-xs text-neutral-400">
              This is an unscheduled idea — drag it onto a day to give it a date and time.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-start">Starts</Label>
                <Input
                  id="event-start"
                  type="time"
                  value={draft.startTime}
                  disabled={!canEdit}
                  onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
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
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-category">Tag</Label>
            <select
              id="event-category"
              value={draft.category}
              disabled={!canEdit}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as EventCategory | "" }))}
              className="h-9 rounded-md border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-800"
            >
              <option value="">No tag</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-location">Location</Label>
            <select
              id="event-location"
              value={draft.locationId}
              disabled={!canEdit}
              onChange={(e) => setDraft((d) => ({ ...d, locationId: e.target.value }))}
              className="h-9 rounded-md border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-800"
            >
              <option value="">No location</option>
              {locationOptions.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
              {canEdit && <option value={NEW_LOCATION}>+ New location…</option>}
            </select>
          </div>

          {draft.locationId === NEW_LOCATION && canEdit && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchAddress();
                    }
                  }}
                  placeholder="123 Main St, City"
                />
                <Button type="button" variant="outline" onClick={handleSearchAddress} disabled={isSearching}>
                  {isSearching ? "Searching…" : "Search"}
                </Button>
              </div>

              {addressResults.length > 0 && (
                <ul className="flex flex-col divide-y divide-neutral-100 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {addressResults.map((result, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          setNewLocationCoords({ lat: result.lat, lng: result.lng });
                          setNewLocationName(result.label);
                          setAddressResults([]);
                          setAddressQuery(result.label);
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
                      >
                        {result.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {newLocationCoords && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-location-name">Pin name</Label>
                  <Input
                    id="new-location-name"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Name for this pin"
                  />
                </div>
              )}
            </div>
          )}

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
