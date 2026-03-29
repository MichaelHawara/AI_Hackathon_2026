import type { Job } from '../types';

function hostMatchesSource(url: string, source: Job['source']): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (source === 'LinkedIn') return h.includes('linkedin.com');
    if (source === 'Indeed') return h.includes('indeed.com');
    if (source === 'Handshake') return h.includes('joinhandshake.com') || h.includes('handshake.com');
    if (source === 'Google') return h.includes('google.com') || h.includes('careers.google.com');
  } catch {
    return false;
  }
  return false;
}

/**
 * External apply link: prefer a URL that points at the job board (Handshake / LinkedIn / Indeed),
 * not only the employer's corporate careers site.
 */
export function getJobApplyUrl(job: Job): string {
  if (job.url?.trim()) {
    try {
      if (hostMatchesSource(job.url, job.source)) {
        return job.url;
      }
    } catch {
      /* fall through */
    }
  }

  const q = encodeURIComponent(`${job.title} ${job.company}`);
  const l = encodeURIComponent(job.location);

  switch (job.source) {
    case 'LinkedIn':
      return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;
    case 'Indeed':
      return `https://www.indeed.com/jobs?q=${q}&l=${l}`;
    case 'Handshake':
      return `https://joinhandshake.com/stu/jobs?q=${q}`;
    case 'Google':
      return `https://careers.google.com/jobs/results/?q=${encodeURIComponent(`${job.title} ${job.company}`)}`;
    default:
      return job.url?.trim() || `https://www.google.com/search?q=${q}`;
  }
}
