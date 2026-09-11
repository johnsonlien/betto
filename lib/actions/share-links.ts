"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCalendarAccess } from "@/lib/permissions";

export async function regenerateShareLink(calendarId: string, role: "EDITOR" | "VIEWER") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Must be signed in");

  const access = await getCalendarAccess(calendarId);
  if (access.role !== "OWNER") throw new Error("Only the calendar owner can manage share links");

  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    await tx.calendarShareLink.updateMany({
      where: { calendarId, role, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.calendarShareLink.create({
      data: { calendarId, role, token: randomUUID(), createdById: userId },
    });
  });

  revalidatePath(`/calendars/${calendarId}`);
}

export async function revokeShareLink(shareLinkId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Must be signed in");

  const link = await prisma.calendarShareLink.findUniqueOrThrow({ where: { id: shareLinkId } });
  const access = await getCalendarAccess(link.calendarId);
  if (access.role !== "OWNER") throw new Error("Only the calendar owner can revoke share links");

  await prisma.calendarShareLink.update({ where: { id: shareLinkId }, data: { revokedAt: new Date() } });
  revalidatePath(`/calendars/${link.calendarId}`);
}
