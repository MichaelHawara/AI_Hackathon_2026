/**
 * Server-side: aggregate job listings from public RSS/APIs.
 * Indeed/LinkedIn RSS often returns 403 or drops connections for server-side clients; optional
 * Adzuna API (ADZUNA_APP_ID + ADZUNA_APP_KEY) provides reliable listings when registered at
 * https://developer.adzuna.com/signup
 */
import { XMLParser } from "fast-xml-parser";
import type { Job } from "../src/types/index.ts";
import { mockJobs } from "../src/data/mockJobs.ts";

/** Indeed/LinkedIn RSS usually returns 403/404 for server-side fetches — expected; off by default. */
const RSS_DEBUG = process.env.JOBS_RSS_DEBUG === "1";

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
    if (!res.ok) {
      if (RSS_DEBUG) {
        const errBody = await res.text();
        console.warn("[jobs] Indeed RSS HTTP", res.status, errBody.slice(0, 120));
      }
      return [];
    }
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
  } catch (e) {
    if (RSS_DEBUG) console.warn("[jobs] Indeed RSS error", e);
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
    if (!res.ok) {
      if (RSS_DEBUG) {
        const errBody = await res.text();
        console.warn("[jobs] LinkedIn RSS HTTP", res.status, errBody.slice(0, 120));
      }
      return [];
    }
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
  } catch (e) {
    if (RSS_DEBUG) console.warn("[jobs] LinkedIn RSS error", e);
    return [];
  }
}

function adzunaAppKey(): string | undefined {
  return (
    process.env.ADZUNA_APP_KEY?.trim() ||
    process.env.ADZUNA_API_KEY?.trim()
  );
}

/** Comma- or pipe-separated searches (e.g. SWE + marketing + nursing) to widen beyond one major. */
export function parseAdzunaWhatQueries(): string[] {
  const raw = process.env.ADZUNA_QUERY_WHAT?.trim();
  if (!raw) return ["software engineering intern"];
  const parts = raw.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : ["software engineering intern"];
}

function adzunaResultsPerPageForRequest(): number {
  const n = Number(process.env.ADZUNA_RESULTS_PER_PAGE);
  if (Number.isFinite(n) && n >= 1) return Math.min(50, Math.floor(n));
  return 25;
}

/** One Adzuna search (page 1). */
async function fetchAdzunaSingleQuery(
  what: string,
  resultsPerPage: number,
  where: string | undefined
): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID?.trim();
  const appKey = adzunaAppKey();
  if (!appId || !appKey) return [];

  try {
    const u = new URL("https://api.adzuna.com/v1/api/jobs/us/search/1");
    u.searchParams.set("app_id", appId);
    u.searchParams.set("app_key", appKey);
    u.searchParams.set("what", what);
    if (where) u.searchParams.set("where", where);
    u.searchParams.set(
      "results_per_page",
      String(Math.min(Math.max(resultsPerPage, 1), 50))
    );
    u.searchParams.set("content-type", "application/json");

    const res = await fetch(u.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "CareerPathAI/1.0 (Adzuna)",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn(
        "[jobs] Adzuna HTTP",
        res.status,
        text.slice(0, 300),
        "— Check ADZUNA_APP_ID / ADZUNA_APP_KEY (or ADZUNA_API_KEY) in .env.local; restart the dev server."
      );
      return [];
    }
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch (e) {
      console.warn(
        "[jobs] Adzuna: response was not JSON (first 200 chars):",
        text.slice(0, 200),
        e
      );
      return [];
    }
    const rawList =
      (json.results as unknown[]) ||
      (json.data as unknown[]) ||
      [];
    const out: Job[] = [];

    for (const row of rawList) {
      const r = row as Record<string, unknown>;
      const title = String(r.title || "").trim();
      if (!title) continue;

      let companyName = "Employer";
      const comp = r.company;
      if (typeof comp === "string") companyName = comp;
      else if (comp && typeof comp === "object") {
        const dn = (comp as { display_name?: string }).display_name;
        if (typeof dn === "string" && dn.trim()) companyName = dn.trim();
      }

      let location = "United States";
      const loc = r.location;
      if (loc && typeof loc === "object") {
        const dn = (loc as { display_name?: string }).display_name;
        if (typeof dn === "string" && dn.trim()) location = dn.trim();
      }

      const desc = stripHtml(String(r.description || "")).slice(0, 1200);
      const redirect = String(r.redirect_url || "").trim();
      const created = String(r.created || "");

      let pay: string | undefined;
      const smin = r.salary_min;
      const smax = r.salary_max;
      if (typeof smin === "number" && smin > 0) {
        pay =
          typeof smax === "number" && smax > 0 && smax !== smin
            ? `$${smin.toLocaleString()}–$${smax.toLocaleString()}`
            : `$${smin.toLocaleString()}+`;
      }

      out.push({
        id: hashId(`adzuna-${String(r.id || title)}-${redirect}`),
        title,
        company: companyName,
        location,
        description: desc || title,
        source: "Adzuna",
        pay,
        postedDate: created ? new Date(created).toISOString() : new Date().toISOString(),
        workType: "Hybrid",
        requirements: [],
        url: redirect || undefined,
      });
    }
    if (out.length === 0 && rawList.length === 0) {
      console.warn(
        "[jobs] Adzuna returned 0 results for query:",
        JSON.stringify({ what, where: where || "(US-wide)" }),
        "— Try ADZUNA_QUERY_WHAT / ADZUNA_QUERY_WHERE or broader keywords."
      );
    }
    return out;
  } catch (e) {
    console.warn("[jobs] Adzuna error", e);
    return [];
  }
}

