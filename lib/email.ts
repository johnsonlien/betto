import { Resend } from "resend";

const resend = process.env.AUTH_RESEND_KEY ? new Resend(process.env.AUTH_RESEND_KEY) : null;
const from = process.env.AUTH_EMAIL_FROM ?? "Betto <onboarding@resend.dev>";

export async function sendCalendarInviteEmail({
  to,
  calendarTitle,
  role,
  inviteUrl,
  invitedByName,
}: {
  to: string;
  calendarTitle: string;
  role: "EDITOR" | "VIEWER";
  inviteUrl: string;
  invitedByName: string | null;
}) {
  const inviter = invitedByName ?? "Someone";
  const action = role === "EDITOR" ? "edit" : "view";
  const subject = `${inviter} invited you to ${action} "${calendarTitle}" on Betto`;
  const html = `
    <p>${inviter} invited you to ${action} the calendar <strong>${calendarTitle}</strong> on Betto.</p>
    <p><a href="${inviteUrl}">Open the invite</a></p>
    ${role === "EDITOR" ? "<p>You'll need to sign in with this email address to accept.</p>" : ""}
  `;

  if (!resend) {
    console.log(`[betto] Resend not configured — invite email for ${to}:\n${inviteUrl}`);
    return;
  }

  await resend.emails.send({ from, to, subject, html });
}
