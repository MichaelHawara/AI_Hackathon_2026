/**
 * Gemini generates Adzuna search queries from the student profile (skills, major, experience).
 * Falls back to heuristic queries if no API key or the model fails.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

function geminiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.VITE_GEMINI_API_KEY?.trim()
  );
}

function geminiModel(): string {
  return (
    process.env.GEMINI_MODEL?.trim() ||
    process.env.VITE_GEMINI_MODEL?.trim() ||
    "gemini-2.0-flash"
  );
}

export function buildHeuristicAdzunaQueries(profile: Record<string, unknown>): string[] {
  const out: string[] = [];
  const skills = Array.isArray(profile.skills)
    ? (profile.skills as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const prefs =
    profile.preferences &&
    typeof profile.preferences === "object" &&
    profile.preferences !== null &&
    "roles" in profile.preferences &&
    Array.isArray((profile.preferences as { roles?: unknown }).roles)
      ? ((profile.preferences as { roles: string[] }).roles ?? []).filter(
          (x): x is string => typeof x === "string"
        )
      : [];

  for (const s of skills.slice(0, 6)) {
    const t = s.trim();
    if (t.length > 1) out.push(`${t} intern`);
  }
  for (const ed of education) {
    if (!ed || typeof ed !== "object") continue;
    const major = String((ed as { major?: string }).major || "").trim();
    if (major.length > 2) {
      const short = major.split(/\s+/).slice(0, 4).join(" ");
      out.push(`${short} internship`);
      out.push(`${short} entry level`);
    }
  }
  for (const r of prefs.slice(0, 4)) {
    const t = r.trim();
    if (t.length > 2) out.push(`${t} internship`);
  }
  for (const ex of experience.slice(0, 3)) {
    if (!ex || typeof ex !== "object") continue;
    const role = String((ex as { role?: string }).role || "").trim();
    if (role.length > 3) {
      out.push(`${role.split(/\s+/).slice(0, 5).join(" ")}`);
    }
  }

  out.push("summer internship", "student internship");
  const uniq = [...new Set(out.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean))];
  return uniq.slice(0, 12);
}

async function generateQueriesWithGemini(
  profile: Record<string, unknown>
): Promise<string[] | null> {
  const key = geminiKey();
  if (!key) return null;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: geminiModel() });

  const compact = {
    skills: profile.skills,
    education: profile.education,
    experience: Array.isArray(profile.experience)
      ? profile.experience.slice(0, 5)
      : profile.experience,
    preferences: profile.preferences,
    address: profile.address,
  };

  const prompt = `You are helping US students find internships and early-career roles on a job API.

Given this profile, output ONLY a JSON array of 6–10 short job-search query strings (each under 70 characters) suitable for Adzuna US job search.

Rules:
- Cover MORE than software: if the student is mechanical, civil, electrical, business, biology, nursing, design, etc., include queries for those fields.
- Include a mix: internships, co-op, "entry level", and role-specific terms from their major/skills.
- Use English. No markdown, no explanation — only a JSON array of strings.

Profile:
${JSON.stringify(compact).slice(0, 12000)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const m = text.match(/\[[\s\S]*?\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]) as unknown;
    if (!Array.isArray(arr)) return null;
    const qs = arr
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
    return qs.length >= 3 ? qs : null;
  } catch {
    return null;
  }
}

/**
 * Returns deduped search strings for Adzuna (Gemini + heuristic merge).
 */
export async function resolveAdzunaQueriesForProfile(
  profile: Record<string, unknown>
): Promise<string[]> {
  const heuristic = buildHeuristicAdzunaQueries(profile);
  try {
    const ai = await generateQueriesWithGemini(profile);
    if (ai?.length) {
      return [...new Set([...ai, ...heuristic])].slice(0, 14);
    }
  } catch (e) {
    console.warn("[jobs] Gemini personalization:", e);
  }
  return heuristic;
}
