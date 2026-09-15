// Plain, framework-agnostic helper — importable from both client and server
// code, unlike lib/actions/link-preview.ts (a "use server" module, whose
// exports always become async actions once imported client-side).

const URL_REGEX = /https?:\/\/[^\s<>"')]+/i;

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

export type LinkPreviewData = { url: string; title: string | null; image: string | null };
