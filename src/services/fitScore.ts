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
  if (parts.every((p) => jobTokens.has(p))) return true;
  return false;
}

/**
 * Explainable fit score for students. Deterministic — no randomness.
 * Uses: (1) user skill tokens vs job text, (2) O*NET cluster skills overlap, (3) experience mention density.
 */
export function computeApplicationFit(job: Job, user: UserProfile | null): ApplicationFitEstimate {
  const jobBlob = normalize(`${job.title} ${job.company} ${job.description} ${(job.requirements ?? []).join(' ')}`);
  const jobTokens = tokenize(jobBlob);
  const userSkills = (user?.skills ?? []).map((s) => s.trim()).filter(Boolean);
  const cluster = pickCluster(job);

  let matchedUserSkills = 0;
  for (const s of userSkills) {
    if (skillInText(s, jobTokens, jobBlob)) matchedUserSkills++;
  }
  const skillCoverage =
    userSkills.length === 0 ? 0 : Math.min(1, matchedUserSkills / Math.max(4, userSkills.length * 0.35));

  let onetOverlap = 0;
  const matchedOnet: string[] = [];
  if (cluster) {
    for (const sk of cluster.skills) {
      const hit =
        userSkills.some((u) => normalize(u).includes(normalize(sk)) || normalize(sk).includes(normalize(u))) ||
        skillInText(sk, jobTokens, jobBlob);
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
    if (hits >= 2) expHint = Math.max(expHint, 0.15);
  }

  let raw = skillCoverage * 42 + onetRatio * 38 + expHint * 20;
  if (userSkills.length < 3) raw *= 0.75;
  if (job.description.length < 120) raw *= 0.85;

  const score = Math.max(8, Math.min(95, Math.round(raw)));

  const factors: ApplicationFitEstimate['factors'] = [];
  factors.push({
    label: 'Skill keywords vs. posting',
    detail:
      userSkills.length === 0
        ? 'Add skills to your profile for a more meaningful match.'
        : `${matchedUserSkills} of ${userSkills.length} profile skills appear in the job text or requirements.`
  });
  if (cluster) {
    factors.push({
      label: `O*NET-oriented cluster: ${cluster.title}`,
      detail: `${onetOverlap} cluster skills align with your profile or the posting (SOC examples: ${cluster.socExamples.join(', ') || 'n/a'}).`
    });
  }
  factors.push({
    label: 'Experience overlap',
    detail:
      expHint > 0
        ? 'Some of your past roles or descriptions echo themes from this posting.'
        : 'Limited lexical overlap between experience lines and this posting — consider tailoring your resume.'
  });

  let confidence: ApplicationFitEstimate['confidence'] = 'medium';
  if (userSkills.length < 3 || job.description.length < 80) confidence = 'low';
  else if (userSkills.length >= 8 && job.description.length > 400) confidence = 'high';

  const label =
    score >= 72 ? 'Strong alignment' : score >= 52 ? 'Moderate alignment' : score >= 35 ? 'Emerging alignment' : 'Limited visible alignment';

  return {
    score,
    label,
    confidence,
    factors,
    disclaimer: STANDARD_DISCLAIMER,
    onetClusterTitle: cluster?.title,
    matchedOnetSkills: matchedOnet.slice(0, 8)
  };
}
