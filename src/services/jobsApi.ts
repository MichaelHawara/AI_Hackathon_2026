import type { Job, UserProfile } from '../types';
import { mockJobs } from '../data/mockJobs';

function profileHasSignal(p: UserProfile | null | undefined): boolean {
  if (!p) return false;
  return Boolean(
    (p.skills && p.skills.length > 0) ||
      (p.experience && p.experience.length > 0) ||
      (p.education && p.education.length > 0) ||
      (p.preferences?.roles && p.preferences.roles.length > 0)
  );
}

/**
 * Loads jobs: POST /api/jobs/personalized with profile when available (Gemini + Adzuna queries),
 * otherwise GET /api/jobs.
 */
export async function fetchJobsForUser(
  profile: UserProfile | null | undefined
): Promise<Job[]> {
  if (profileHasSignal(profile)) {
    try {
      const res = await fetch('/api/jobs/personalized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        const remote = (await res.json()) as Job[];
        if (Array.isArray(remote) && remote.length > 0) return remote;
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const res = await fetch('/api/jobs');
    if (res.ok) {
      const remote = (await res.json()) as Job[];
      if (Array.isArray(remote) && remote.length > 0) return remote;
    }
  } catch {
    /* use fallback */
  }

  return mockJobs.slice(0, 15);
}
