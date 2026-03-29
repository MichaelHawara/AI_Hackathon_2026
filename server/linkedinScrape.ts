/**
 * Server-only: fetch a public LinkedIn profile page and extract public metadata (JSON-LD, Open Graph).
 *
 * Why this usually "doesn't work":
 * - LinkedIn aggressively blocks unauthenticated programmatic access (HTTP 999, login walls, challenges).
 * - Server/datacenter IPs are flagged more often than residential browsers.
 * - The HTML no longer reliably embeds full profile JSON-LD for anonymous crawlers.
 *
 * Prefer: Relevance AI webhook (see relevanceLinkedIn.ts), official LinkedIn APIs (partner program),
 * or resume upload + manual edit in the app.
 */
import * as cheerio from "cheerio";
import { randomUUID } from "crypto";

/** Headers that resemble a real browser navigation (still may be blocked by LinkedIn). */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

export type ScrapedExperience = {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type LinkedInScrapePayload = {
  fullName?: string;
  headline?: string;
  about?: string;
  experience?: ScrapedExperience[];
  skills?: string[];
  error?: string;
  authWall?: boolean;
};

export function normalizeLinkedInUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withScheme);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
    if (!u.pathname.includes("/in/")) return null;
    u.hash = "";
    u.search = "";
    u.hostname = "www.linkedin.com";
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Best-effort: collect skillName strings from embedded JSON (may be partial). */
function extractSkillNames(html: string, max = 25): string[] {
  const re = /"skillName"\s*:\s*"([^"]+)"/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    const s = m[1].trim();
    if (s.length > 1 && s.length < 80 && !out.includes(s)) out.push(s);
  }
  return out;
}

export async function scrapeLinkedInProfile(profileUrl: string): Promise<LinkedInScrapePayload> {
  const normalized = normalizeLinkedInUrl(profileUrl);
  if (!normalized) {
    return { error: "Invalid LinkedIn profile URL." };
  }

  let html: string;
  try {
    const res = await fetch(normalized, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });

    // LinkedIn uses non-standard 999 for "Request denied" (bot / abuse detection).
    if (res.status === 999) {
      return {
        error:
          "LinkedIn returned HTTP 999 (request denied). They block many automated and datacenter requests—this is expected for server-side scraping. Use Relevance AI import if configured, try from another network, or add your experience manually.",
        authWall: true,
      };
    }
    if (res.status === 403 || res.status === 429) {
      return {
        error: `LinkedIn returned HTTP ${res.status} (forbidden or rate-limited). Wait and retry, or use Relevance AI / manual entry.`,
        authWall: true,
      };
    }
    if (!res.ok) {
      return {
        error: `LinkedIn returned HTTP ${res.status}. Public HTML scraping may be unavailable from this environment.`,
        authWall: res.status >= 400,
      };
    }
    html = await res.text();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Network error fetching profile." };
  }

  // Sometimes a 200 body is still an interstitial / denial page.
  if (
    /request denied|http\/\s*1\.1\s*999|non-human traffic|unusual traffic/i.test(html.slice(0, 12000))
  ) {
    return {
      error:
        "LinkedIn served a bot-detection or “request denied” page instead of profile HTML. Scraping from this IP/environment is not reliable.",
      authWall: true,
    };
  }

  if (
    /authwall|sign\s*in\s*to\s*linkedin|join\s*linkedin|checkpoint\/challenge/i.test(html) ||
    (html.length < 6000 && /linkedin.*login/i.test(html.slice(0, 12000)))
  ) {
    return {
      error:
        "LinkedIn returned a login or challenge page instead of public profile HTML. You can still save your URL and edit your profile below.",
      authWall: true,
    };
  }

  const $ = cheerio.load(html);
  let fullName: string | undefined;
  let headline: string | undefined;
  let about: string | undefined;

  $("script[type='application/ld+json']").each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const o = node as Record<string, unknown>;
        const t = o["@type"];
        const isPerson =
          t === "Person" || (Array.isArray(t) && (t as string[]).includes("Person"));
        if (isPerson) {
          if (typeof o.name === "string") fullName = fullName || o.name;
          if (typeof o.jobTitle === "string") headline = headline || o.jobTitle;
          if (typeof o.description === "string") about = about || o.description;
        }
      }
    } catch {
      /* ignore */
    }
  });

  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  const ogDesc = $('meta[property="og:description"]').attr("content")?.trim();
  const metaDesc = $('meta[name="description"]').attr("content")?.trim();

  if (!fullName && ogTitle) {
    let name = ogTitle.replace(/\s*[\|\u2013\-]\s*LinkedIn\s*$/i, "").trim();
    const parts = name.split(/\s*\|\s*/);
    if (parts.length >= 2) {
      name = parts[0].trim();
      headline = headline || parts.slice(1).join(" | ").trim();
    }
    fullName = name;
  }

  headline = headline || ogDesc || metaDesc;
  about = about || ogDesc || metaDesc;

  const skills = extractSkillNames(html);

  const experience: ScrapedExperience[] = [];
  if (headline) {
    experience.push({
      id: randomUUID(),
      company: "—",
      role: headline.slice(0, 200),
      startDate: "",
      endDate: "",
      description: (about || "").slice(0, 2000),
    });
  }

  if (!fullName && !headline && skills.length === 0) {
    return {
      error:
        "Could not read public profile metadata (LinkedIn may block automated access). Your URL is still saved—add details manually.",
      authWall: true,
    };
  }

  return {
    fullName,
    headline,
    about,
    experience: experience.length ? experience : undefined,
    skills: skills.length ? skills : undefined,
  };
}
