import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerativeModel } from '@google/generative-ai';
import type { Job, UserProfile } from '../types';
import collegeHints from '../data/collegeScorecardSample.json';
import { stripAiPreamble } from '../utils/aiOutput';

function buildJobContextBlock(job: Job): string {
  return `TARGET JOB (tailor all content to this role — use exact job title and company where appropriate):
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Work arrangement: ${job.workType ?? 'See description'}
- Compensation (if listed): ${job.pay ?? 'Not listed'}
- Listed requirements / keywords: ${(job.requirements ?? []).join(', ') || 'Infer from description'}

Full job description:
${job.description}
`;
}

const SYSTEM_INSTRUCTION = `
You are CareerPath AI, an expert Career Assistant built specifically for students navigating the workforce.

Your capabilities:
- Answer questions about what specific jobs/roles require
- Suggest ways to improve skills for a given sector
- Recommend learning resources (courses, books, certifications, projects)
- Provide tips to improve chances of getting accepted for roles
- Help with interview preparation and salary negotiation
- Guide students through career exploration, preparation, and early career decisions

Be encouraging, professional, practical, and specific. When recommending resources, give actual names of courses, platforms, or books when possible. Tailor advice to the user's existing skills and experience.
`;

/**
 * Stable model IDs per https://ai.google.dev/gemini-api/docs/models/gemini — older aliases like
 * `gemini-1.5-flash` often return 404 on v1beta.
 */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';

/**
 * Tried in order after the preferred model when a call fails with quota/rate-limit OR 404/unsupported.
 */
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest'
];

function getPreferredModelName(): string {
  return import.meta.env.VITE_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'MISSING_GEMINI_KEY: Add VITE_GEMINI_API_KEY to .env.local in the project root, then restart the dev server (npm run dev). Get a key at https://aistudio.google.com/app/apikey'
    );
  }
  return key;
}

/** Retry with the next model ID when quota is hit or the model ID is wrong/retired (404). */
function shouldTryNextModel(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|\[429\]|quota exceeded|rate limit|resource_exhausted|RESOURCE_EXHAUSTED/i.test(msg)) {
    return true;
  }
  if (/\[404\]|404|not found|not supported for generateContent|is not found for API version/i.test(msg)) {
    return true;
  }
  return false;
}

function isQuotaOrRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|\[429\]|quota exceeded|rate limit|resource_exhausted|RESOURCE_EXHAUSTED/i.test(msg);
}

/**
 * Try preferred model, then fallbacks on quota/rate-limit or 404/unsupported model name.
 */
async function withModelFallback<T>(run: (model: GenerativeModel) => Promise<T>): Promise<T> {
  const preferred = getPreferredModelName();
  const tryNames = [preferred, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferred)];
  const genAI = new GoogleGenerativeAI(getApiKey());

  for (let i = 0; i < tryNames.length; i++) {
    const name = tryNames[i];
    try {
      const model = genAI.getGenerativeModel({ model: name });
      return await run(model);
    } catch (e) {
      if (!shouldTryNextModel(e)) throw e;
      if (i === tryNames.length - 1) throw e;
      console.warn(`[Gemini] Model "${name}" unavailable or over quota; trying next model…`);
    }
  }
  throw new Error('Gemini: no model candidates');
}

async function withJsonModelFallback<T>(run: (model: GenerativeModel) => Promise<T>): Promise<T> {
  const preferred = getPreferredModelName();
  const tryNames = [preferred, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferred)];
  const genAI = new GoogleGenerativeAI(getApiKey());

  for (let i = 0; i < tryNames.length; i++) {
    const name = tryNames[i];
    try {
      const model = genAI.getGenerativeModel({
        model: name,
        generationConfig: { responseMimeType: 'application/json' }
      });
      return await run(model);
    } catch (e) {
      if (!shouldTryNextModel(e)) throw e;
      if (i === tryNames.length - 1) throw e;
      console.warn(`[Gemini] Model "${name}" unavailable or over quota; trying next model…`);
    }
  }
  throw new Error('Gemini JSON: all models exhausted');
}

export function formatGeminiError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.startsWith('MISSING_GEMINI_KEY')) {
      return err.message.replace(/^MISSING_GEMINI_KEY:\s*/, '');
    }
    let msg = err.message;
    if (msg.length > 1200) {
      msg = msg.slice(0, 1200) + '… [truncated]';
    }
    if (isQuotaOrRateLimit(err)) {
      msg +=
        '\n\nTip: Free-tier limits are per-model. Set VITE_GEMINI_MODEL (e.g. gemini-2.5-flash-lite), wait, or check quotas: https://ai.google.dev/gemini-api/docs/rate-limits';
    } else if (/\[404\]|404|not found|not supported for generateContent/i.test(msg)) {
      msg +=
        '\n\nTip: That model id may be retired. Set VITE_GEMINI_MODEL to a current id from https://ai.google.dev/gemini-api/docs/models/gemini (e.g. gemini-2.5-flash-lite).';
    }
    return msg;
  }
  return String(err);
}

export async function getCareerAdvice(message: string, userProfile: unknown) {
  const prompt = `${SYSTEM_INSTRUCTION}\n\nUser Profile: ${JSON.stringify(userProfile)}\n\nUser Question: ${message}`;
  return withModelFallback(async (model) => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  });
}

