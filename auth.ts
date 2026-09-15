import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const { handlers, auth: authWithSession, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  // Self-hosted (not Vercel): without this, Auth.js rejects requests whose
  // Host header isn't its one expected origin — e.g. reaching the app via
  // its LAN IP from another machine instead of localhost.
  trustHost: true,
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM,
      // No Resend key configured yet — log the sign-in link instead of
      // emailing it, so magic-link sign-in is still testable end to end.
      ...(!process.env.AUTH_RESEND_KEY && {
        sendVerificationRequest({ identifier, url }) {
          console.log(`\n[betto] Sign-in link for ${identifier}:\n${url}\n`);
        },
      }),
    }),
  ],
  pages: {
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

// Dev-only auth bypass: never runs when NODE_ENV is "production". Every
// server-side auth() call resolves to a fixed dev user instead of requiring
// a real sign-in, so `npm run dev` never needs the magic-link flow. Override
// which user by setting DEV_USER_EMAIL.
const DEV_BYPASS = process.env.NODE_ENV !== "production";

if (DEV_BYPASS) {
  console.warn(
    `[betto] Auth bypass active (NODE_ENV=${process.env.NODE_ENV}) — every request is auto-signed-in as ${
      process.env.DEV_USER_EMAIL || "dev@localhost"
    }. This must never happen in production.`
  );
}

async function getDevSession() {
  const email = process.env.DEV_USER_EMAIL || "dev@localhost";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Dev User", emailVerified: new Date() },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, image: user.image },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// auth() is called multiple times per request (e.g. once in a server action,
// again when the page re-renders after it) and the dev bypass otherwise
// upserts the dev user on every single one of those calls — memoize the
// promise for the life of the dev server process instead of hitting the DB
// each time. Storing the in-flight promise (not just the resolved value)
// also collapses concurrent calls onto a single upsert.
let devSessionPromise: ReturnType<typeof getDevSession> | null = null;

export async function auth() {
  if (DEV_BYPASS) {
    if (!devSessionPromise) devSessionPromise = getDevSession();
    return devSessionPromise;
  }
  return authWithSession();
}

export { handlers, signIn, signOut };
