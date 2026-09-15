"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyLinkButton } from "@/components/copy-link-button";
import { RoleBadge } from "@/components/role-badge";
import { createCalendarInvite, revokeCalendarInvite } from "@/lib/actions/invites";
import { regenerateShareLink, revokeShareLink } from "@/lib/actions/share-links";
import type { CalendarRole } from "@/lib/permissions";

export type SharePerson = { id: string; role: CalendarRole; name: string | null; email: string | null };
export type SharePendingInvite = { id: string; email: string; role: "EDITOR" | "VIEWER" };
export type ShareLinkInfo = { id: string; url: string } | null;

const LINK_ROLES: { role: "VIEWER" | "EDITOR"; label: string }[] = [
  { role: "VIEWER", label: "View link" },
  { role: "EDITOR", label: "Edit link" },
];

/**
 * Person-icon trigger showing who has access to the calendar and their
 * roles. Owners additionally get invite-by-email and share-link controls
 * (server actions enforce the owner check independently — this UI gating is
 * just so non-owners aren't shown controls that would fail).
 */
export function ShareDialog({
  calendarId,
  isOwner,
  people,
  pendingInvites,
  viewLink,
  editLink,
}: {
  calendarId: string;
  isOwner: boolean;
  people: SharePerson[];
  pendingInvites: SharePendingInvite[];
  viewLink: ShareLinkInfo;
  editLink: ShareLinkInfo;
}) {
  const [open, setOpen] = useState(false);
  const linkByRole: Record<"VIEWER" | "EDITOR", ShareLinkInfo> = { VIEWER: viewLink, EDITOR: editLink };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Users className="size-3.5" />
        People{people.length > 0 ? ` (${people.length})` : ""}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>People &amp; sharing</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto">
            <section className="flex flex-col gap-2">
              <ul className="flex flex-col gap-2">
                {people.map((person) => (
                  <li key={person.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-neutral-900 dark:text-neutral-100">
                      {person.name ?? person.email}
                    </span>
                    <RoleBadge role={person.role} />
                  </li>
                ))}
              </ul>

              {isOwner && pendingInvites.length > 0 && (
                <ul className="flex flex-col gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
                  {pendingInvites.map((invite) => (
                    <li key={invite.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-neutral-500">
                        {invite.email} <span className="text-neutral-400">— invited</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <RoleBadge role={invite.role} />
                        <form action={revokeCalendarInvite.bind(null, invite.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            Cancel
                          </Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {isOwner ? (
              <>
                <form
                  action={createCalendarInvite.bind(null, calendarId)}
                  className="flex items-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800"
                >
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="share-invite-email">Invite by email</Label>
                    <Input
                      id="share-invite-email"
                      name="email"
                      type="email"
                      placeholder="friend@example.com"
                      required
                    />
                  </div>
                  <select
                    name="role"
                    defaultValue="VIEWER"
                    className="h-9 rounded-md border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-800"
                  >
                    <option value="VIEWER">Can view</option>
                    <option value="EDITOR">Can edit</option>
                  </select>
                  <Button type="submit">Send</Button>
                </form>

                <section className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Share links</h3>
                    <p className="text-xs text-neutral-500">
                      A view link needs no account. An edit link requires signing in first.
                    </p>
                  </div>

                  {LINK_ROLES.map(({ role, label }) => {
                    const link = linkByRole[role];
                    return (
                      <div
                        key={role}
                        className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-800"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
                          {link ? (
                            <code className="truncate text-xs text-neutral-500">{link.url}</code>
                          ) : (
                            <span className="text-xs text-neutral-400">No active link</span>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {link && <CopyLinkButton value={link.url} />}
                          <form action={regenerateShareLink.bind(null, calendarId, role)}>
                            <Button type="submit" variant="outline" size="sm">
                              {link ? "Replace" : "Create"}
                            </Button>
                          </form>
                          {link && (
                            <form action={revokeShareLink.bind(null, link.id)}>
                              <Button type="submit" variant="ghost" size="sm">
                                Turn off
                              </Button>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              </>
            ) : (
              <p className="border-t border-neutral-200 pt-4 text-xs text-neutral-400 dark:border-neutral-800">
                Only the owner can invite people or manage share links.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
