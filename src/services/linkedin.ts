import { UserProfile } from '../types';

const rid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Demo data used when no backend LinkedIn import is configured. */
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
    // LinkedIn uses regional hosts (e.g. uk.linkedin.com, br.linkedin.com) and www.linkedin.com
    const isLinkedIn =
      host === 'linkedin.com' || host.endsWith('.linkedin.com');
    if (!isLinkedIn) return null;
    if (!u.pathname.includes('/in/')) return null;
    u.hash = '';
    u.search = '';
    // Normalize to www host for storage consistency
    u.hostname = 'www.linkedin.com';
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

type ScrapePayload = {
  fullName?: string;
  headline?: string;
  about?: string;
  experience?: Array<{
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  skills?: string[];
  error?: string;
};

function mapScrapeToProfile(data: ScrapePayload, normalized: string): Partial<UserProfile> {
  const next: Partial<UserProfile> = { linkedInProfileUrl: normalized };
  if (data.fullName?.trim()) next.fullName = data.fullName.trim();
  if (data.experience?.length) {
    next.experience = data.experience.map((e) => ({
      ...e,
      id: e.id || rid()
    }));
  }
  if (data.skills?.length) {
    next.skills = data.skills;
  }
  return next;
}

async function fetchServerScrape(normalized: string): Promise<Partial<UserProfile> | null> {
  try {
    const res = await fetch('/api/linkedin-scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileUrl: normalized })
    });
    const data = (await res.json()) as ScrapePayload;
    if (!res.ok || data.error) {
      return null;
    }
    const mapped = mapScrapeToProfile(data, normalized);
    if (mapped.fullName || mapped.experience?.length || mapped.skills?.length) {
      return mapped;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Imports profile-shaped data: optional `VITE_LINKEDIN_IMPORT_API`, then dev-server
 * `POST /api/linkedin-scrape` (HTML metadata / embedded JSON). LinkedIn may block or login-wall requests.
 */
export async function importLinkedInProfile(
  linkedInUrl?: string | null
): Promise<Partial<UserProfile>> {
  const normalized = linkedInUrl ? parseLinkedInProfileUrl(linkedInUrl) : null;
  const importEndpoint = (import.meta.env.VITE_LINKEDIN_IMPORT_API as string | undefined)?.trim();

  if (importEndpoint && normalized) {
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

  if (normalized) {
    const scraped = await fetchServerScrape(normalized);
    if (scraped) {
      return scraped;
    }
    return { linkedInProfileUrl: normalized };
  }
  return {};
}
