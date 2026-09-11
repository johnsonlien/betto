"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCalendarAccess } from "@/lib/permissions";
import { sendCalendarInviteEmail } from "@/lib/email";
import { appUrl } from "@/lib/url";

const INVITE_TTL_DAYS = 7;

export async function createCalendarInvite(calendarId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Must be signed in");

  const access = await getCalendarAccess(calendarId);
  if (access.role !== "OWNER") throw new Error("Only the calendar owner can invite collaborators");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "VIEWER");
  if (!email) throw new Error("Email is required");
  if (role !== "EDITOR" && role !== "VIEWER") throw new Error("Invalid role");

  const calendar = await prisma.calendar.findUniqueOrThrow({ where: { id: calendarId } });
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invite = await prisma.calendarInvite.upsert({
    where: { calendarId_email: { calendarId, email } },
    update: { role, status: "PENDING", expiresAt, token: randomUUID(), invitedById: session.user.id },
    create: { calendarId, email, role, expiresAt, invitedById: session.user.id },
  });

  await sendCalendarInviteEmail({
    to: email,
    calendarTitle: calendar.title,
    role,
    inviteUrl: appUrl(`/invite/${invite.token}`),
    invitedByName: session.user.name ?? session.user.email ?? null,
  });

  revalidatePath(`/calendars/${calendarId}`);
}

export async function revokeCalendarInvite(inviteId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Must be signed in");

  const invite = await prisma.calendarInvite.findUniqueOrThrow({ where: { id: inviteId } });
  const access = await getCalendarAccess(invite.calendarId);
  if (access.role !== "OWNER") throw new Error("Only the calendar owner can revoke invites");

  await prisma.calendarInvite.update({ where: { id: inviteId }, data: { status: "REVOKED" } });
  revalidatePath(`/calendars/${invite.calendarId}`);
}
