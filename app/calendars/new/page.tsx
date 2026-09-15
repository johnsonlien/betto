import Link from "next/link";
import { auth } from "@/auth";
import { createCalendar } from "@/lib/actions/calendars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function NewCalendarPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-medium">Sign in to start a calendar</h1>
        <Button
          nativeButton={false}
          render={<a href={`/api/auth/signin?callbackUrl=${encodeURIComponent("/calendars/new")}`} />}
        >
          Sign in
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-1">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
          &larr; Your calendars
        </Link>
        <h1 className="text-2xl font-medium text-neutral-900 dark:text-neutral-100">Start a calendar</h1>
      </div>
      <form action={createCalendar} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="Portugal trip" required />
        </div>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="startDate">Starts</Label>
            <Input id="startDate" name="startDate" type="date" required />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="endDate">Ends</Label>
            <Input id="endDate" name="endDate" type="date" required />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit">Create calendar</Button>
          <Button variant="outline" nativeButton={false} render={<a href="/" />}>
            Cancel
          </Button>
        </div>
      </form>
    </main>
  );
}
