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
  skills?: string[];
  preferences?: JobPreferences;
}

export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  graduationDate: string;
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
  source: string;
  pay?: string;
  postedDate: string;
}

export interface UserJob {
  jobId: string;
  status: 'saved' | 'applied';
  savedAt: string;
  resumeId?: string;
  coverLetterId?: string;
}

export interface UserDocument {
  id: string;
  type: 'resume' | 'cover-letter' | 'transcript';
  content: string;
  createdAt: string;
  jobId?: string;
}
