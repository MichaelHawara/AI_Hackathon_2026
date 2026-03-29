/**
 * Relevance AI studio webhook: sends LinkedIn profile URL, receives structured/summary output.
 * @see https://relevanceai.com/docs/agent/build-your-agent/agent-triggers/custom-webhook
 */
import type { Education, Experience, UserProfile } from "../src/types/index.ts";

/**
 * Fallback URL only — may be expired or belong to another project.
 * For your own Relevance workspace, set `RELEVANCEAI_WEBHOOK_URL` in `.env.local` to the exact
 * `trigger_webhook` URL from Relevance → your tool → Triggers (NOT the public /form/ link).
 */
const DEFAULT_WEBHOOK =
  "https://api-bcbe5a.stack.tryrelevance.com/latest/studios/4b51cdf1-f328-477e-a4c4-b3760406073a/trigger_webhook?project=cb85d7bc-d73e-46a2-8622-a7c6297d128f";


function rid() {
  return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const PRIVATE_PATTERNS =
  /private\s+profile|profile\s+is\s+private|not\s+publicly\s+available|sign\s+in\s+to\s+linkedin|authwall|restricted\s+profile|this\s+profile\s+can\s*not\s+be\s+viewed/i;

function collectStrings(obj: unknown, out: string[], depth = 0): void {
  if (depth > 12) return;
  if (obj === null || obj === undefined) return;
  if (typeof obj === "string") {
    if (obj.length > 2 && obj.length < 50000) out.push(obj);
    return;
  }
  if (Array.isArray(obj)) {
    for (const x of obj) collectStrings(x, out, depth + 1);
    return;
  }
  if (typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      collectStrings(v, out, depth + 1);
    }
  }
}

function textFromPayload(data: unknown): string {
  const parts: string[] = [];
  collectStrings(data, parts);
  return parts.join("\n");
}

export function detectPrivateProfile(payload: unknown, rawText: string): boolean {
  const blob = `${rawText}\n${textFromPayload(payload)}`;
  return PRIVATE_PATTERNS.test(blob);
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function asRecord(x: unknown): Record<string, unknown> | null {
  return x && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
}

/** Custom tools often return LinkedIn scrape blobs under this key. */
function looksLikeLinkedinFullData(o: Record<string, unknown>): boolean {
  return (
    typeof o.about === "string" ||
    typeof o.city === "string" ||
    typeof o.headline === "string" ||
    typeof o.full_name === "string" ||
    typeof o.fullName === "string"
  );
}

/**
 * Walk any Relevance / async_poll JSON until we find `linkedin_full_data` — the actual profile
 * object (e.g. chain-success → output → output → linkedin_full_data).
 */
function findLinkedinFullDataRecord(root: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 40) return null;
  if (root === null || root === undefined) return null;
  if (typeof root !== "object") return null;
  if (Array.isArray(root)) {
    for (let i = root.length - 1; i >= 0; i--) {
      const f = findLinkedinFullDataRecord(root[i], depth + 1);
      if (f) return f;
    }
    return null;
  }
  const o = root as Record<string, unknown>;
  const li = o.linkedin_full_data;
  if (li != null && typeof li === "object" && !Array.isArray(li)) {
    return li as Record<string, unknown>;
  }
  for (const v of Object.values(o)) {
    const f = findLinkedinFullDataRecord(v, depth + 1);
    if (f) return f;
  }
  return null;
}

/** Pick the object that actually holds profile fields (Relevance wraps in output/result/data). */
function getProfileRecord(data: unknown): Record<string, unknown> {
  const fromLinkedinFull = findLinkedinFullDataRecord(data);
  if (fromLinkedinFull) return fromLinkedinFull;

  if (Array.isArray(data) && data.length && typeof data[0] === "object") {
    return getProfileRecord(data[0]);
  }
  const root = asRecord(data) ?? {};
  let outputField: unknown = root.output ?? root.result ?? root.data ?? root.body;
  if (typeof outputField === "string") {
    try {
      outputField = JSON.parse(outputField) as unknown;
    } catch {
      outputField = undefined;
    }
  }
  const nested =
    asRecord(outputField) ||
    asRecord(root.output) ||
    asRecord(root.result) ||
    asRecord(root.data) ||
    asRecord(root.body);

  const looksLikeProfile = (o: Record<string, unknown>) =>
    !!(
      o.experiences ||
      o.experience ||
      o.full_name ||
      o.fullName ||
      o.headline ||
      (Array.isArray(o.skills) && o.skills.length > 0)
    );

  const unwrapLinkedinFullData = (o: Record<string, unknown>): Record<string, unknown> | null => {
    const li = asRecord(o.linkedin_full_data);
    if (li && (looksLikeProfile(li) || looksLikeLinkedinFullData(li))) {
      return li;
    }
    return null;
  };

  if (nested && looksLikeProfile(nested)) return nested;
  const fromNestedLi = nested ? unwrapLinkedinFullData(nested) : null;
  if (fromNestedLi) return fromNestedLi;

  if (looksLikeProfile(root)) return root;
  const fromRootLi = unwrapLinkedinFullData(root);
  if (fromRootLi) return fromRootLi;

  if (nested && looksLikeLinkedinFullData(nested)) return nested;
  if (looksLikeLinkedinFullData(root)) return root;

  return nested ?? root;
}

