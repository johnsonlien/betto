import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCalendarAccess, canEdit as canEditAccess, isOwner as isOwnerAccess } from "@/lib/permissions";
import { formatDateOnly, formatTimeInputValue, addDays, formatDayLabel, startOfWeek } from "@/lib/dates";
import { appUrl } from "@/lib/url";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { resolveCategoryColors } from "@/components/calendar/category";
import { ShareDialog, type SharePendingInvite } from "@/components/calendar/share-dialog";
import type { DayColumnData, EventCategory, EventItem, MapLocation } from "@/components/calendar/types";

const dateRangeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function toEventItem(event: {
  id: string;
  title: string;
  notes: string | null;
  startTime: Date | null;
  endTime: Date | null;
  category: EventItem["category"];
  locationId: string | null;
  location: { name: string; city: string | null } | null;
  cost: { toString(): string } | null;
  reservationUrl: string | null;
}): EventItem {
  return {
    id: event.id,
    title: event.title,
    notes: event.notes,
    startTime: event.startTime ? formatTimeInputValue(event.startTime) : null,
    endTime: event.endTime ? formatTimeInputValue(event.endTime) : null,
    category: event.category,
    locationId: event.locationId,
    locationName: event.location?.name ?? null,
    city: event.location?.city ?? null,
    cost: event.cost?.toString() ?? null,
    reservationUrl: event.reservationUrl,
  };
}

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

  const owningUser = isOwnerAccess(access);

  const [events, poolEventRows, locations, owner, collaborators, pendingInvites, shareLinks] = await Promise.all([
    prisma.event.findMany({
      where: { calendarId, date: { gte: calendar.startDate, lte: calendar.endDate } },
      orderBy: [{ date: "asc" }, { position: "asc" }],
      include: { location: { select: { name: true, city: true } } },
    }),
    prisma.event.findMany({
      where: { calendarId, date: null },
      orderBy: { position: "asc" },
      include: { location: { select: { name: true, city: true } } },
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
    owningUser
      ? prisma.calendarInvite.findMany({ where: { calendarId, status: "PENDING" }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    owningUser
      ? prisma.calendarShareLink.findMany({ where: { calendarId, revokedAt: null } })
      : Promise.resolve([]),
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
    if (!event.date) continue;
    const key = formatDateOnly(event.date);
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(toEventItem(event));
  }

  const poolEvents = poolEventRows.map(toEventItem);

  const locationOptions = locations.map((loc) => ({ id: loc.id, name: loc.name }));
  const mapLocations: MapLocation[] = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    lat: loc.lat,
    lng: loc.lng,
    eventDates: loc.events.filter((e) => e.date).map((e) => formatDateOnly(e.date!)),
  }));

  const people = owner ? [owner, ...collaborators.map((c) => c.user)] : collaborators.map((c) => c.user);

  const sharePeople = [
    ...(owner ? [{ id: owner.id, role: "OWNER" as const, name: owner.name, email: owner.email }] : []),
    ...collaborators.map((c) => ({ id: c.user.id, role: c.role, name: c.user.name, email: c.user.email })),
  ];
  const sharePendingInvites: SharePendingInvite[] = pendingInvites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role as "EDITOR" | "VIEWER",
  }));
  const shareLinkByRole = Object.fromEntries(shareLinks.map((link) => [link.role, link]));
  const toLinkInfo = (link?: { id: string; token: string }) =>
    link ? { id: link.id, url: appUrl(`/join/${link.token}`) } : null;

  return (
    <main className="mx-auto flex max-w-none flex-col gap-6 px-6 py-10">
      <CalendarBoard
        calendarId={calendarId}
        days={days}
        eventsByDate={eventsByDate}
        canEdit={canEditAccess(access)}
        dayHrefBase={`/calendars/${calendarId}/day`}
        locationOptions={locationOptions}
        mapLocations={mapLocations}
        poolEvents={poolEvents}
        categoryColors={resolveCategoryColors(calendar.categoryColors as Partial<Record<EventCategory, string>> | null)}
        header={{
          backHref: "/",
          calendarTitle: calendar.title,
          dateRangeLabel: `${dateRangeFormatter.format(calendar.startDate)} – ${dateRangeFormatter.format(calendar.endDate)}`,
          people,
          shareDialog: (
            <ShareDialog
              calendarId={calendarId}
              isOwner={owningUser}
              people={sharePeople}
              pendingInvites={sharePendingInvites}
              viewLink={toLinkInfo(shareLinkByRole.VIEWER)}
              editLink={toLinkInfo(shareLinkByRole.EDITOR)}
            />
          ),
        }}
      />
    </main>
  );
}
