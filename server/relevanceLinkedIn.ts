/**
 * Relevance AI studio webhook: sends LinkedIn profile URL, receives structured/summary output.
 * @see https://relevanceai.com/docs/agent/build-your-agent/agent-triggers/custom-webhook
 */
import type { Education, Experience, UserProfile } from "../src/types/index.ts";

/** Must match Relevance → tool → Trigger webhook (shareable /form/... URL is not the API path). */
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

/** Pick the object that actually holds profile fields (Relevance wraps in output/result/data). */
function getProfileRecord(data: unknown): Record<string, unknown> {
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
    !!(o.experiences || o.experience || o.full_name || o.fullName || o.headline);
  if (nested && looksLikeProfile(nested)) return nested;
  if (looksLikeProfile(root)) return root;
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
    ]) ||
    [first, last].filter(Boolean).join(" ").trim() ||
    undefined;

  const headline = pickString(output, [
    "headline",
    "job_title",
    "title",
    "professional_headline",
    "summary_headline",
  ]);

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

  if (!experience?.length && headline) {
    const about = pickString(output, ["about", "summary", "bio", "overview"]);
    experience = [
      {
        id: rid(),
        company: "—",
        role: headline.slice(0, 200),
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

  return {
    linkedInProfileUrl: pickString(output, ["linkedin_url", "linkedinUrl"]) ||
      linkedInProfileUrl,
    ...(fullName ? { fullName } : {}),
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

export async function importLinkedInViaRelevance(
  profileUrl: string
): Promise<RelevanceImportResult> {
  const apiKey = process.env.RELEVANCEAI_API_KEY?.trim();
  const webhook =
    process.env.RELEVANCEAI_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = apiKey;
  }

  let rawText = "";
  let parsed: unknown;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers,
      // Relevance custom webhook contract: `url` + optional `name` (see tool Trigger docs).
      body: JSON.stringify({
        url: profileUrl,
        name: "",
      }),
    });
    rawText = await res.text();
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      parsed = { raw: rawText };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: `Relevance AI returned HTTP ${res.status}: ${rawText.slice(0, 500)}`,
      };
    }

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
      return {
        ok: false,
        error:
          "Could not parse profile fields from the Relevance AI response. Check the tool output shape or try again.",
      };
    }
    return { ok: true, profile };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Relevance AI request failed",
    };
  }
}