function parseExperienceDates(er: Record<string, unknown>): {
  startDate: string;
  endDate: string;
} {
  const dr = er.date_range;
  if (typeof dr === "string" && dr.trim()) {
    const parts = dr.split(/\s*-\s*/);
    const start = parts[0]?.trim() ?? "";
    let end = parts.slice(1).join(" - ").trim() || "";
    if (/present/i.test(end) || er.is_current === true) end = "Present";
    return { startDate: start, endDate: end };
  }
  const sy = er.start_year;
  const sm = er.start_month;
  const ey = er.end_year;
  const em = er.end_month;
  let startDate = "";
  if (sy != null && String(sy) !== "") {
    startDate =
      sm != null && String(sm) !== ""
        ? `${sm}/${sy}`
        : String(sy);
  }
  let endDate = "";
  if (er.is_current === true) {
    endDate = "Present";
  } else if (ey != null && String(ey) !== "") {
    endDate =
      em != null && String(em) !== "" ? `${em}/${ey}` : String(ey);
  }
  return { startDate, endDate };
}

function mapExperienceRow(
  er: Record<string, unknown>,
  headlineFallback: string | undefined
): Experience {
  const { startDate, endDate } = parseExperienceDates(er);
  return {
    id: rid(),
    company: String(er.company || er.companyName || "—"),
    role: String(er.title || er.role || headlineFallback || "—"),
    startDate,
    endDate,
    description: String(er.description || er.summary || ""),
  };
}

