"use server";

import dns from "node:dns/promises";
import type { LinkPreviewData } from "@/lib/calendar/link-preview";

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 65536; // enough for a page's <head>; avoids downloading whole pages

/** Blocks obviously-private/loopback/link-local ranges — a best-effort SSRF guard, not exhaustive. */
function isPrivateAddress(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  return lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd") || lower === "::";
}

async function isSafeUrl(url: URL): Promise<boolean> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.hostname.toLowerCase() === "localhost") return false;
  try {
    const { address } = await dns.lookup(url.hostname);
    return !isPrivateAddress(address);
  } catch {
    return false;
  }
}

function matchMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  const match = html.match(re);
  return match ? (match[1] ?? match[2] ?? null) : null;
}

function matchTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

/** Fetches a URL's OpenGraph (or Twitter card) title/image for a lightweight link preview. */
export async function getLinkPreview(rawUrl: string): Promise<LinkPreviewData | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!(await isSafeUrl(url))) return null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BettoLinkPreview/1.0)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    let html = "";
    const reader = res.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      while (html.length < MAX_HTML_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
    } else {
      html = (await res.text()).slice(0, MAX_HTML_BYTES);
    }

    const imagePath = matchMeta(html, "og:image") ?? matchMeta(html, "twitter:image");
    const title = matchMeta(html, "og:title") ?? matchTitleTag(html);
    if (!imagePath && !title) return null;

    let image: string | null = null;
    if (imagePath) {
      try {
        const imageUrl = new URL(imagePath, url);
        if (await isSafeUrl(imageUrl)) image = imageUrl.toString();
      } catch {
        image = null;
      }
    }

    return { url: rawUrl, title, image };
  } catch {
    return null;
  }
}
