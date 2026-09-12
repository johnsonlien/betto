"use server";

import { prisma } from "@/lib/prisma";
import { getCalendarAccess, canEdit } from "@/lib/permissions";
import { parseDateOnly, combineDateAndTime, formatDateOnly } from "@/lib/dates";
import { moveEventCore } from "@/lib/calendar/move-event";

async function requireEditAccess(calendarId: string) {
  const access = await getCalendarAccess(calendarId);
  if (!canEdit(access)) throw new Error("You don't have permission to edit this calendar");
  return access;
}

async function nextPosition(calendarId: string, date: Date) {
  const last = await prisma.event.findFirst({
    where: { calendarId, date },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return (last?.position ?? -1) + 1;
}

export async function createEvent(
  calendarId: string,
  input: { title: string; date: string; startTime?: string; endTime?: string; notes?: string }
) {
  await requireEditAccess(calendarId);

  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  const date = parseDateOnly(input.date);
  const position = await nextPosition(calendarId, date);

  await prisma.event.create({
    data: {
      calendarId,
      title,
      date,
      position,
      notes: input.notes?.trim() || null,
      startTime: input.startTime ? combineDateAndTime(input.date, input.startTime) : null,
      endTime: input.endTime ? combineDateAndTime(input.date, input.endTime) : null,
    },
  });
}

export async function updateEvent(
  eventId: string,
  input: { title: string; startTime?: string; endTime?: string; notes?: string }
) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireEditAccess(event.calendarId);

  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  const dateStr = formatDateOnly(event.date);

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      notes: input.notes?.trim() || null,
      startTime: input.startTime ? combineDateAndTime(dateStr, input.startTime) : null,
      endTime: input.endTime ? combineDateAndTime(dateStr, input.endTime) : null,
    },
  });
}

export async function deleteEvent(eventId: string) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireEditAccess(event.calendarId);
  await prisma.event.delete({ where: { id: eventId } });
}

/**
 * Moves an event to (possibly) a new day and index, renumbering position for
 * every affected day so ordering stays a dense 0..n-1 sequence.
 */
export async function moveEvent(eventId: string, toDateStr: string, toIndex: number) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireEditAccess(event.calendarId);

  await prisma.$transaction((tx) => moveEventCore(tx, event, toDateStr, toIndex));
}