/** Map nested Relevance / tool output into UserProfile fields (flexible shapes). */
export function mapRelevanceOutputToProfile(
  data: unknown,
  linkedInProfileUrl: string
): Partial<UserProfile> {
  const output = getProfileRecord(data);

  const first = pickString(output, ["first_name", "firstName"]);
  const last = pickString(output, ["last_name", "lastName"]);
  const fullName =
    pickString(output, [
      "fullName",
      "full_name",
      "name",
      "candidate_name",
      "headline_name",
      "display_name",
    ]) ||
    [first, last].filter(Boolean).join(" ").trim() ||
    undefined;

  const aboutText = pickString(output, ["about", "summary", "bio", "overview"]);

  const headline =
    pickString(output, [
      "headline",
      "job_title",
      "title",
      "professional_headline",
      "summary_headline",
    ]) ||
    (aboutText ? aboutText.slice(0, 220).trim() : undefined);

  let experience: Experience[] | undefined;
  const expRaw =
    output.experiences ??
    output.experience ??
    output.work_experience ??
    output.positions;
  if (Array.isArray(expRaw)) {
    experience = expRaw
      .map((e) => mapExperienceRow(asRecord(e) ?? {}, headline))
      .filter((x) => x.role !== "—" || x.company !== "—");
  }

  if (!experience?.length && (headline || aboutText)) {
    const about = aboutText || pickString(output, ["summary", "bio", "overview"]);
    const roleLine = (headline || aboutText || "Profile").slice(0, 200);
    experience = [
      {
        id: rid(),
        company: "—",
        role: roleLine,
        startDate: "",
        endDate: "",
        description: (about || textFromPayload(output).slice(0, 4000)).slice(
          0,
          4000
        ),
      },
    ];
  }

  let skills: string[] | undefined;
  const sk = output.skills ?? output.skill_list;
  if (Array.isArray(sk)) {
    skills = sk
      .map((s) =>
        typeof s === "string" ? s : String((s as { name?: string }).name || "")
      )
      .filter(Boolean)
      .slice(0, 40);
  } else if (typeof sk === "string") {
    skills = sk
      .split(/[,•\n·|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  if ((!skills || !skills.length) && Array.isArray(expRaw)) {
    const fromExpField = expRaw.flatMap((e) => {
      const s = (asRecord(e) ?? {}).skills;
      return typeof s === "string"
        ? s.split(/[·,|]/).map((x) => x.trim()).filter(Boolean)
        : [];
    });
    if (fromExpField.length) {
      skills = [...new Set(fromExpField)].slice(0, 40);
    }
  }

  let education: Education[] | undefined;
  const eduRaw = output.educations ?? output.education;
  if (Array.isArray(eduRaw)) {
    education = eduRaw
      .map((e) => {
        const er = asRecord(e) ?? {};
        const grad =
          er.end_year != null && String(er.end_year) !== ""
            ? String(er.end_year)
            : String(er.date_range || "").trim();
        return {
          id: rid(),
          school: String(er.school || ""),
          degree: String(er.degree || ""),
          major: String(er.field_of_study || er.fieldOfStudy || ""),
          graduationDate: grad,
        };
      })
      .filter((x) => x.school);
  }

  const photoURL =
    pickString(output, ["profile_image_url", "profileImageUrl", "photoURL"]) ||
    undefined;

  const cityOrLocation = pickString(output, ["city", "location", "geo_location"]);

  return {
    linkedInProfileUrl: pickString(output, ["linkedin_url", "linkedinUrl"]) ||
      linkedInProfileUrl,
    ...(fullName ? { fullName } : {}),
    ...(cityOrLocation ? { address: cityOrLocation } : {}),
    ...(photoURL ? { photoURL } : {}),
    ...(experience?.length ? { experience } : {}),
    ...(education?.length ? { education } : {}),
    ...(skills?.length ? { skills } : {}),
  };
}

export type RelevanceImportResult =
  | { ok: true; profile: Partial<UserProfile> }
  | { ok: false; privateProfile: true; message: string }
  | { ok: false; error: string };

/** Authorization: `project_id:api_key` (Relevance API Keys page) or a full token in RELEVANCEAI_AUTHORIZATION. */
function buildRelevanceAuthorizationForAsync(): string | null {
  const full = process.env.RELEVANCEAI_AUTHORIZATION?.trim();
  if (full) return full;
  const project = process.env.RELEVANCEAI_PROJECT_ID?.trim();
  const key = process.env.RELEVANCEAI_API_KEY?.trim();
  if (project && key) return `${project}:${key}`;
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function processRelevancePayload(
  parsed: unknown,
  rawText: string,
  profileUrl: string
): RelevanceImportResult {
  if (detectPrivateProfile(parsed, rawText)) {
    return {
      ok: false,
      privateProfile: true,
      message:
        "This LinkedIn profile appears to be private or not visible to automated tools. Set your profile to public or paste your experience manually.",
    };
  }
  const profile = mapRelevanceOutputToProfile(parsed, profileUrl);
  if (
    !profile.fullName &&
    !profile.experience?.length &&
    !profile.skills?.length
  ) {
    console.warn(
      "[Relevance AI] Could not parse profile fields. First 500 chars:",
      rawText.slice(0, 500)
    );
    return {
      ok: false,
      error:
        "Could not parse profile fields from the Relevance AI response. Check the tool output shape or try again.",
    };
  }
  return { ok: true, profile };
}

/**
 * Long-running tools: POST trigger_async, poll until type is complete or failed.
 * @see Relevance docs — synchronous webhooks time out at ~30s.
 */
async function importLinkedInViaRelevanceAsync(
  profileUrl: string
): Promise<RelevanceImportResult> {
  const region = process.env.RELEVANCEAI_REGION?.trim();
  const toolId = process.env.RELEVANCEAI_TOOL_ID?.trim();
  const projectId = process.env.RELEVANCEAI_PROJECT_ID?.trim();
  const auth = buildRelevanceAuthorizationForAsync();

  if (!region || !toolId || !projectId || !auth) {
    return {
      ok: false,
      error:
        "Relevance async: set RELEVANCEAI_REGION, RELEVANCEAI_TOOL_ID, RELEVANCEAI_PROJECT_ID, and RELEVANCEAI_API_KEY (Authorization = project_id:api_key), or set RELEVANCEAI_AUTHORIZATION to the full token.",
    };
  }

  const baseUrl = `https://api-${region}.stack.tryrelevance.com/latest`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: auth,
    "User-Agent": "CareerPathAI/1.0 (Relevance trigger_async)",
  };

  const triggerBody = JSON.stringify({
    params: {
      url: profileUrl,
      name: "",
    },
    project: projectId,
  });

  const triggerUrl = `${baseUrl}/studios/${toolId}/trigger_async`;

  let triggerRes: Response;
  try {
    triggerRes = await fetch(triggerUrl, {
      method: "POST",
      headers,
      body: triggerBody,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Relevance async trigger request failed",
    };
  }

  const triggerText = await triggerRes.text();
  let triggerJson: Record<string, unknown>;
  try {
    triggerJson = JSON.parse(triggerText) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      error: `Relevance async trigger invalid JSON (${triggerRes.status}): ${triggerText.slice(0, 400)}`,
    };
  }

  if (!triggerRes.ok) {
    return {
      ok: false,
      error: `Relevance async trigger HTTP ${triggerRes.status}: ${triggerText.slice(0, 500)}`,
    };
  }

  const jobId = triggerJson.job_id;
  if (typeof jobId !== "string" || !jobId) {
    return {
      ok: false,
      error: `Relevance async: no job_id in response: ${triggerText.slice(0, 400)}`,
    };
  }

  const pollUrl = `${baseUrl}/studios/${toolId}/async_poll/${jobId}?ending_update_only=true`;
  const maxMs = Number(process.env.RELEVANCEAI_ASYNC_MAX_MS) || 600_000;
  const pollIntervalMs = Number(process.env.RELEVANCEAI_ASYNC_POLL_MS) || 3000;
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    let pollRes: Response;
    try {
      pollRes = await fetch(pollUrl, {
        method: "GET",
        headers: {
          Authorization: auth,
          "User-Agent": headers["User-Agent"]!,
        },
      });
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Relevance async poll failed",
      };
    }

    const pollText = await pollRes.text();
    let pollParsed: unknown;
    try {
      pollParsed = JSON.parse(pollText) as unknown;
    } catch {
      await sleep(pollIntervalMs);
      continue;
    }

    const pr = asRecord(pollParsed);
    const t = pr?.type;
    if (t === "failed") {
      return {
        ok: false,
        error: `Relevance async job failed: ${pollText.slice(0, 800)}`,
      };
    }
    if (t === "complete") {
      console.log("[Relevance AI] async job complete, parsing profile (linkedin_full_data walk)");
      return processRelevancePayload(pollParsed, pollText, profileUrl);
    }

    await sleep(pollIntervalMs);
  }

  return {
    ok: false,
    error: `Relevance async: timed out after ${maxMs}ms (job ${jobId}). Increase RELEVANCEAI_ASYNC_MAX_MS if needed.`,
  };
}

/**
 * `trigger_webhook` URLs are POST-only. With default `redirect: "follow"`, fetch may follow
 * 301/302/303 by reissuing a **GET** to `Location`, which Relevance rejects with **HTTP 405**.
 * We follow redirects manually and always send POST with the same JSON body.
 */
async function postTriggerWebhook(
  startUrl: string,
  headers: Record<string, string>,
  body: string
): Promise<Response> {
  let url = startUrl;
  for (let hop = 0; hop < 8; hop++) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) {
        return res;
      }
      url = new URL(loc, url).href;
      continue;
    }
    return res;
  }
  throw new Error("Relevance AI webhook: too many redirects");
}