const JOB_COACH_INSTRUCTION = `You are a concise "role coach" for students. This chat is scoped to ONE job posting.
Priorities:
- Suggest concrete skills to build or strengthen for THIS role.
- Name learning resources (courses, docs, books, practice projects) when possible.
- Connect advice to the student's existing profile without inventing experience they do not have.
- Acknowledge uncertainty: hiring is competitive; encourage preparation and networking.
- Optionally reference that workforce skill expectations can be explored via O*NET-style occupational skills (U.S. DOL) when relevant.
Education ROI context (sample institutions only — not personalized financial advice): ${JSON.stringify(collegeHints.institutions.slice(0, 2))}`;

export async function getJobCoachReply(
  message: string,
  job: Job,
  userProfile: UserProfile | null,
  fitSummary: string,
  history: { role: 'user' | 'bot'; text: string }[]
): Promise<string> {
  const ctx = buildJobContextBlock(job);
  const hist = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.text}`)
    .join('\n');
  const prompt = `${JOB_COACH_INSTRUCTION}

${ctx}

Profile fit summary (transparent estimate): ${fitSummary}

Student profile (may be partial): ${JSON.stringify(userProfile ?? {})}

Recent conversation:
${hist}

Student message: ${message}

Reply in plain text, structured with short bullets if helpful. Under 500 words unless the student asks for detail.`;
  return withModelFallback(async (model) => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  });
}

/** Parse plain resume text into profile fields (merge with existing profile on the client). */
export async function parseResumeToProfile(resumeText: string): Promise<Partial<UserProfile>> {
  const prompt = `Extract structured data from the resume text below for a student career app.
Return ONLY valid JSON with these optional keys (omit keys you cannot support):
{
  "fullName": string,
  "email": string,
  "phone": string,
  "address": string,
  "skills": string[],
  "experience": [{"company": string, "role": string, "startDate": string, "endDate": string, "description": string}],
  "education": [{"school": string, "degree": string, "major": string, "graduationDate": string}],
  "projects": [{"name": string, "description": string, "technologies": string[], "url": string}],
  "certifications": [{"name": string, "issuingOrganization": string, "issueDate": string, "expirationDate": string}]
}
Rules:
- Never invent employers, degrees, or jobs not clearly implied by the resume.
- Use empty strings for unknown dates.
- At most 40 skills.
- If the text is not a resume, return {"skills":[]}.

RESUME TEXT:
${resumeText.slice(0, 24000)}`;
  return withJsonModelFallback(async (model) => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = JSON.parse(response.text()) as Partial<UserProfile>;
    return raw;
  });
}

export async function generateResume(userProfile: unknown, job: Job) {
  const prompt = `You output ONLY the resume in Markdown. No preamble, no "Here is", no meta commentary before the document.

${SYSTEM_INSTRUCTION}

${buildJobContextBlock(job)}

APPLICANT PROFILE (use truthfully; do not invent employers, degrees, or dates):
${JSON.stringify(userProfile, null, 2)}

Resume rules:
- Start with a single top-level heading: "# " followed by the applicant's full name (from profile).
- Then sections using ## headings in this order when data exists: Professional Summary, Skills, Experience, Education, Projects, Certifications, Additional (volunteering/research as needed).
- Professional Summary: 2–3 tight sentences echoing themes and keywords from the TARGET JOB description.
- Experience bullets: tie achievements to what the job asks for; use metrics when present in profile.
- Skills: prioritize overlap with the job's requirements and description.
- Do not include labels like "Resume" or "Generated by AI" or markdown code fences around the whole document.
- Keep ATS-friendly plain structure (use ## and bullet lists with "- ").
`;
  return withModelFallback(async (model) => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return stripAiPreamble(response.text());
  });
}

export async function extractSkillsFromTranscript(transcriptText: string): Promise<string[]> {
  const prompt = `${SYSTEM_INSTRUCTION}\n\nAnalyze this academic transcript and extract relevant professional skills.

TRANSCRIPT TEXT:
${transcriptText}

Instructions:
- Extract all professional skills (technical, soft, domain-specific).
- Return a JSON object with a single key "skills" which is an array of strings.
- Example: { "skills": ["JavaScript", "React", "Team Leadership"] }
`;
  return withJsonModelFallback(async (model) => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const json = JSON.parse(response.text()) as { skills?: string[] };
    return json.skills || [];
  });
}

export async function generateCoverLetter(userProfile: unknown, job: Job) {
  const prompt = `You output ONLY the cover letter in Markdown. No preamble, no "Sure!", no explanation before the letter.

${SYSTEM_INSTRUCTION}

${buildJobContextBlock(job)}

APPLICANT PROFILE:
${JSON.stringify(userProfile, null, 2)}

Cover letter rules:
- Start with a proper salutation on its own line, e.g. "Dear Hiring Manager," (unless a real hiring manager name exists in profile — there usually is not).
- Opening: name the exact job title and company from the target job, and why this role fits the candidate.
- Body: at least two substantial paragraphs citing specific experiences and skills FROM THE PROFILE that map to requirements in the job description (quote themes, not generic filler).
- Closing: restate enthusiasm, thank the reader, and include a professional sign-off with the applicant's name from the profile on the last line.
- Minimum length: roughly 320–450 words so it fills about one printed page with normal spacing (this is a hard target).
- Use Markdown paragraphs (blank line between paragraphs). Do not wrap the letter in \`\`\` fences.
- Do not mention "AI" or that this was generated.
`;
  return withModelFallback(async (model) => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return stripAiPreamble(response.text());
  });
}
