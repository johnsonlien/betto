import type { Prisma } from "@prisma/client";
import { parseDateOnly, formatDateOnly } from "@/lib/dates";

type TxClient = Prisma.TransactionClient;

/**
 * Moves an event to (possibly) a new day and index, renumbering position for
 * every affected day so ordering stays a dense 0..n-1 sequence. Pure DB logic,
 * no auth check — callers must verify edit access first.
 */
export async function moveEventCore(
  tx: TxClient,
  event: { id: string; calendarId: string; date: Date },
  toDateStr: string,
  toIndex: number
) {
  const toDate = parseDateOnly(toDateStr);
  const fromDateStr = formatDateOnly(event.date);
  const sameDay = fromDateStr === toDateStr;

  if (sameDay) {
    const dayEvents = await tx.event.findMany({
      where: { calendarId: event.calendarId, date: event.date },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    const ids = dayEvents.map((e) => e.id).filter((id) => id !== event.id);
    ids.splice(toIndex, 0, event.id);
    await Promise.all(ids.map((id, index) => tx.event.update({ where: { id }, data: { position: index } })));
    return;
  }

  const oldDayEvents = await tx.event.findMany({
    where: { calendarId: event.calendarId, date: event.date, id: { not: event.id } },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await Promise.all(
    oldDayEvents.map((e, index) => tx.event.update({ where: { id: e.id }, data: { position: index } }))
  );

  const newDayEvents = await tx.event.findMany({
    where: { calendarId: event.calendarId, date: toDate },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const ids = newDayEvents.map((e) => e.id);
  ids.splice(toIndex, 0, event.id);
  await Promise.all(
    ids.map((id, index) =>
      tx.event.update({
        where: { id },
        data: id === event.id ? { position: index, date: toDate } : { position: index },
      })
    )
  );
}
