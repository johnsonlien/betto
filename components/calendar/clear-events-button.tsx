"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Confirmation-gated trigger for removing every event on the calendar. The actual delete runs in the caller. */
export function ClearEventsButton({
  eventCount,
  onConfirm,
}: {
  eventCount: number;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (eventCount === 0) return null;

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setOpen(true)}>
        Clear all events
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove all events?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-500">
            This permanently deletes all {eventCount} event{eventCount === 1 ? "" : "s"} on this calendar —
            scheduled and idea-pool alike. This can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
