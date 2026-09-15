"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateCategoryColors } from "@/lib/actions/calendars";
import { CATEGORY_COLOR_PALETTE, CATEGORY_LABELS, CATEGORY_OPTIONS } from "./category";
import type { EventCategory } from "./types";

/** Settings dialog for customizing which color represents each event tag — shared across everyone viewing the calendar. */
export function CategoryColorsDialog({
  calendarId,
  colors,
  onSaved,
}: {
  calendarId: string;
  colors: Record<EventCategory, string>;
  /** Called after a successful save so the caller can refresh server data. */
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<EventCategory, string>>(colors);
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setDraft(colors);
    setOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      await updateCategoryColors(calendarId, draft);
      setOpen(false);
      onSaved();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openDialog}>
        Tag colors
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tag colors</DialogTitle>
          </DialogHeader>

          <p className="text-xs text-neutral-500">
            Choose a color for each tag — shared with everyone viewing this calendar.
          </p>

          <div className="flex flex-col gap-3">
            {CATEGORY_OPTIONS.map((category) => (
              <div key={category} className="flex items-center justify-between gap-3">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">{CATEGORY_LABELS[category]}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CATEGORY_COLOR_PALETTE.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, [category]: swatch }))}
                      aria-label={swatch}
                      className={`h-5 w-5 shrink-0 rounded-full ring-offset-2 ring-offset-white transition-shadow dark:ring-offset-neutral-950 ${
                        draft[category] === swatch ? "ring-2 ring-neutral-900 dark:ring-neutral-100" : ""
                      }`}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
