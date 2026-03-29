import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Target,
  ChevronRight,
  ChevronLeft,
  Linkedin,
  Mail,
  Lock,
  Sparkles,
  ArrowRight,
  Camera,
  Loader2
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  db,
  doc,
  setDoc,
  getDoc,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
  importLinkedInProfile,
  parseLinkedInProfileUrl,
  PrivateLinkedInProfileError
} from '../services/linkedin';
import type {
  Experience,
  Education,
  Project,
  ResearchPaper,
  VolunteerExperience,
  Certification
} from '../types';

const inputClass =
  'w-full p-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-sm';
const labelClass = 'text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 px-2 block mb-1';

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={labelClass}>
      {children}
    </label>
  );
}

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const navigate = useNavigate();
  const [view, setView] = useState<'hero' | 'auth' | 'onboarding'>('hero');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInNotice, setLinkedInNotice] = useState<{
    kind: 'ok-api' | 'scraped' | 'saved-url' | 'private';
  } | null>(null);
  const [skillDraft, setSkillDraft] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    photoURL: '',
    linkedInProfileUrl: '',
    experience: [] as Experience[],
    education: [] as Education[],
    projects: [] as Project[],
    researchPapers: [] as ResearchPaper[],
    volunteerExperience: [] as VolunteerExperience[],
    certifications: [] as Certification[],
    skills: [] as string[],
    preferences: {
      roles: [] as string[],
      workType: 'Remote' as 'In-person' | 'Remote' | 'Hybrid',
      radius: 25,
      basePay: 50000
    }
  });

  const [newExperience, setNewExperience] = useState<Experience>({
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  const [newEducation, setNewEducation] = useState<Education>({
    school: '',
    degree: '',
    major: '',
    graduationDate: ''
  });
  const [newProject, setNewProject] = useState<Project>({
    name: '',
    description: '',
    technologies: [],
    url: ''
  });
  const [techDraft, setTechDraft] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (profileSnap.exists()) {
        navigate('/');
        return;
      }
      setFormData((f) => ({
        ...f,
        fullName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || ''
      }));
      setView('onboarding');
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Login failed', err);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups and try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Check Firebase Console → Auth → Authorized domains.');
      } else if (error.code === 'auth/internal-error' || error.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled. Enable it in Firebase Console → Authentication.');
      } else {
        setError(error.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        setFormData((f) => ({ ...f, email }));
        setView('onboarding');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try logging in.');
      } else if (e.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (e.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(e.message || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePFPUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((f) => ({ ...f, photoURL: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleLinkedInImport = async () => {
    const url = formData.linkedInProfileUrl?.trim();
    if (url && !parseLinkedInProfileUrl(url)) {
      setError('Enter a valid LinkedIn profile URL (linkedin.com/in/…).');
      return;
    }
    setLinkedInLoading(true);
    setLinkedInNotice(null);
    try {
      const imported = await importLinkedInProfile(url || undefined);
      setFormData((f) => ({
        ...f,
        ...imported,
        experience: imported.experience?.length ? imported.experience : f.experience,
        education: imported.education?.length ? imported.education : f.education,
        projects: imported.projects?.length ? imported.projects : f.projects,
        researchPapers: imported.researchPapers?.length ? imported.researchPapers : f.researchPapers,
        volunteerExperience: imported.volunteerExperience?.length
          ? imported.volunteerExperience
          : f.volunteerExperience,
        certifications: imported.certifications?.length ? imported.certifications : f.certifications,
        skills: imported.skills?.length ? imported.skills : f.skills,
        linkedInProfileUrl: imported.linkedInProfileUrl || f.linkedInProfileUrl
      }));
      setError('');
      const enriched = !!(
        imported.experience?.length ||
        imported.skills?.length ||
        imported.fullName
      );
      setLinkedInNotice(
        import.meta.env.VITE_LINKEDIN_IMPORT_API?.trim()
          ? { kind: 'ok-api' }
          : enriched
            ? { kind: 'scraped' }
            : { kind: 'saved-url' }
      );
    } catch (e) {
      if (e instanceof PrivateLinkedInProfileError) {
        setLinkedInNotice({ kind: 'private' });
        setError('');
        return;
      }
      setError('Could not import LinkedIn data. Try again or skip.');
    } finally {
      setLinkedInLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!auth.currentUser) return;
    try {
      const normalized = formData.linkedInProfileUrl?.trim()
        ? parseLinkedInProfileUrl(formData.linkedInProfileUrl)
        : undefined;
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        ...formData,
        linkedInProfileUrl: normalized || formData.linkedInProfileUrl || '',
        email: auth.currentUser.email || formData.email
      });
      navigate('/');
    } catch (err) {
      console.error('Failed to save profile', err);
      setError('Could not save your profile. Check your connection and try again.');
    }
  };

  const handleSkip = () => {
    void handleComplete();
  };

  const pushSkill = (skill: string) => {
    const s = skill.trim();
    if (!s) return;
    setFormData((f) => ({ ...f, skills: [...f.skills, s] }));
    setSkillDraft('');
  };

  const steps = [
    {
      title: 'Personal Information',
      subtitle: "Let's get to know you better.",
      content: (
        <div className="space-y-4">
          <div>
            <FieldLabel htmlFor="onboarding-photo">Profile photo</FieldLabel>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-stone-100 overflow-hidden flex items-center justify-center text-stone-400">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} aria-hidden />
                )}
              </div>
              <label className="cursor-pointer text-sm font-bold text-emerald-600 hover:text-emerald-700">
                <input
                  id="onboarding-photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePFPUpload}
                />
                Upload photo
              </label>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="onboarding-fullName">Full name</FieldLabel>
            <input
              id="onboarding-fullName"
              type="text"
              autoComplete="name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className={inputClass}
              placeholder="Jane Doe"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="onboarding-phone">Phone</FieldLabel>
              <input
                id="onboarding-phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="onboarding-dob">Date of birth</FieldLabel>
              <input
                id="onboarding-dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="onboarding-address">Address</FieldLabel>
            <input
              id="onboarding-address"
              type="text"
              autoComplete="street-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="onboarding-linkedin">LinkedIn profile URL</FieldLabel>
            <input
              id="onboarding-linkedin"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://www.linkedin.com/in/your-profile"
              value={formData.linkedInProfileUrl}
              onChange={(e) => setFormData({ ...formData, linkedInProfileUrl: e.target.value })}
              className={inputClass}
            />
            <p className="text-xs text-stone-500 mt-2 px-2">
              Paste your public profile link. Optional: set <code className="text-stone-700">VITE_LINKEDIN_IMPORT_API</code>{' '}
              to a backend that returns profile JSON—otherwise the URL is saved and you add experience below.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Experience & background',
      subtitle: 'Import from LinkedIn or add entries manually.',
      content: (
        <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void handleLinkedInImport()}
              disabled={linkedInLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0077B5] text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-[#006097] disabled:opacity-60"
            >
              {linkedInLoading ? <Loader2 className="animate-spin" size={20} /> : <Linkedin size={20} aria-hidden />}
              {linkedInLoading ? 'Importing…' : 'Save URL / import'}
            </button>
          </div>
          {linkedInNotice && (
            <div
              role="status"
              className={`text-sm rounded-xl p-4 border ${
                linkedInNotice.kind === 'ok-api'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : linkedInNotice.kind === 'scraped'
                    ? 'bg-sky-50 border-sky-200 text-sky-950'
                    : linkedInNotice.kind === 'private'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
              }`}
            >
              {linkedInNotice.kind === 'ok-api'
                ? 'Profile fields were updated from your import API. You can edit everything below.'
                : linkedInNotice.kind === 'scraped'
                  ? 'Imported public fields from your LinkedIn page (server scrape). Review and edit below.'
                  : linkedInNotice.kind === 'private'
                    ? 'This profile looks private or not visible to our import. Set it to public and try again, or add experience manually.'
                    : 'Your LinkedIn URL is saved. If nothing imported, LinkedIn may have blocked access—add experience and skills below.'}
            </div>
          )}

          <section aria-labelledby="onboarding-exp-heading">
            <h3 id="onboarding-exp-heading" className="text-sm font-bold text-stone-800 mb-2">
              Experience
            </h3>
            {formData.experience.map((exp, i) => (
              <div key={exp.id || i} className="text-sm border border-stone-100 rounded-xl p-3 mb-2">
                <p className="font-bold">{exp.role}</p>
                <p className="text-emerald-700">{exp.company}</p>
                <p className="text-stone-400 text-xs">
                  {exp.startDate} – {exp.endDate}
                </p>
              </div>
            ))}
            <div className="grid gap-2 bg-stone-50 p-3 rounded-xl">
              <FieldLabel htmlFor="exp-company">Company</FieldLabel>
              <input
                id="exp-company"
                className={inputClass}
                value={newExperience.company}
                onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
              />
              <FieldLabel htmlFor="exp-role">Role</FieldLabel>
              <input
                id="exp-role"
                className={inputClass}
                value={newExperience.role}
                onChange={(e) => setNewExperience({ ...newExperience, role: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel htmlFor="exp-start">Start (YYYY-MM)</FieldLabel>
                  <input
                    id="exp-start"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="2023-06"
                    className={inputClass}
                    value={newExperience.startDate}
                    onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="exp-end">End (YYYY-MM)</FieldLabel>
                  <input
                    id="exp-end"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="2024-01"
                    className={inputClass}
                    value={newExperience.endDate}
                    onChange={(e) => setNewExperience({ ...newExperience, endDate: e.target.value })}
                  />
                </div>
              </div>
              <FieldLabel htmlFor="exp-desc">Description</FieldLabel>
              <textarea
                id="exp-desc"
                className={`${inputClass} min-h-[80px]`}
                value={newExperience.description}
                onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
              />
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm"
                onClick={() => {
                  if (!newExperience.company.trim() || !newExperience.role.trim()) return;
                  setFormData((f) => ({
                    ...f,
                    experience: [...f.experience, { ...newExperience, id: newId() }]
                  }));
                  setNewExperience({
                    company: '',
                    role: '',
                    startDate: '',
                    endDate: '',
                    description: ''
                  });
                }}
              >
                Add experience
              </button>
            </div>
          </section>

          <section aria-labelledby="onboarding-edu-heading">
            <h3 id="onboarding-edu-heading" className="text-sm font-bold text-stone-800 mb-2">
              Education
            </h3>
            {formData.education.map((edu, i) => (
              <div key={edu.id || i} className="text-sm border border-stone-100 rounded-xl p-3 mb-2">
                <p className="font-bold">{edu.school}</p>
                <p>
                  {edu.degree} — {edu.major} ({edu.graduationDate})
                </p>
              </div>
            ))}
            <div className="grid gap-2 bg-stone-50 p-3 rounded-xl">
              <FieldLabel htmlFor="edu-school">School</FieldLabel>
              <input
                id="edu-school"
                className={inputClass}
                value={newEducation.school}
                onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })}
              />
              <FieldLabel htmlFor="edu-degree">Degree</FieldLabel>
              <input
                id="edu-degree"
                className={inputClass}
                value={newEducation.degree}
                onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
              />
              <FieldLabel htmlFor="edu-major">Major</FieldLabel>
              <input
                id="edu-major"
                className={inputClass}
                value={newEducation.major}
                onChange={(e) => setNewEducation({ ...newEducation, major: e.target.value })}
              />
              <FieldLabel htmlFor="edu-grad">Graduation (YYYY-MM)</FieldLabel>
              <input
                id="edu-grad"
                type="text"
                inputMode="numeric"
                placeholder="2025-05"
                className={inputClass}
                value={newEducation.graduationDate}
                onChange={(e) => setNewEducation({ ...newEducation, graduationDate: e.target.value })}
              />
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm"
                onClick={() => {
                  if (!newEducation.school.trim()) return;
                  setFormData((f) => ({
                    ...f,
                    education: [...f.education, { ...newEducation, id: newId() }]
                  }));
                  setNewEducation({ school: '', degree: '', major: '', graduationDate: '' });
                }}
              >
                Add education
              </button>
            </div>
          </section>

          <section aria-labelledby="onboarding-proj-heading">
            <h3 id="onboarding-proj-heading" className="text-sm font-bold text-stone-800 mb-2">
              Projects
            </h3>
            {formData.projects.map((p, i) => (
              <div key={p.id || i} className="text-sm border border-stone-100 rounded-xl p-3 mb-2">
                <p className="font-bold">{p.name}</p>
                <p className="text-stone-600">{p.description}</p>
              </div>
            ))}
            <div className="grid gap-2 bg-stone-50 p-3 rounded-xl">
              <FieldLabel htmlFor="proj-name">Project name</FieldLabel>
              <input
                id="proj-name"
                className={inputClass}
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              />
              <FieldLabel htmlFor="proj-desc">Description</FieldLabel>
              <textarea
                id="proj-desc"
                className={`${inputClass} min-h-[72px]`}
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              />
              <FieldLabel htmlFor="proj-url">URL</FieldLabel>
              <input
                id="proj-url"
                type="url"
                className={inputClass}
                value={newProject.url || ''}
                onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
              />
              <FieldLabel htmlFor="proj-tech">Technologies (comma-separated)</FieldLabel>
              <input
                id="proj-tech"
                className={inputClass}
                value={techDraft}
                onChange={(e) => setTechDraft(e.target.value)}
                onBlur={() => {
                  const techs = techDraft
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                  setNewProject({ ...newProject, technologies: techs });
                }}
              />
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm"
                onClick={() => {
                  const techs = techDraft
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                  if (!newProject.name.trim()) return;
                  setFormData((f) => ({
                    ...f,
                    projects: [...f.projects, { ...newProject, id: newId(), technologies: techs.length ? techs : newProject.technologies }]
                  }));
                  setNewProject({ name: '', description: '', technologies: [], url: '' });
                  setTechDraft('');
                }}
              >
                Add project
              </button>
            </div>
          </section>

          <div>
            <FieldLabel htmlFor="onboarding-skills">Skills</FieldLabel>
            <input
              id="onboarding-skills"
              type="text"
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  pushSkill(skillDraft);
                }
              }}
              className={inputClass}
              placeholder="e.g. Python — press Enter to add"
            />
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.skills.map((skill, i) => (
                <span
                  key={`${skill}-${i}`}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 border border-dashed border-stone-200 rounded-2xl text-stone-500 text-xs">
            <GraduationCap className="inline mr-1 mb-1" size={14} aria-hidden />
            Research, volunteering, and certifications can be added later under Account, or import them with LinkedIn
            import when your API is connected.
          </div>
        </div>
      )
    },
    {
      title: 'Job preferences',
      subtitle: 'What are you looking for?',
      content: (
        <div className="space-y-8">
          <div className="space-y-3">
            <span id="work-type-label" className={labelClass}>
              Work type
            </span>
            <div className="grid grid-cols-3 gap-3" role="group" aria-labelledby="work-type-label">
              {(['In-person', 'Remote', 'Hybrid'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, workType: type }
                    })
                  }
                  className={`p-4 rounded-2xl text-sm font-bold border transition-all ${
                    formData.preferences.workType === type
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-500'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <FieldLabel htmlFor="pref-pay">Base pay (min annual)</FieldLabel>
            <div className="flex justify-between text-sm text-emerald-600 font-bold px-2">
              <span className="sr-only">Current value</span>
              <span aria-hidden>${formData.preferences.basePay.toLocaleString()}</span>
            </div>
            <input
              id="pref-pay"
              type="range"
              min={30000}
              max={200000}
              step={5000}
              value={formData.preferences.basePay}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  preferences: { ...formData.preferences, basePay: parseInt(e.target.value, 10) }
                })
              }
              className="w-full accent-emerald-600"
              aria-valuemin={30000}
              aria-valuemax={200000}
              aria-valuenow={formData.preferences.basePay}
            />
          </div>

          <div className="space-y-3">
            <FieldLabel htmlFor="pref-radius">Search radius (miles)</FieldLabel>
            <input
              id="pref-radius"
              type="number"
              min={1}
              value={formData.preferences.radius}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  preferences: {
                    ...formData.preferences,
                    radius: parseInt(e.target.value, 10) || 1
                  }
                })
              }
              className={`${inputClass} font-bold`}
            />
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  if (view === 'hero') {
    return (
      <div className="min-h-screen bg-stone-50 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 bg-indigo-100/50 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-20 pb-32 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full mb-8"
          >
            <Sparkles size={16} className="text-emerald-600" aria-hidden />
            <span className="text-emerald-700 text-sm font-bold tracking-wide uppercase">AI-Powered Career Growth</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-stone-900 tracking-tighter leading-[0.9] mb-8"
          >
            YOUR FUTURE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-indigo-600">
              ACCELERATED.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl text-xl text-stone-500 mb-12 leading-relaxed"
          >
            CareerPath AI uses advanced intelligence to match your unique skills with the world's best opportunities.
            Stop searching, start growing.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <button
              type="button"
              onClick={() => setView('auth')}
              className="group relative bg-stone-900 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-2xl shadow-stone-200 flex items-center space-x-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              <span className="relative">Get Started Free</span>
              <ArrowRight className="relative group-hover:translate-x-1 transition-transform" size={20} aria-hidden />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-stone-100 overflow-hidden p-10"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-stone-900 tracking-tight mb-2">
              {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-stone-500">
              {authMode === 'signup' ? 'Start your AI-powered career journey.' : 'Log in to continue your progress.'}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 bg-white border border-stone-200 p-4 rounded-2xl hover:bg-stone-50 transition-all font-bold text-stone-700 shadow-sm disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
              <span>Continue with Google</span>
            </button>
            <div className="flex items-center space-x-4">
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-stone-300 text-xs font-bold uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <FieldLabel htmlFor="auth-email">Email</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} aria-hidden />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="auth-password">Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} aria-hidden />
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-xs font-medium px-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 disabled:opacity-50"
            >
              {loading ? 'Processing…' : authMode === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
              className="text-stone-500 text-sm font-bold hover:text-emerald-600 transition-colors"
            >
              {authMode === 'signup' ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-stone-100 overflow-hidden"
      >
        <div className="p-12">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-black text-stone-900 tracking-tight mb-2">{currentStep.title}</h1>
              <p className="text-stone-500 font-medium">{currentStep.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="text-stone-300 hover:text-stone-500 text-xs font-black uppercase tracking-widest transition-colors"
            >
              Skip
            </button>
          </div>

          {error && step === 1 && <p className="text-red-500 text-sm mb-4 px-1">{error}</p>}
          {currentStep.content}

          <div className="mt-12 flex items-center justify-between">
            <button
              type="button"
              onClick={() => (step > 0 ? setStep(step - 1) : setView('auth'))}
              className="flex items-center space-x-2 text-stone-400 font-bold hover:text-stone-900 transition-colors"
            >
              <ChevronLeft size={20} aria-hidden />
              <span>Back</span>
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center space-x-3 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all"
              >
                <span>Continue</span>
                <ChevronRight size={20} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleComplete()}
                className="flex items-center space-x-3 bg-stone-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-stone-800 shadow-xl shadow-stone-200 transition-all"
              >
                <span>Launch Career</span>
                <Target size={20} aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="h-2 bg-stone-50 w-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500"
          />
        </div>
      </motion.div>
    </div>
  );
}
