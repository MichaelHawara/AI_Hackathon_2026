import type { Job, UserProfile, ApplicationFitEstimate } from '../types';
import onetData from '../data/onetSkillClusters.json';

type Cluster = (typeof onetData.clusters)[number];

const STANDARD_DISCLAIMER =
  'This is a decision-support estimate, not a prediction of whether you will be hired. It combines keyword overlap, your saved skills, and O*NET-style skill clusters (U.S. DOL). Real outcomes depend on competition, timing, referrals, and factors not visible in a posting. Job feeds may over- or under-represent regions and industries.';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+\s.#]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text: string): Set<string> {
  const n = normalize(text);
  const words = n.split(/\s+/).filter((w) => w.length > 1);
  return new Set(words);
}

/** Text blob from profile for lexical matching when skills are sparse. */
function buildUserBlob(user: UserProfile | null): string {
  if (!user) return '';
  const parts: string[] = [];
  for (const s of user.skills ?? []) parts.push(s);
  for (const e of user.experience ?? []) {
    parts.push(e.role, e.description, e.company);
  }
  for (const ed of user.education ?? []) {
    parts.push(ed.major, ed.degree, ed.school);
  }
  for (const r of user.preferences?.roles ?? []) parts.push(r);
  return normalize(parts.join(' '));
}

/** Share of meaningful words from `fromText` that appear in `inText`. */
function wordCoverage(fromText: string, inText: string): number {
  const words = fromText.split(/\s+/).filter((w) => w.length > 2);
  if (!words.length) return 0;
  let hit = 0;
  for (const w of words) {
    if (inText.includes(w)) hit++;
  }
  return hit / words.length;
}

function pickCluster(job: Job): Cluster | undefined {
  const blob = normalize(`${job.title} ${job.description} ${(job.requirements ?? []).join(' ')}`);
  let best: Cluster | undefined;
  let bestHits = 0;
  for (const c of onetData.clusters) {
    let hits = 0;
    for (const kw of c.keywords) {
      if (blob.includes(normalize(kw))) hits += 2;
    }
    if (hits > bestHits) {
      bestHits = hits;
      best = c;
    }
  }
  return bestHits > 0 ? best : onetData.clusters.find((c) => c.id === 'intern-early');
}

function skillInText(skill: string, jobTokens: Set<string>, jobBlob: string): boolean {
  const ns = normalize(skill);
  if (jobBlob.includes(ns)) return true;
  const parts = ns.split(/\s+/);
  if (parts.every((p) => p.length > 1 && jobTokens.has(p))) return true;
  return false;
}

/**
 * Explainable fit score for students. Deterministic — no randomness.
 * Uses: profile skills vs job, lexical profile blob vs job, O*NET cluster overlap, experience hints.
 */
export function computeApplicationFit(job: Job, user: UserProfile | null): ApplicationFitEstimate {
  const jobBlob = normalize(`${job.title} ${job.company} ${job.description} ${(job.requirements ?? []).join(' ')}`);
  const jobTokens = tokenize(jobBlob);
  const userSkills = (user?.skills ?? []).map((s) => s.trim()).filter(Boolean);
  const userBlob = buildUserBlob(user);
  const cluster = pickCluster(job);

  let matchedUserSkills = 0;
  for (const s of userSkills) {
    if (skillInText(s, jobTokens, jobBlob)) matchedUserSkills++;
  }

  const skillFrac =
    userSkills.length > 0
      ? matchedUserSkills / userSkills.length
      : Math.min(1, wordCoverage(userBlob, jobBlob) * 1.15);

  const lexicalOverlap = wordCoverage(userBlob, jobBlob);

  const titleTokens = tokenize(job.title);
  let titleHits = 0;
  for (const t of titleTokens) {
    if (t.length < 3) continue;
    if (userBlob.includes(t)) titleHits++;
  }
  const titleFrac = titleTokens.size ? titleHits / titleTokens.size : 0;

  let onetOverlap = 0;
  const matchedOnet: string[] = [];
  if (cluster) {
    for (const sk of cluster.skills) {
      const hit =
        userSkills.some(
          (u) => normalize(u).includes(normalize(sk)) || normalize(sk).includes(normalize(u))
        ) || skillInText(sk, jobTokens, jobBlob);
      if (hit) {
        onetOverlap++;
        matchedOnet.push(sk);
      }
    }
  }
  const onetRatio = cluster ? onetOverlap / cluster.skills.length : 0;

  let expHint = 0;
  const exps = user?.experience ?? [];
  for (const e of exps) {
    const chunk = normalize(`${e.role} ${e.description} ${e.company}`);
    let hits = 0;
    for (const t of jobTokens) {
      if (t.length > 3 && chunk.includes(t)) hits++;
    }
    if (hits >= 2) expHint = Math.max(expHint, 0.2);
    else if (hits === 1) expHint = Math.max(expHint, 0.08);
  }

  let blended =
    0.34 * Math.min(1, skillFrac) +
    0.24 * Math.min(1, lexicalOverlap) +
    0.1 * Math.min(1, titleFrac * 1.4) +
    0.22 * Math.min(1, onetRatio) +
    0.1 * Math.min(1, expHint / 0.2);

  if (userSkills.length > 0 && userSkills.length < 4) blended *= 0.92;
  if (job.description.length < 100) blended *= 0.94;

  const score = Math.round(14 + 78 * Math.min(1, Math.max(0, blended)));
  const clamped = Math.min(94, Math.max(14, score));

  const factors: ApplicationFitEstimate['factors'] = [];
  factors.push({
    label: 'Skill keywords vs. posting',
    detail:
      userSkills.length === 0
        ? 'Add skills to your profile for stronger matches — using your experience and education text for now.'
        : `${matchedUserSkills} of ${userSkills.length} profile skills appear in the job text or requirements.`
  });
  if (cluster) {
    factors.push({
      label: `O*NET-oriented cluster: ${cluster.title}`,
      detail: `${onetOverlap} cluster skills align with your profile or the posting (SOC examples: ${cluster.socExamples.join(', ') || 'n/a'}).`
    });
  }
  factors.push({
    label: 'Experience & profile overlap',
    detail:
      expHint > 0 || lexicalOverlap > 0.08
        ? 'Some themes from your background line up with this posting.'
        : 'Limited overlap between your profile text and this posting — consider tailoring your resume.'
  });

  let confidence: ApplicationFitEstimate['confidence'] = 'medium';
  if (userSkills.length < 2 && userBlob.length < 40) confidence = 'low';
  else if (job.description.length < 80) confidence = 'low';
  else if (userSkills.length >= 6 && job.description.length > 350) confidence = 'high';

  const label =
    clamped >= 72
      ? 'Strong alignment'
      : clamped >= 54
        ? 'Moderate alignment'
        : clamped >= 38
          ? 'Emerging alignment'
          : 'Limited visible alignment';

  return {
    score: clamped,
    label,
    confidence,
    factors,
    disclaimer: STANDARD_DISCLAIMER,
    onetClusterTitle: cluster?.title,
    matchedOnetSkills: matchedOnet.slice(0, 8)
  };
}
