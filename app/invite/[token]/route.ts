import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { viewCookieName } from "@/lib/permissions";

const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const to = (path: string) => new URL(path, req.url);

  const invite = await prisma.calendarInvite.findUnique({ where: { token } });

  if (!invite) {
    return NextResponse.redirect(to("/invite-status?state=not-found"));
  }
  if (invite.status === "REVOKED") {
    return NextResponse.redirect(to("/invite-status?state=revoked"));
  }
  if (invite.status !== "ACCEPTED" && invite.expiresAt < new Date()) {
    return NextResponse.redirect(to("/invite-status?state=expired"));
  }

  if (invite.role === "VIEWER") {
    if (invite.status === "PENDING") {
      await prisma.calendarInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    }
    const res = NextResponse.redirect(to(`/calendars/${invite.calendarId}`));
    res.cookies.set(viewCookieName(invite.calendarId), invite.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VIEW_COOKIE_MAX_AGE,
    });
    return res;
  }

  // EDITOR invite — requires an account matching the invited email.
  const session = await auth();
  if (!session?.user) {
    const callbackUrl = to(`/invite/${token}`).toString();
    return NextResponse.redirect(to(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`));
  }

  if (session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.redirect(
      to(`/invite-status?state=mismatch&expected=${encodeURIComponent(invite.email)}`)
    );
  }

  await prisma.calendarCollaborator.upsert({
    where: { calendarId_userId: { calendarId: invite.calendarId, userId: session.user.id } },
    update: { role: "EDITOR" },
    create: { calendarId: invite.calendarId, userId: session.user.id, role: "EDITOR" },
  });

  if (invite.status === "PENDING") {
    await prisma.calendarInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
  }

  return NextResponse.redirect(to(`/calendars/${invite.calendarId}`));
}
