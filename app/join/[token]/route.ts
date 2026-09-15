import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { viewCookieName } from "@/lib/permissions";

const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const to = (path: string) => new URL(path, req.url);

  const link = await prisma.calendarShareLink.findUnique({ where: { token } });

  if (!link || link.revokedAt) {
    return NextResponse.redirect(to("/invite-status?state=invalid-link"));
  }

  if (link.role === "VIEWER") {
    const res = NextResponse.redirect(to(`/calendars/${link.calendarId}/board`));
    res.cookies.set(viewCookieName(link.calendarId), link.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VIEW_COOKIE_MAX_AGE,
    });
    return res;
  }

  // EDITOR share link — anyone who signs in (or creates an account) may join.
  const session = await auth();
  if (!session?.user) {
    const callbackUrl = to(`/join/${token}`).toString();
    return NextResponse.redirect(to(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`));
  }

  await prisma.calendarCollaborator.upsert({
    where: { calendarId_userId: { calendarId: link.calendarId, userId: session.user.id } },
    update: { role: "EDITOR" },
    create: { calendarId: link.calendarId, userId: session.user.id, role: "EDITOR" },
  });

  return NextResponse.redirect(to(`/calendars/${link.calendarId}/board`));
}
