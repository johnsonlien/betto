import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/role-badge";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-semibold">Betto</h1>
        <p className="text-neutral-500">Better Together — plan trips as a group.</p>
        <Button nativeButton={false} render={<a href={`/api/auth/signin?callbackUrl=${encodeURIComponent("/")}`} />}>
          Sign in
        </Button>
      </main>
    );
  }

  const calendars = await prisma.calendar.findMany({
    where: {
      OR: [{ ownerId: session.user.id }, { collaborators: { some: { userId: session.user.id } } }],
    },
    include: { collaborators: { where: { userId: session.user.id } } },
    orderBy: { startDate: "asc" },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-neutral-900 dark:text-neutral-100">Your calendars</h1>
        <Button nativeButton={false} render={<a href="/calendars/new" />}>
          New calendar
        </Button>
      </header>

      {calendars.length === 0 ? (
        <p className="text-sm text-neutral-500">No calendars yet. Start one to plan your first trip together.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {calendars.map((calendar) => {
            const role = calendar.ownerId === session.user.id ? "OWNER" : calendar.collaborators[0]?.role ?? "VIEWER";
            return (
              <li key={calendar.id}>
                <Link
                  href={`/calendars/${calendar.id}/board`}
                  className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{calendar.title}</span>
                    <span className="text-neutral-500">
                      {dateFormatter.format(calendar.startDate)} – {dateFormatter.format(calendar.endDate)}
                    </span>
                  </div>
                  <RoleBadge role={role} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
