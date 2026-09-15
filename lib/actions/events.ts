"use server";

import type { EventCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDateOnly, combineDateAndTime, formatDateOnly } from "@/lib/dates";
import { moveEventCore } from "@/lib/calendar/move-event";
import { requireEditAccess } from "@/lib/actions/require-edit-access";

async function nextPosition(calendarId: string, date: Date | null) {
  const last = await prisma.event.findFirst({
    where: { calendarId, date },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return (last?.position ?? -1) + 1;
}

type EventInput = {
  title: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  category?: EventCategory | null;
  locationId?: string | null;
};

/** date omitted/null creates an unscheduled "idea pool" event — never timed. */
export async function createEvent(calendarId: string, input: EventInput & { date?: string | null }) {
  await requireEditAccess(calendarId);

  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  const date = input.date ? parseDateOnly(input.date) : null;
  const position = await nextPosition(calendarId, date);

  const created = await prisma.event.create({
    data: {
      calendarId,
      title,
      date,
      position,
      notes: input.notes?.trim() || null,
      startTime: date && input.startTime ? combineDateAndTime(input.date!, input.startTime) : null,
      endTime: date && input.endTime ? combineDateAndTime(input.date!, input.endTime) : null,
      category: input.category || null,
      locationId: input.locationId || null,
    },
    select: { id: true },
  });

  return created;
}

export async function updateEvent(eventId: string, input: EventInput) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireEditAccess(event.calendarId);

  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  // Pool events (no date) never carry a time — a time without a day is meaningless.
  const dateStr = event.date ? formatDateOnly(event.date) : null;

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      notes: input.notes?.trim() || null,
      startTime: dateStr && input.startTime ? combineDateAndTime(dateStr, input.startTime) : null,
      endTime: dateStr && input.endTime ? combineDateAndTime(dateStr, input.endTime) : null,
      category: input.category || null,
      locationId: input.locationId || null,
    },
  });
}

export async function deleteEvent(eventId: string) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireEditAccess(event.calendarId);
  await prisma.event.delete({ where: { id: eventId } });
}

/**
 * Moves an event to (possibly) a new day and index within the all-day list,
 * renumbering position for every affected day so ordering stays a dense
 * 0..n-1 sequence. Pass clearTime when dragging a timed event into the
 * all-day zone.
 */
export async function moveEvent(eventId: string, toDateStr: string, toIndex: number, clearTime = false) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireEditAccess(event.calendarId);

  await prisma.$transaction(async (tx) => {
    await moveEventCore(tx, event, toDateStr, toIndex);
    if (clearTime) {
      await tx.event.update({ where: { id: eventId }, data: { startTime: null, endTime: null } });
    }
  });
}

/**
 * Moves an event back into the unscheduled idea pool: clears its date and
 * any time, inserting it at toIndex within the pool's own position sequence
 * (default: the end). Written separately from moveEventCore since that
 * assumes a real destination date to parse; the pool's destination is null.
 */
export async function moveToPool(eventId: string, toIndex?: number) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireEditAccess(event.calendarId);

  await prisma.$transaction(async (tx) => {
    const oldSiblings = await tx.event.findMany({
      where: { calendarId: event.calendarId, date: event.date, id: { not: eventId } },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await Promise.all(oldSiblings.map((e, i) => tx.event.update({ where: { id: e.id }, data: { position: i } })));

    const poolEvents = await tx.event.findMany({
      where: { calendarId: event.calendarId, date: null },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    const ids = poolEvents.map((e) => e.id).filter((id) => id !== eventId);
    const insertAt = toIndex === undefined ? ids.length : Math.max(0, Math.min(ids.length, toIndex));
    ids.splice(insertAt, 0, eventId);
    await Promise.all(
      ids.map((id, i) =>
        tx.event.update({
          where: { id },
          data: id === eventId ? { position: i, date: null, startTime: null, endTime: null } : { position: i },
        })
      )
    );
  });
}

/**
 * Moves an event onto (possibly a different day's) timed grid at a specific
 * time, appending it at the end of that day's position sequence — position
 * doesn't drive display order for timed events, time does.
 */
export async function moveToGridSlot(eventId: string, toDateStr: string, startTime: string, endTime: string) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireEditAccess(event.calendarId);

  const toDate = parseDateOnly(toDateStr);
  const position = await nextPosition(event.calendarId, toDate);

  await prisma.event.update({
    where: { id: eventId },
    data: {
      date: toDate,
      position,
      startTime: combineDateAndTime(toDateStr, startTime),
      endTime: combineDateAndTime(toDateStr, endTime),
    },
  });
}
