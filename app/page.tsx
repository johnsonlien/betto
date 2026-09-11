import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">Betto</h1>
      <p className="text-neutral-500">Better Together — plan trips as a group.</p>
      <Button render={<a href="/calendars/new" />}>Start a calendar</Button>
    </main>
  );
}
