import { getCalendarAccess, canEdit } from "@/lib/permissions";

export async function requireEditAccess(calendarId: string) {
  const access = await getCalendarAccess(calendarId);
  if (!canEdit(access)) throw new Error("You don't have permission to edit this calendar");
  return access;
}
