"use client";

import { useEffect, useState } from "react";
import type { LinkPreviewData } from "@/lib/calendar/link-preview";
import { getLinkPreview } from "@/lib/actions/link-preview";

/** Shows a small OpenGraph image preview for a URL (e.g. one found in an event's notes, or its reservation link). */
export function EventLinkPreview({ url }: { url: string | null }) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);

  useEffect(() => {
    setPreview(null);
    if (!url) return;
    let cancelled = false;
    getLinkPreview(url).then((result) => {
      if (!cancelled) setPreview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url || !preview?.image) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external image, not an optimizable local asset */}
      <img src={preview.image} alt={preview.title ?? "Link preview"} className="h-28 w-full object-cover" />
    </a>
  );
}
