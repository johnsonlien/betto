import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CalendarRole = "OWNER" | "EDITOR" | "VIEWER";

export type CalendarAccess = {
  role: CalendarRole | null;
  userId: string | null;
  /** true when access came from an anonymous view link/invite, not an account */
  viaLink: boolean;
};

export function viewCookieName(calendarId: string) {
  return `betto_view_${calendarId}`;
}

export async function getCalendarAccess(calendarId: string): Promise<CalendarAccess> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (userId) {
    const calendar = await prisma.calendar.findUnique({
      where: { id: calendarId },
      select: { ownerId: true },
    });

    if (calendar?.ownerId === userId) {
      return { role: "OWNER", userId, viaLink: false };
    }

    const collaborator = await prisma.calendarCollaborator.findUnique({
      where: { calendarId_userId: { calendarId, userId } },
    });

    if (collaborator) {
      return { role: collaborator.role, userId, viaLink: false };
    }
  }

  const cookieStore = await cookies();
  const viewToken = cookieStore.get(viewCookieName(calendarId))?.value;

  if (viewToken) {
    const activeShareLink = await prisma.calendarShareLink.findFirst({
      where: { calendarId, token: viewToken, role: "VIEWER", revokedAt: null },
      select: { id: true },
    });

    if (activeShareLink) {
      return { role: "VIEWER", userId, viaLink: true };
    }

    const acceptedInvite = await prisma.calendarInvite.findFirst({
      where: { calendarId, token: viewToken, role: "VIEWER", status: "ACCEPTED" },
      select: { id: true },
    });

    if (acceptedInvite) {
      return { role: "VIEWER", userId, viaLink: true };
    }
  }

  return { role: null, userId, viaLink: false };
}

export function canEdit(access: CalendarAccess) {
  return access.role === "OWNER" || access.role === "EDITOR";
}

export function isOwner(access: CalendarAccess) {
  return access.role === "OWNER";
}
