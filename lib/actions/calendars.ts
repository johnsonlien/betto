"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  redirect(`/calendars/${calendar.id}`);
}
