export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  dob?: string;
  experience?: Experience[];
  education?: Education[];
  projects?: Project[];
  researchPapers?: ResearchPaper[];
  volunteerExperience?: VolunteerExperience[];
  skills?: string[];
  preferences?: JobPreferences;
}

export interface Experience {
  id?: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id?: string;
  school: string;
  degree: string;
  major: string;
  graduationDate: string;
}

export interface Project {
  id?: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
}

export interface ResearchPaper {
  id?: string;
  title: string;
  abstract: string;
  publishedDate?: string;
  journal?: string;
  url?: string;
}

export interface VolunteerExperience {
  id?: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface JobPreferences {
  roles: string[];
  workType: 'In-person' | 'Remote' | 'Hybrid';
  radius: number;
  basePay: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  source: 'Handshake' | 'LinkedIn' | 'Indeed';
  pay?: string;
  postedDate: string;
  workType?: 'In-person' | 'Remote' | 'Hybrid';
  requirements?: string[];
}

export interface UserJob {
  jobId: string;
  status: 'saved' | 'applied';
  savedAt: string;
  jobData: Job;
  resumeId?: string;
  coverLetterId?: string;
}

export interface UserDocument {
  id: string;
  type: 'resume' | 'cover-letter' | 'transcript';
  name: string;
  content: string;
  createdAt: string;
  jobId?: string;
  jobTitle?: string;
}
