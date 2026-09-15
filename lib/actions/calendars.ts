"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireEditAccess } from "@/lib/actions/require-edit-access";
import { CATEGORY_OPTIONS, DEFAULT_CATEGORY_COLORS } from "@/components/calendar/category";
import type { EventCategory } from "@/components/calendar/types";

export async function createCalendar(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Must be signed in to create a calendar");

  const title = String(formData.get("title") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!title) throw new Error("Title is required");
  if (!startDate || !endDate) throw new Error("Start and end dates are required");

  const calendar = await prisma.calendar.create({
    data: {
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ownerId: session.user.id,
    },
  });

  redirect(`/calendars/${calendar.id}/board`);
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Updates the calendar's per-tag color overrides. Passing null for a category resets it to the built-in default. */
export async function updateCategoryColors(calendarId: string, colors: Partial<Record<EventCategory, string | null>>) {
  await requireEditAccess(calendarId);

  const calendar = await prisma.calendar.findUniqueOrThrow({ where: { id: calendarId } });
  const current = (calendar.categoryColors as Partial<Record<EventCategory, string>> | null) ?? {};
  const next: Partial<Record<EventCategory, string>> = { ...current };

  for (const category of CATEGORY_OPTIONS) {
    if (!(category in colors)) continue;
    const value = colors[category];
    if (value === null || value === DEFAULT_CATEGORY_COLORS[category]) {
      delete next[category];
    } else if (HEX_COLOR.test(value ?? "")) {
      next[category] = value!;
    } else {
      throw new Error(`Invalid color for ${category}`);
    }
  }

  await prisma.calendar.update({ where: { id: calendarId }, data: { categoryColors: next } });
  revalidatePath(`/calendars/${calendarId}/board`);
}
