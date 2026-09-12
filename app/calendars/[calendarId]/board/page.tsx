import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCalendarAccess, canEdit as canEditAccess } from "@/lib/permissions";
import { formatDateOnly, formatTimeInputValue, addDays, formatDayLabel, startOfWeek } from "@/lib/dates";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { CollaboratorAvatars } from "@/components/collaborator-avatars";
import type { DayColumnData, EventItem, MapLocation } from "@/components/calendar/types";

const dateRangeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function CalendarBoardPage({
  params,
}: {
  params: Promise<{ calendarId: string }>;
}) {
  const { calendarId } = await params;

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

  const [events, locations, owner, collaborators] = await Promise.all([
    prisma.event.findMany({
      where: { calendarId, date: { gte: calendar.startDate, lte: calendar.endDate } },
      orderBy: [{ date: "asc" }, { position: "asc" }],
      include: { location: { select: { name: true } } },
    }),
    prisma.location.findMany({
      where: { calendarId },
      include: { events: { select: { date: true } } },
    }),
    prisma.user.findUnique({ where: { id: calendar.ownerId }, select: { id: true, name: true, email: true } }),
    prisma.calendarCollaborator.findMany({
      where: { calendarId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  // Align to full Sunday–Saturday weeks so each row is a real calendar week,
  // padding with (non-interactive, muted) days outside the trip's own range.
  const gridStart = startOfWeek(calendar.startDate);
  const gridEnd = addDays(startOfWeek(calendar.endDate), 6);
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  const days: DayColumnData[] = Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(gridStart, i);
    return {
      date: formatDateOnly(date),
      label: formatDayLabel(date),
      inRange: date >= calendar.startDate && date <= calendar.endDate,
    };
  });

  const eventsByDate: Record<string, EventItem[]> = Object.fromEntries(days.map((d) => [d.date, []]));
  for (const event of events) {
    const key = formatDateOnly(event.date);
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push({
      id: event.id,
      title: event.title,
      notes: event.notes,
      startTime: event.startTime ? formatTimeInputValue(event.startTime) : null,
      endTime: event.endTime ? formatTimeInputValue(event.endTime) : null,
      category: event.category,
      locationId: event.locationId,
      locationName: event.location?.name ?? null,
    });
  }

  const locationOptions = locations.map((loc) => ({ id: loc.id, name: loc.name }));
  const mapLocations: MapLocation[] = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    lat: loc.lat,
    lng: loc.lng,
    eventDates: loc.events.map((e) => formatDateOnly(e.date)),
  }));

  const people = owner ? [owner, ...collaborators.map((c) => c.user)] : collaborators.map((c) => c.user);

  return (
    <main className="mx-auto flex max-w-none flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            href={`/calendars/${calendarId}`}
            className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            &larr; {calendar.title}
          </Link>
          <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
            {dateRangeFormatter.format(calendar.startDate)} – {dateRangeFormatter.format(calendar.endDate)}
          </h1>
        </div>
        <CollaboratorAvatars people={people} />
      </header>

      <CalendarBoard
        calendarId={calendarId}
        days={days}
        eventsByDate={eventsByDate}
        canEdit={canEditAccess(access)}
        dayHrefBase={`/calendars/${calendarId}/day`}
        locationOptions={locationOptions}
        mapLocations={mapLocations}
      />
    </main>
  );
}
