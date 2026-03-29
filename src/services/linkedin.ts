import { UserProfile } from '../types';

const rid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Thrown when Relevance AI / server detects a private or non-public LinkedIn profile. */
export class PrivateLinkedInProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrivateLinkedInProfileError';
  }
}

/** Demo data for tests only. */
export function importLinkedInData(): Partial<UserProfile> {
  return {
    experience: [
      {
        id: rid(),
        company: 'Tech Company A',
        role: 'Software Engineer Intern',
        startDate: '2023-06',
        endDate: '2023-12',
        description:
          'Developed full-stack features using React and Node.js. Collaborated with cross-functional teams on product launches.'
      }
    ],
    education: [
      {
        id: rid(),
        school: 'State University',
        degree: 'BS',
        major: 'Computer Science',
        graduationDate: '2024-05'
      }
    ],
    projects: [
      {
        id: rid(),
        name: 'AI Chat Application',
        description:
          'Built a real-time chat application using WebSockets and Machine Learning for sentiment analysis.',
        technologies: ['React', 'Node.js', 'TensorFlow'],
        url: 'https://github.com/example/ai-chat'
      }
    ],
    researchPapers: [
      {
        id: rid(),
        title: 'Efficient routing in mesh networks',
        abstract: 'Survey of modern approaches.',
        journal: 'Demo Journal',
        url: 'https://example.org/paper'
      }
    ],
    volunteerExperience: [
      {
        id: rid(),
        organization: 'Code for Good',
        role: 'Mentor',
        startDate: '2022-01',
        endDate: '2023-06',
        description: 'Mentored students in web development.'
      }
    ],
    certifications: [
      {
        id: rid(),
        name: 'AWS Cloud Practitioner',
        issuingOrganization: 'Amazon Web Services',
        issueDate: '2023-08',
        credentialUrl: 'https://www.credly.com/'
      }
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'Machine Learning', 'AWS']
  };
}

export function parseLinkedInProfileUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withScheme);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const isLinkedIn =
      host === 'linkedin.com' || host.endsWith('.linkedin.com');
    if (!isLinkedIn) return null;
    if (!u.pathname.includes('/in/')) return null;
    u.hash = '';
    u.search = '';
    u.hostname = 'www.linkedin.com';
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * Imports profile data: optional legacy `VITE_LINKEDIN_IMPORT_API`, then
 * `POST /api/linkedin-import` (Relevance AI + HTML fallback on the server).
 */
export async function importLinkedInProfile(
  linkedInUrl?: string | null
): Promise<Partial<UserProfile>> {
  const normalized = linkedInUrl ? parseLinkedInProfileUrl(linkedInUrl) : null;
  if (!normalized) return {};

  const importEndpoint = (import.meta.env.VITE_LINKEDIN_IMPORT_API as string | undefined)?.trim();

  if (importEndpoint) {
    try {
      const res = await fetch(importEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUrl: normalized })
      });
      if (res.ok) {
        const data = (await res.json()) as Partial<UserProfile>;
        return {
          ...data,
          linkedInProfileUrl: normalized
        };
      }
      console.warn('LinkedIn import API returned', res.status, await res.text().catch(() => ''));
    } catch (e) {
      console.warn('LinkedIn import API failed.', e);
    }
  }

  const res = await fetch('/api/linkedin-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileUrl: normalized })
  });

  if (res.status === 403) {
    const j = (await res.json()) as { error?: string };
    throw new PrivateLinkedInProfileError(
      j.error ||
        'This LinkedIn profile appears to be private or not visible to import tools.'
    );
  }

  if (res.status === 422) {
    const j = (await res.json()) as { linkedInProfileUrl?: string; error?: string };
    return { linkedInProfileUrl: j.linkedInProfileUrl || normalized };
  }

  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || `Import failed (${res.status})`);
  }

  return (await res.json()) as Partial<UserProfile>;
}
