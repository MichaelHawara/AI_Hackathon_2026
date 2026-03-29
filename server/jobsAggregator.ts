/**
 * Server-side: aggregate job listings from public RSS/APIs.
 */
import { XMLParser } from "fast-xml-parser";
import type { Job } from "../src/types/index.ts";
import { mockJobs } from "../src/data/mockJobs.ts";

function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `j${Math.abs(h).toString(36)}`;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseIndeedTitle(raw: string): { title: string; company: string } {
  const t = raw.replace(/\s+/g, " ").trim();
  const idx = t.lastIndexOf(" - ");
  if (idx === -1) return { title: t, company: "Employer" };
  return { title: t.slice(0, idx).trim(), company: t.slice(idx + 3).trim() };
}

export async function fetchIndeedJobs(limit = 4): Promise<Job[]> {
  const url =
    "https://www.indeed.com/rss?q=software+engineering+intern&l=United+States";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CareerPathBot/1.0 (job aggregator)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const doc = parser.parse(xml) as {
      rss?: { channel?: { item?: unknown } };
    };
    const raw = doc.rss?.channel?.item;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const out: Job[] = [];
    for (const item of items.slice(0, limit)) {
      const it = item as {
        title?: string;
        link?: string;
        description?: string;
        pubDate?: string;
      };
      if (!it.title || !it.link) continue;
      const { title, company } = parseIndeedTitle(it.title);
      out.push({
        id: hashId(`indeed-${it.link}`),
        title,
        company,
        location: "United States",
        description: stripHtml(it.description || "").slice(0, 1200),
        source: "Indeed",
        postedDate: it.pubDate
          ? new Date(it.pubDate).toISOString()
          : new Date().toISOString(),
        workType: "Hybrid",
        requirements: [],
        url: it.link,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchLinkedInRssJobs(limit = 3): Promise<Job[]> {
  const url =
    "https://www.linkedin.com/jobs/rss?keywords=Software+Engineering+Intern&location=United%20States";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CareerPathBot/1.0 (job aggregator)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const doc = parser.parse(xml) as {
      rss?: { channel?: { item?: unknown } };
    };
    const raw = doc.rss?.channel?.item;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const out: Job[] = [];
    for (const item of items.slice(0, limit)) {
      const it = item as {
        title?: string;
        link?: string;
        description?: string;
        pubDate?: string;
      };
      if (!it.title || !it.link) continue;
      const { title, company } = parseIndeedTitle(it.title);
      out.push({
        id: hashId(`li-${it.link}`),
        title,
        company,
        location: "United States",
        description: stripHtml(it.description || "").slice(0, 1200),
        source: "LinkedIn",
        postedDate: it.pubDate
          ? new Date(it.pubDate).toISOString()
          : new Date().toISOString(),
        workType: "Hybrid",
        requirements: [],
        url: it.link,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchGoogleCareersJobs(limit = 3): Promise<Job[]> {
  try {
    const u = new URL("https://careers.google.com/api/v3/search/");
    u.searchParams.set("q", "Software Engineering Intern");
    u.searchParams.set("page", "1");
    u.searchParams.set("page_size", String(Math.max(limit, 5)));
    const res = await fetch(u.toString(), {
      headers: { "User-Agent": "CareerPathBot/1.0" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as Record<string, unknown>;
    const rawList =
      (json.jobs as unknown[]) ||
      (json.results as unknown[]) ||
      (Array.isArray((json.data as { jobs?: unknown[] })?.jobs)
        ? (json.data as { jobs: unknown[] }).jobs
        : null) ||
      [];
    const out: Job[] = [];
    for (const entry of rawList.slice(0, limit)) {
      const row = entry as { data?: Record<string, unknown> };
      const d = row.data || (entry as Record<string, unknown>);
      const title = String(d.title || d.name || "");
      if (!title) continue;
      const loc =
        String(d.locationsText || d.location || "") ||
        "Multiple locations";
      const desc = String(d.description || d.job_description || "").slice(
        0,
        1200
      );
      const applyUrl = String(
        d.applyUrl || d.url || d.canonical_url || ""
      );
      out.push({
        id: hashId(`google-${title}-${applyUrl}`),
        title,
        company: "Google",
        location: loc,
        description: stripHtml(desc),
        source: "Google",
        postedDate: d.publishedDate
          ? new Date(String(d.publishedDate)).toISOString()
          : new Date().toISOString(),
        workType: "Hybrid",
        requirements: [],
        url:
          applyUrl ||
          `https://careers.google.com/jobs/results/?q=${encodeURIComponent(title)}`,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function handshakeSamples(): Job[] {
  return mockJobs
    .filter((j) => j.source === "Handshake")
    .slice(0, 2)
    .map((j) => ({
      ...j,
      id: hashId(`hs-${j.id}-${j.title}`),
    }));
}

export async function aggregateRemoteJobs(): Promise<Job[]> {
  const [indeed, linkedin, google, hs] = await Promise.all([
    fetchIndeedJobs(4),
    fetchLinkedInRssJobs(3),
    fetchGoogleCareersJobs(3),
    Promise.resolve(handshakeSamples()),
  ]);
  const merged = [...google, ...indeed, ...linkedin, ...hs];
  const seen = new Set<string>();
  const deduped: Job[] = [];
  for (const j of merged) {
    const key = `${j.title}|${j.company}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(j);
  }
  return deduped.slice(0, 18);
}
