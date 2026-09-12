import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCalendarAccess, canEdit as canEditAccess } from "@/lib/permissions";
import { parseDateOnly, formatDateOnly, formatTimeInputValue, addDays, formatFullDateLabel } from "@/lib/dates";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import type { DayColumnData, EventItem } from "@/components/calendar/types";

export default async function DayViewPage({
  params,
}: {
  params: Promise<{ calendarId: string; date: string }>;
}) {
  const { calendarId, date: dateStr } = await params;

  const calendar = await prisma.calendar.findUnique({ where: { id: calendarId } });
  if (!calendar) notFound();

  const access = await getCalendarAccess(calendarId);
  if (!access.role) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-xl font-medium">You don&apos;t have access to this calendar</h1>
        <p className="text-sm text-neutral-500">Ask the owner to send you an invite or a share link.</p>
      </main>
    );
  }

  const date = parseDateOnly(dateStr);

  const events = await prisma.event.findMany({
    where: { calendarId, date },
    orderBy: { position: "asc" },
  });

  const day: DayColumnData = {
    date: dateStr,
    label: formatFullDateLabel(date),
    inRange: date >= calendar.startDate && date <= calendar.endDate,
  };

  const eventsByDate: Record<string, EventItem[]> = {
    [dateStr]: events.map((event) => ({
      id: event.id,
      title: event.title,
      notes: event.notes,
      startTime: event.startTime ? formatTimeInputValue(event.startTime) : null,
      endTime: event.endTime ? formatTimeInputValue(event.endTime) : null,
    })),
  };

  const prevDay = formatDateOnly(addDays(date, -1));
  const nextDay = formatDateOnly(addDays(date, 1));

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href={`/calendars/${calendarId}/board`}
          className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          &larr; Back to calendar
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">{day.label}</h1>
          <nav className="flex items-center gap-3 text-sm">
            <Link href={`/calendars/${calendarId}/day/${prevDay}`} className="hover:underline">
              Previous
            </Link>
            <Link href={`/calendars/${calendarId}/day/${nextDay}`} className="hover:underline">
              Next
            </Link>
          </nav>
        </div>
      </header>

      <CalendarBoard calendarId={calendarId} days={[day]} eventsByDate={eventsByDate} canEdit={canEditAccess(access)} />
    </main>
  );
}
