import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCalendarAccess, isOwner } from "@/lib/permissions";
import { appUrl } from "@/lib/url";
import { createCalendarInvite, revokeCalendarInvite } from "@/lib/actions/invites";
import { regenerateShareLink, revokeShareLink } from "@/lib/actions/share-links";
import { RoleBadge } from "@/components/role-badge";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function CalendarPage({
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

  const owner = isOwner(access);

  const [collaborators, pendingInvites, shareLinks] = owner
    ? await Promise.all([
        prisma.calendarCollaborator.findMany({
          where: { calendarId },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.calendarInvite.findMany({
          where: { calendarId, status: "PENDING" },
          orderBy: { createdAt: "desc" },
        }),
        prisma.calendarShareLink.findMany({
          where: { calendarId, revokedAt: null },
        }),
      ])
    : [[], [], []];

  const shareLinkByRole = Object.fromEntries(shareLinks.map((link) => [link.role, link]));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-medium text-neutral-900 dark:text-neutral-100">{calendar.title}</h1>
          <RoleBadge role={access.role!} />
        </div>
        <p className="text-sm text-neutral-500">
          {dateFormatter.format(calendar.startDate)} – {dateFormatter.format(calendar.endDate)}
        </p>
        {access.viaLink && (
          <p className="text-sm text-neutral-400">You&apos;re viewing with a share link, not an account.</p>
        )}
        <div>
          <Button render={<a href={`/calendars/${calendarId}/board`} />}>Open calendar</Button>
        </div>
      </header>

      {owner && (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">People</h2>

          <ul className="flex flex-col gap-2">
            {collaborators.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span>{c.user.name ?? c.user.email}</span>
                <RoleBadge role={c.role} />
              </li>
            ))}
          </ul>

          {pendingInvites.length > 0 && (
            <ul className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              {pendingInvites.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">
                    {invite.email} <span className="text-neutral-400">— invited, not yet accepted</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={invite.role} />
                    <form action={revokeCalendarInvite.bind(null, invite.id)}>
                      <Button type="submit" variant="ghost" size="sm">
                        Cancel invite
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            action={createCalendarInvite.bind(null, calendarId)}
            className="flex items-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="email">Invite by email</Label>
              <Input id="email" name="email" type="email" placeholder="friend@example.com" required />
            </div>
            <select
              name="role"
              defaultValue="VIEWER"
              className="h-9 rounded-md border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-800"
            >
              <option value="VIEWER">Can view</option>
              <option value="EDITOR">Can edit</option>
            </select>
            <Button type="submit">Send invite</Button>
          </form>
        </section>
      )}

      {owner && (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">Share links</h2>
          <p className="-mt-2 text-sm text-neutral-500">
            Anyone with a view link can look at this calendar without an account. Anyone with an edit link
            needs to sign in first.
          </p>

          {(["VIEWER", "EDITOR"] as const).map((role) => {
            const link = shareLinkByRole[role];
            return (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {role === "VIEWER" ? "View link" : "Edit link"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  {link ? (
                    <>
                      <code className="truncate text-xs text-neutral-500">
                        {appUrl(`/join/${link.token}`)}
                      </code>
                      <div className="flex shrink-0 gap-2">
                        <CopyLinkButton value={appUrl(`/join/${link.token}`)} />
                        <form action={regenerateShareLink.bind(null, calendarId, role)}>
                          <Button type="submit" variant="outline" size="sm">
                            Replace
                          </Button>
                        </form>
                        <form action={revokeShareLink.bind(null, link.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            Turn off
                          </Button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-neutral-400">No active link</span>
                      <form action={regenerateShareLink.bind(null, calendarId, role)}>
                        <Button type="submit" variant="outline" size="sm">
                          Create link
                        </Button>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}
