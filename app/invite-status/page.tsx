const MESSAGES: Record<string, { title: string; description: string }> = {
  "not-found": {
    title: "This invite doesn't exist",
    description: "Double-check the link, or ask the calendar owner to send a new one.",
  },
  revoked: {
    title: "This invite was revoked",
    description: "The calendar owner turned off this invite. Ask them to send a new one.",
  },
  expired: {
    title: "This invite expired",
    description: "Invites last 7 days. Ask the calendar owner to send a new one.",
  },
  mismatch: {
    title: "Wrong account",
    description: "This invite was sent to a different email address. Sign in with that address instead.",
  },
  "invalid-link": {
    title: "This link doesn't work",
    description: "It may have been turned off. Ask the calendar owner for a current link.",
  },
};

export default async function InviteStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; expected?: string }>;
}) {
  const { state, expected } = await searchParams;
  const message = (state ? MESSAGES[state] : undefined) ?? {
    title: "Something went wrong",
    description: "Try the link again, or ask for a new one.",
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">{message.title}</h1>
      <p className="max-w-sm text-sm text-neutral-500">
        {message.description} {state === "mismatch" && expected ? `(${expected})` : null}
      </p>
    </main>
  );
}