/**
 * Adzuna JSON API (US) — needs free keys from https://developer.adzuna.com/signup
 * Runs each query in `ADZUNA_QUERY_WHAT` (comma-separated) or `overrideQueries` and merges/dedupes.
 */
export async function fetchAdzunaJobs(
  totalLimit = 35,
  overrideQueries?: string[]
): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID?.trim();
  const appKey = adzunaAppKey();
  if (!appId || !appKey) return [];

  const queries =
    overrideQueries?.filter((q) => q.trim().length > 0) ?? parseAdzunaWhatQueries();
  if (queries.length === 0) return [];
  const where = process.env.ADZUNA_QUERY_WHERE?.trim();
  const envCap = adzunaResultsPerPageForRequest();
  const perRequest = Math.min(
    50,
    envCap,
    Math.max(1, Math.ceil(totalLimit / queries.length))
  );

  const merged: Job[] = [];
  const seen = new Set<string>();

  for (const what of queries) {
    const batch = await fetchAdzunaSingleQuery(what, perRequest, where);
    for (const j of batch) {
      const k = `${j.title}|${j.company}`.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(j);
      if (merged.length >= totalLimit) return merged;
    }
  }

  return merged;
}

/** For GET /api/jobs/feed-status — real HTTP status from Adzuna (same query as job feed). */
export async function getAdzunaFeedDiagnostics(): Promise<{
  envAppId: boolean;
  envAppKey: boolean;
  probeHttpStatus: number | null;
  probeResultCount: number;
  probeBodyPreview: string | null;
}> {
  const appId = process.env.ADZUNA_APP_ID?.trim();
  const appKey = adzunaAppKey();
  if (!appId || !appKey) {
    return {
      envAppId: !!appId,
      envAppKey: !!appKey,
      probeHttpStatus: null,
      probeResultCount: 0,
      probeBodyPreview:
        "Set ADZUNA_APP_ID and ADZUNA_APP_KEY (or ADZUNA_API_KEY) in .env.local at the project root, then restart npm run dev.",
    };
  }

  const what = parseAdzunaWhatQueries()[0] ?? "software engineering intern";
  const where = process.env.ADZUNA_QUERY_WHERE?.trim();
  const u = new URL("https://api.adzuna.com/v1/api/jobs/us/search/1");
  u.searchParams.set("app_id", appId);
  u.searchParams.set("app_key", appKey);
  u.searchParams.set("what", what);
  if (where) u.searchParams.set("where", where);
  u.searchParams.set(
    "results_per_page",
    String(Math.min(20, adzunaResultsPerPageForRequest()))
  );
  u.searchParams.set("content-type", "application/json");

  let res: Response;
  try {
    res = await fetch(u.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "CareerPathAI/1.0 (Adzuna)",
      },
    });
  } catch (e) {
    return {
      envAppId: true,
      envAppKey: true,
      probeHttpStatus: null,
      probeResultCount: 0,
      probeBodyPreview: e instanceof Error ? e.message : String(e),
    };
  }

  const text = await res.text();
  let count = 0;
  if (res.ok) {
    try {
      const j = JSON.parse(text) as { results?: unknown[] };
      count = Array.isArray(j.results) ? j.results.length : 0;
    } catch {
      /* handled via preview */
    }
  }

  return {
    envAppId: true,
    envAppKey: true,
    probeHttpStatus: res.status,
    probeResultCount: count,
    probeBodyPreview: text.slice(0, 400),
  };
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

export type AggregateJobsOptions = {
  /** When set (e.g. from Gemini + profile), overrides ADZUNA_QUERY_WHAT for this aggregation. */
  adzunaWhatQueries?: string[];
};

export async function aggregateRemoteJobs(
  opts?: AggregateJobsOptions
): Promise<Job[]> {
  const cap = (() => {
    const n = Number(process.env.JOBS_AGGREGATE_MAX);
    return Number.isFinite(n) && n > 0 ? Math.min(80, Math.floor(n)) : 40;
  })();

  const [adzuna, indeed, linkedin, google, hs] = await Promise.all([
    fetchAdzunaJobs(Math.min(50, cap), opts?.adzunaWhatQueries),
    fetchIndeedJobs(4),
    fetchLinkedInRssJobs(3),
    fetchGoogleCareersJobs(3),
    Promise.resolve(handshakeSamples()),
  ]);
  /** Google + Handshake samples first so dedupe by title|company keeps official/mock rows when Adzuna repeats the same posting. */
  const merged = [...google, ...hs, ...adzuna, ...indeed, ...linkedin];
  const seen = new Set<string>();
  const deduped: Job[] = [];
  for (const j of merged) {
    const key = `${j.title}|${j.company}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(j);
  }
  return deduped.slice(0, cap);
}