export async function importLinkedInViaRelevance(
  profileUrl: string
): Promise<RelevanceImportResult> {
  const useAsyncFlag = process.env.RELEVANCEAI_USE_ASYNC?.trim().toLowerCase();
  const hasAsyncTriplet =
    !!process.env.RELEVANCEAI_REGION?.trim() &&
    !!process.env.RELEVANCEAI_TOOL_ID?.trim() &&
    !!process.env.RELEVANCEAI_PROJECT_ID?.trim();
  const useAsync =
    useAsyncFlag === "false" || useAsyncFlag === "0"
      ? false
      : useAsyncFlag === "true" || hasAsyncTriplet;

  if (useAsync) {
    return importLinkedInViaRelevanceAsync(profileUrl);
  }

  const apiKey = process.env.RELEVANCEAI_API_KEY?.trim();
  const webhook =
    process.env.RELEVANCEAI_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "CareerPathAI/1.0 (Relevance trigger_webhook)",
  };
  if (apiKey) {
    // Paste the key exactly as Relevance shows; prefix with "Bearer " only if their docs require it.
    headers.Authorization = apiKey.trim();
  }

  const payload = JSON.stringify({
    url: profileUrl,
    name: "",
  });

  let rawText = "";
  let parsed: unknown;
  try {
    const res = await postTriggerWebhook(webhook, headers, payload);
    rawText = await res.text();
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      parsed = { raw: rawText };
    }

    if (!res.ok) {
      console.warn(
        "[Relevance AI] HTTP",
        res.status,
        rawText.slice(0, 400),
        "— Set RELEVANCEAI_WEBHOOK_URL to your studio trigger_webhook and RELEVANCEAI_API_KEY if required."
      );
      return {
        ok: false,
        error: `Relevance AI returned HTTP ${res.status}: ${rawText.slice(0, 500)}`,
      };
    }

    return processRelevancePayload(parsed, rawText, profileUrl);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Relevance AI request failed",
    };
  }
}
