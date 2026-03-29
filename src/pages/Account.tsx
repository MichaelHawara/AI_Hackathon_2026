import { useState, useEffect, useId } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Award, BookOpen, Settings, Save, Linkedin, X, LogOut, Code, FlaskConical, Heart, Star, Loader2, FileUp } from 'lucide-react';
import { db, auth, doc, getDoc, updateDoc, signOut } from '../firebase';
import { UserProfile, Experience, Education, Project, ResearchPaper, VolunteerExperience, Certification } from '../types';
import {
  importLinkedInProfile,
  parseLinkedInProfileUrl,
  PrivateLinkedInProfileError
} from '../services/linkedin';
import EditableSection from '../components/EditableSection';
import { extractTextFromPdfFile } from '../utils/extractPdfText';
import { parseResumeToProfile, formatGeminiError } from '../services/gemini';

const inputClass = 'w-full p-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
const labelClass = 'text-xs font-bold text-stone-600 block mb-1';

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

export default function Account() {
  const baseId = useId();
  const f = (name: string) => `${baseId}-${name}`;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInNotice, setLinkedInNotice] = useState<{
    kind: 'ok-api' | 'scraped' | 'saved-url' | 'private' | 'relevance-failed';
    detail?: string;
  } | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<string | null>(null);

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
  const [newProject, setNewProject] = useState<Project>({ name: '', description: '', technologies: [], url: '' });
  const [projectTechDraft, setProjectTechDraft] = useState('');
  const [newResearch, setNewResearch] = useState<ResearchPaper>({ title: '', abstract: '', journal: '', url: '' });
  const [newVolunteer, setNewVolunteer] = useState<VolunteerExperience>({
    organization: '',
    role: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  const [newCertification, setNewCertification] = useState<Certification>({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expirationDate: '',
    credentialId: '',
    credentialUrl: ''
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ uid: auth.currentUser.uid, ...docSnap.data() } as UserProfile);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    if (!auth.currentUser || !profile) return;
    setSaving(true);
    try {
      const { uid, ...data } = profile;
      const rawUrl = data.linkedInProfileUrl?.trim();
      const payload = { ...data };
      if (rawUrl) {
        payload.linkedInProfileUrl = parseLinkedInProfileUrl(rawUrl) || rawUrl;
      }
      await updateDoc(doc(db, 'users', auth.currentUser.uid), payload);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Update failed', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF resume.');
      return;
    }
    setResumeLoading(true);
    setResumeNotice(null);
    try {
      const text = await extractTextFromPdfFile(file);
      if (!text || text.length < 40) {
        alert('Could not read enough text from this PDF. Try another file or paste your resume into a new PDF.');
        setResumeLoading(false);
        return;
      }
      const parsed = await parseResumeToProfile(text);
      const mergeExp = (parsed.experience ?? []).map((ex) => ({
        ...ex,
        id: ex.id || newId()
      }));
      const mergeEdu = (parsed.education ?? []).map((ed) => ({
        ...ed,
        id: ed.id || newId()
      }));
      const mergeProj = (parsed.projects ?? []).map((p) => ({
        ...p,
        id: p.id || newId(),
        technologies: p.technologies ?? []
      }));
      const mergeCert = (parsed.certifications ?? []).map((c) => ({
        ...c,
        id: c.id || newId()
      }));
      setProfile({
        ...profile,
        fullName: parsed.fullName?.trim() || profile.fullName,
        phone: parsed.phone?.trim() || profile.phone,
        address: parsed.address?.trim() || profile.address,
        skills:
          parsed.skills?.length && (parsed.skills?.length ?? 0) > 0
            ? [...new Set([...(profile.skills ?? []), ...parsed.skills!])]
            : profile.skills,
        experience: mergeExp.length ? [...(profile.experience ?? []), ...mergeExp] : profile.experience,
        education: mergeEdu.length ? [...(profile.education ?? []), ...mergeEdu] : profile.education,
        projects: mergeProj.length ? [...(profile.projects ?? []), ...mergeProj] : profile.projects,
        certifications: mergeCert.length ? [...(profile.certifications ?? []), ...mergeCert] : profile.certifications
      });
      setResumeNotice(
        'Resume parsed with AI — review all fields for accuracy before saving. We never invent data intentionally, but models can misread formatting.'
      );
    } catch (err) {
      alert(`Resume import failed: ${formatGeminiError(err)}`);
    } finally {
      setResumeLoading(false);
    }
  };

  const handleLinkedInImport = async () => {
    if (!profile) return;
    const url = profile.linkedInProfileUrl?.trim();
    if (url && !parseLinkedInProfileUrl(url)) {
      alert('Enter a valid LinkedIn profile URL (linkedin.com/in/…).');
      return;
    }
    setLinkedInLoading(true);
    setLinkedInNotice(null);
    try {
      const imported = await importLinkedInProfile(url || undefined);
      const { importHint, ...importedRest } = imported;
      setProfile({
        ...profile,
        ...importedRest,
        experience: importedRest.experience?.length ? importedRest.experience : profile.experience,
        education: importedRest.education?.length ? importedRest.education : profile.education,
        projects: importedRest.projects?.length ? importedRest.projects : profile.projects,
        researchPapers: importedRest.researchPapers?.length ? importedRest.researchPapers : profile.researchPapers,
        volunteerExperience: importedRest.volunteerExperience?.length
          ? importedRest.volunteerExperience
          : profile.volunteerExperience,
        certifications: importedRest.certifications?.length ? importedRest.certifications : profile.certifications,
        skills: importedRest.skills?.length ? importedRest.skills : profile.skills,
        linkedInProfileUrl: importedRest.linkedInProfileUrl || profile.linkedInProfileUrl
      });
      const enriched = !!(
        importedRest.experience?.length ||
        importedRest.skills?.length ||
        importedRest.fullName
      );
      if (importHint) {
        setLinkedInNotice({
          kind: 'relevance-failed',
          detail: importHint,
        });
      } else {
        setLinkedInNotice(
          import.meta.env.VITE_LINKEDIN_IMPORT_API?.trim()
            ? { kind: 'ok-api' }
            : enriched
              ? { kind: 'scraped' }
              : { kind: 'saved-url' }
        );
      }
    } catch (e) {
      if (e instanceof PrivateLinkedInProfileError) {
        setLinkedInNotice({ kind: 'private' });
        return;
      }
      const msg = e instanceof Error && e.message ? e.message : 'Import failed. Try again.';
      alert(msg);
    } finally {
      setLinkedInLoading(false);
    }
  };

  const handleAddItem = (section: keyof UserProfile, data: unknown) => {
    if (!profile) return;
    if (section === 'skills') {
      const s = typeof data === 'string' ? data.trim() : '';
      if (!s) return;
      setProfile({
        ...profile,
        skills: [...(profile.skills || []), s]
      });
      setNewSkill('');
      setShowAdd(null);
      return;
    }
    const row = data as Record<string, unknown>;
    const withId = { ...row, id: (row.id as string) || newId() };
    const key = section as string;
    const currentItems = (profile as unknown as Record<string, unknown>)[key];
    const arr = Array.isArray(currentItems) ? currentItems : [];
    setProfile({
      ...profile,
      [key]: [...arr, withId]
    } as UserProfile);
    setShowAdd(null);
    if (section === 'experience') {
      setNewExperience({ company: '', role: '', startDate: '', endDate: '', description: '' });
    } else if (section === 'education') {
      setNewEducation({ school: '', degree: '', major: '', graduationDate: '' });
    } else if (section === 'projects') {
      setNewProject({ name: '', description: '', technologies: [], url: '' });
      setProjectTechDraft('');
    } else if (section === 'researchPapers') {
      setNewResearch({ title: '', abstract: '', journal: '', url: '' });
    } else if (section === 'volunteerExperience') {
      setNewVolunteer({ organization: '', role: '', startDate: '', endDate: '', description: '' });
    } else if (section === 'certifications') {
      setNewCertification({
        name: '',
        issuingOrganization: '',
        issueDate: '',
        expirationDate: '',
        credentialId: '',
        credentialUrl: ''
      });
    }
  };

  const handleRemoveAt = (section: keyof UserProfile, index: number) => {
    if (!profile) return;
    const key = section as string;
    const currentItems = (profile as unknown as Record<string, unknown>)[key];
    if (!Array.isArray(currentItems)) return;
    const next = currentItems.filter((_, i) => i !== index);
    setProfile({ ...profile, [key]: next } as UserProfile);
  };

  const cancelAdd = () => {
    setShowAdd(null);
  };

  if (loading) {
    return <div className="animate-pulse space-y-8"><div className="h-40 bg-stone-200 rounded-3xl" /></div>;
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-3xl border border-stone-100 text-center text-stone-600">
        <p className="mb-4">No profile found. Complete onboarding or sign in again.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="text-emerald-600 font-bold"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">My Profile</h1>
        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleUpdate()}
            disabled={saving}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            <Save size={18} aria-hidden />
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
          >
            <LogOut size={18} aria-hidden />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-stone-100 rounded-full mx-auto mb-4 flex items-center justify-center text-stone-300">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={48} aria-hidden />
              )}
            </div>
            <h2 className="font-bold text-xl text-stone-900">{profile.fullName}</h2>
            <p className="text-stone-400 text-sm mb-4">{profile.email}</p>

            <div className="text-left space-y-2 mb-3">
              <FieldLabel htmlFor={f('linkedin-url')}>LinkedIn profile URL</FieldLabel>
              <input
                id={f('linkedin-url')}
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://www.linkedin.com/in/…"
                value={profile.linkedInProfileUrl || ''}
                onChange={(e) => setProfile({ ...profile, linkedInProfileUrl: e.target.value })}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleLinkedInImport()}
              disabled={linkedInLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#0077B5] text-white p-3 rounded-xl text-sm font-bold hover:bg-[#006097] transition-colors disabled:opacity-60"
            >
              {linkedInLoading ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Linkedin size={18} aria-hidden />}
              {linkedInLoading ? 'Importing…' : 'Save URL / import'}
            </button>
            {linkedInNotice && (
              <div
                role="status"
                className={`mt-3 text-left text-xs rounded-xl p-3 border ${
                  linkedInNotice.kind === 'ok-api'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : linkedInNotice.kind === 'scraped'
                      ? 'bg-sky-50 border-sky-200 text-sky-950'
                      : linkedInNotice.kind === 'private'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : linkedInNotice.kind === 'relevance-failed'
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}
              >
                <div className="flex justify-between gap-2">
                  <p className="leading-snug pr-2">
                    {linkedInNotice.kind === 'ok-api'
                      ? 'Profile fields were updated from your import API.'
                      : linkedInNotice.kind === 'scraped'
                        ? 'Imported public fields from your LinkedIn page via the dev server (metadata may be partial). Review and edit below.'
                        : linkedInNotice.kind === 'private'
                          ? 'Your LinkedIn profile looks private or not visible to our import tool. Set your profile to public (or use a public profile URL) and try again.'
                          : linkedInNotice.kind === 'relevance-failed'
                            ? `Relevance AI or scrape step did not return usable profile data. ${linkedInNotice.detail ?? ''} Set RELEVANCEAI_WEBHOOK_URL and RELEVANCEAI_API_KEY in .env.local to your Relevance studio (see .env.example), restart the server, and ensure your tool returns JSON with name/experience/skills.`
                            : 'Your LinkedIn URL is saved. If import was empty, LinkedIn may have blocked automated access—add experience and skills manually, or set VITE_LINKEDIN_IMPORT_API.'}
                  </p>
                  <button
                    type="button"
                    className="text-stone-500 hover:text-stone-800 shrink-0 font-bold"
                    onClick={() => setLinkedInNotice(null)}
                    aria-label="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
            <p className="text-[10px] text-stone-400 mt-2 leading-snug">
              Paste your public profile URL. Optional: point VITE_LINKEDIN_IMPORT_API at a server that returns profile JSON.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm text-left">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
              <FileUp size={16} aria-hidden />
              Resume → profile (AI)
            </h3>
            <p className="text-xs text-stone-500 mb-3 leading-snug">
              Upload a PDF resume. We extract text in your browser, then Gemini structures it into your profile. Review and edit before saving.
            </p>
            <label className="flex flex-col gap-2">
              <span className="sr-only">Upload resume PDF</span>
              <input
                type="file"
                accept="application/pdf"
                disabled={resumeLoading}
                onChange={(ev) => void handleResumeUpload(ev)}
                className="text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-bold hover:file:bg-emerald-700"
              />
            </label>
            {resumeLoading && (
              <p className="text-xs text-emerald-700 font-bold mt-2 flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} aria-hidden />
                Parsing resume…
              </p>
            )}
            {resumeNotice && (
              <p className="text-xs text-stone-600 mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100">{resumeNotice}</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-4">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-widest">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center text-stone-600 text-sm">
                <Mail size={16} className="mr-3 text-stone-400 shrink-0" aria-hidden />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-start gap-2 text-stone-600 text-sm">
                <Phone size={16} className="mr-1 text-stone-400 shrink-0 mt-0.5" aria-hidden />
                <span className="flex-1">
                  <FieldLabel htmlFor={f('phone')}>Phone</FieldLabel>
                  <input
                    id={f('phone')}
                    type="tel"
                    autoComplete="tel"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className={inputClass}
                  />
                </span>
              </div>
              <div className="flex items-start gap-2 text-stone-600 text-sm">
                <MapPin size={16} className="mr-1 text-stone-400 shrink-0 mt-0.5" aria-hidden />
                <span className="flex-1">
                  <FieldLabel htmlFor={f('address')}>Address</FieldLabel>
                  <input
                    id={f('address')}
                    type="text"
                    autoComplete="street-address"
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className={inputClass}
                  />
                </span>
              </div>
              <div className="flex items-start gap-2 text-stone-600 text-sm">
                <Calendar size={16} className="mr-1 text-stone-400 shrink-0 mt-0.5" aria-hidden />
                <span className="flex-1">
                  <FieldLabel htmlFor={f('dob')}>Date of birth</FieldLabel>
                  <input
                    id={f('dob')}
                    type="date"
                    value={profile.dob || ''}
                    onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                    className={inputClass}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <EditableSection title="Experience" icon={<Award className="text-emerald-600" size={24} />} onAdd={() => setShowAdd('experience')}>
            {profile.experience?.length ? (
              profile.experience.map((exp, i) => (
                <div key={exp.id || i} className="relative pl-6 border-l-2 border-stone-100 group">
                  <button
                    type="button"
                    onClick={() => handleRemoveAt('experience', i)}
                    className="absolute right-0 top-0 p-1 text-stone-300 hover:text-red-600"
                    aria-label={`Remove experience ${exp.role} at ${exp.company}`}
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-emerald-500 rounded-full" />
                  <h4 className="font-bold text-stone-900 pr-8">{exp.role}</h4>
                  <p className="text-emerald-600 text-sm font-medium">{exp.company}</p>
                  <p className="text-stone-400 text-xs mb-2">
                    {exp.startDate} – {exp.endDate}
                  </p>
                  <p className="text-stone-600 text-sm">{exp.description}</p>
                </div>
              ))
            ) : (
              <p className="text-stone-400 text-sm italic">No experience added yet.</p>
            )}
            {showAdd === 'experience' && (
              <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                <h4 className="font-bold mb-2">Add experience</h4>
                <FieldLabel htmlFor={f('exp-co')}>Company</FieldLabel>
                <input id={f('exp-co')} className={inputClass} value={newExperience.company} onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })} />
                <FieldLabel htmlFor={f('exp-role')}>Role</FieldLabel>
                <input id={f('exp-role')} className={inputClass} value={newExperience.role} onChange={(e) => setNewExperience({ ...newExperience, role: e.target.value })} />
                <FieldLabel htmlFor={f('exp-start')}>Start (YYYY-MM)</FieldLabel>
                <input
                  id={f('exp-start')}
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={newExperience.startDate}
                  onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })}
                />
                <FieldLabel htmlFor={f('exp-end')}>End (YYYY-MM)</FieldLabel>
                <input
                  id={f('exp-end')}
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={newExperience.endDate}
                  onChange={(e) => setNewExperience({ ...newExperience, endDate: e.target.value })}
                />
                <FieldLabel htmlFor={f('exp-desc')}>Description</FieldLabel>
                <textarea
                  id={f('exp-desc')}
                  className={`${inputClass} min-h-[80px]`}
                  value={newExperience.description}
                  onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddItem('experience', newExperience)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Save
                  </button>
                  <button type="button" onClick={cancelAdd} className="px-4 py-2 rounded-lg text-sm font-bold text-stone-600 border border-stone-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </EditableSection>

          <EditableSection title="Education" icon={<BookOpen className="text-emerald-600" size={24} />} onAdd={() => setShowAdd('education')}>
            {profile.education?.length ? (
              profile.education.map((edu, i) => (
                <div key={edu.id || i} className="flex justify-between items-start gap-2 group">
                  <div>
                    <h4 className="font-bold text-stone-900">{edu.school}</h4>
                    <p className="text-stone-600 text-sm">
                      {edu.degree} in {edu.major}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-stone-400 text-xs font-medium">{edu.graduationDate}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAt('education', i)}
                      className="p-1 text-stone-300 hover:text-red-600"
                      aria-label={`Remove education ${edu.school}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-stone-400 text-sm italic">No education added yet.</p>
            )}
            {showAdd === 'education' && (
              <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                <h4 className="font-bold mb-2">Add education</h4>
                <FieldLabel htmlFor={f('edu-school')}>School</FieldLabel>
                <input id={f('edu-school')} className={inputClass} value={newEducation.school} onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })} />
                <FieldLabel htmlFor={f('edu-deg')}>Degree</FieldLabel>
                <input id={f('edu-deg')} className={inputClass} value={newEducation.degree} onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })} />
                <FieldLabel htmlFor={f('edu-major')}>Major</FieldLabel>
                <input id={f('edu-major')} className={inputClass} value={newEducation.major} onChange={(e) => setNewEducation({ ...newEducation, major: e.target.value })} />
                <FieldLabel htmlFor={f('edu-grad')}>Graduation (YYYY-MM)</FieldLabel>
                <input
                  id={f('edu-grad')}
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={newEducation.graduationDate}
                  onChange={(e) => setNewEducation({ ...newEducation, graduationDate: e.target.value })}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddItem('education', newEducation)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Save
                  </button>
                  <button type="button" onClick={cancelAdd} className="px-4 py-2 rounded-lg text-sm font-bold text-stone-600 border border-stone-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </EditableSection>

          <EditableSection title="Projects" icon={<Code className="text-blue-600" size={24} />} onAdd={() => setShowAdd('projects')}>
            {profile.projects?.length ? (
              profile.projects.map((proj, i) => (
                <div key={proj.id || i} className="relative pl-6 border-l-2 border-stone-100 group">
                  <button
                    type="button"
                    onClick={() => handleRemoveAt('projects', i)}
                    className="absolute right-0 top-0 p-1 text-stone-300 hover:text-red-600"
                    aria-label={`Remove project ${proj.name}`}
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-blue-500 rounded-full" />
                  <h4 className="font-bold text-stone-900 pr-8">{proj.name}</h4>
                  <p className="text-stone-600 text-sm">{proj.description}</p>
                  {proj.technologies?.length ? (
                    <p className="text-xs text-stone-500 mt-1">{proj.technologies.join(', ')}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-stone-400 text-sm italic">No projects added yet.</p>
            )}
            {showAdd === 'projects' && (
              <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                <h4 className="font-bold mb-2">Add project</h4>
                <FieldLabel htmlFor={f('proj-name')}>Name</FieldLabel>
                <input id={f('proj-name')} className={inputClass} value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} />
                <FieldLabel htmlFor={f('proj-desc')}>Description</FieldLabel>
                <textarea
                  id={f('proj-desc')}
                  className={`${inputClass} min-h-[72px]`}
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
                <FieldLabel htmlFor={f('proj-url')}>URL</FieldLabel>
                <input
                  id={f('proj-url')}
                  type="url"
                  className={inputClass}
                  value={newProject.url || ''}
                  onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                />
                <FieldLabel htmlFor={f('proj-tech')}>Technologies (comma-separated)</FieldLabel>
                <input
                  id={f('proj-tech')}
                  className={inputClass}
                  value={projectTechDraft}
                  onChange={(e) => setProjectTechDraft(e.target.value)}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const techs = projectTechDraft
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean);
                      handleAddItem('projects', { ...newProject, technologies: techs });
                      setNewProject({ name: '', description: '', technologies: [], url: '' });
                      setProjectTechDraft('');
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Save
                  </button>
                  <button type="button" onClick={cancelAdd} className="px-4 py-2 rounded-lg text-sm font-bold text-stone-600 border border-stone-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </EditableSection>

          <EditableSection title="Research Papers" icon={<FlaskConical className="text-purple-600" size={24} />} onAdd={() => setShowAdd('research')}>
            {profile.researchPapers?.length ? (
              profile.researchPapers.map((paper, i) => (
                <div key={paper.id || i} className="relative pl-6 border-l-2 border-stone-100 group">
                  <button
                    type="button"
                    onClick={() => handleRemoveAt('researchPapers', i)}
                    className="absolute right-0 top-0 p-1 text-stone-300 hover:text-red-600"
                    aria-label={`Remove research paper ${paper.title}`}
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-purple-500 rounded-full" />
                  <h4 className="font-bold text-stone-900 pr-8">{paper.title}</h4>
                  <p className="text-stone-600 text-sm">{paper.journal}</p>
                  {paper.abstract ? <p className="text-stone-500 text-xs mt-1 line-clamp-3">{paper.abstract}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-stone-400 text-sm italic">No research papers added yet.</p>
            )}
            {showAdd === 'research' && (
              <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                <h4 className="font-bold mb-2">Add research paper</h4>
                <FieldLabel htmlFor={f('res-title')}>Title</FieldLabel>
                <input id={f('res-title')} className={inputClass} value={newResearch.title} onChange={(e) => setNewResearch({ ...newResearch, title: e.target.value })} />
                <FieldLabel htmlFor={f('res-journal')}>Journal</FieldLabel>
                <input id={f('res-journal')} className={inputClass} value={newResearch.journal || ''} onChange={(e) => setNewResearch({ ...newResearch, journal: e.target.value })} />
                <FieldLabel htmlFor={f('res-abs')}>Abstract</FieldLabel>
                <textarea
                  id={f('res-abs')}
                  className={`${inputClass} min-h-[80px]`}
                  value={newResearch.abstract}
                  onChange={(e) => setNewResearch({ ...newResearch, abstract: e.target.value })}
                />
                <FieldLabel htmlFor={f('res-url')}>URL</FieldLabel>
                <input id={f('res-url')} type="url" className={inputClass} value={newResearch.url || ''} onChange={(e) => setNewResearch({ ...newResearch, url: e.target.value })} />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddItem('researchPapers', newResearch)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Save
                  </button>
                  <button type="button" onClick={cancelAdd} className="px-4 py-2 rounded-lg text-sm font-bold text-stone-600 border border-stone-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </EditableSection>

          <EditableSection title="Volunteer Experience" icon={<Heart className="text-red-600" size={24} />} onAdd={() => setShowAdd('volunteer')}>
            {profile.volunteerExperience?.length ? (
              profile.volunteerExperience.map((exp, i) => (
                <div key={exp.id || i} className="relative pl-6 border-l-2 border-stone-100 group">
                  <button
                    type="button"
                    onClick={() => handleRemoveAt('volunteerExperience', i)}
                    className="absolute right-0 top-0 p-1 text-stone-300 hover:text-red-600"
                    aria-label={`Remove volunteer role ${exp.role}`}
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-red-500 rounded-full" />
                  <h4 className="font-bold text-stone-900 pr-8">{exp.role}</h4>
                  <p className="text-red-600 text-sm font-medium">{exp.organization}</p>
                  <p className="text-stone-400 text-xs">
                    {exp.startDate} – {exp.endDate}
                  </p>
                  <p className="text-stone-600 text-sm">{exp.description}</p>
                </div>
              ))
            ) : (
              <p className="text-stone-400 text-sm italic">No volunteer experience added yet.</p>
            )}
            {showAdd === 'volunteer' && (
              <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                <h4 className="font-bold mb-2">Add volunteer experience</h4>
                <FieldLabel htmlFor={f('vol-org')}>Organization</FieldLabel>
                <input
                  id={f('vol-org')}
                  className={inputClass}
                  value={newVolunteer.organization}
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, organization: e.target.value })}
                />
                <FieldLabel htmlFor={f('vol-role')}>Role</FieldLabel>
                <input id={f('vol-role')} className={inputClass} value={newVolunteer.role} onChange={(e) => setNewVolunteer({ ...newVolunteer, role: e.target.value })} />
                <FieldLabel htmlFor={f('vol-start')}>Start (YYYY-MM)</FieldLabel>
                <input
                  id={f('vol-start')}
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={newVolunteer.startDate}
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, startDate: e.target.value })}
                />
                <FieldLabel htmlFor={f('vol-end')}>End (YYYY-MM)</FieldLabel>
                <input
                  id={f('vol-end')}
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={newVolunteer.endDate}
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, endDate: e.target.value })}
                />
                <FieldLabel htmlFor={f('vol-desc')}>Description</FieldLabel>
                <textarea
                  id={f('vol-desc')}
                  className={`${inputClass} min-h-[72px]`}
                  value={newVolunteer.description}
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, description: e.target.value })}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddItem('volunteerExperience', newVolunteer)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Save
                  </button>
                  <button type="button" onClick={cancelAdd} className="px-4 py-2 rounded-lg text-sm font-bold text-stone-600 border border-stone-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </EditableSection>

          <EditableSection title="Certifications" icon={<Star className="text-yellow-500" size={24} />} onAdd={() => setShowAdd('certifications')}>
            {profile.certifications?.length ? (
              profile.certifications.map((cert, i) => (
                <div key={cert.id || i} className="relative pl-6 border-l-2 border-stone-100 group">
                  <button
                    type="button"
                    onClick={() => handleRemoveAt('certifications', i)}
                    className="absolute right-0 top-0 p-1 text-stone-300 hover:text-red-600"
                    aria-label={`Remove certification ${cert.name}`}
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-yellow-500 rounded-full" />
                  <h4 className="font-bold text-stone-900 pr-8">{cert.name}</h4>
                  <p className="text-stone-600 text-sm">{cert.issuingOrganization}</p>
                  <p className="text-stone-400 text-xs">Issued {cert.issueDate}</p>
                </div>
              ))
            ) : (
              <p className="text-stone-400 text-sm italic">No certifications added yet.</p>
            )}
            {showAdd === 'certifications' && (
              <div className="p-4 bg-stone-50 rounded-lg space-y-2 border border-stone-100">
                <h4 className="font-bold mb-2">Add certification</h4>
                <FieldLabel htmlFor={f('cert-name')}>Name</FieldLabel>
                <input id={f('cert-name')} className={inputClass} value={newCertification.name} onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })} />
                <FieldLabel htmlFor={f('cert-org')}>Issuing organization</FieldLabel>
                <input
                  id={f('cert-org')}
                  className={inputClass}
                  value={newCertification.issuingOrganization}
                  onChange={(e) => setNewCertification({ ...newCertification, issuingOrganization: e.target.value })}
                />
                <FieldLabel htmlFor={f('cert-issue')}>Issue date (YYYY-MM)</FieldLabel>
                <input
                  id={f('cert-issue')}
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={newCertification.issueDate}
                  onChange={(e) => setNewCertification({ ...newCertification, issueDate: e.target.value })}
                />
                <FieldLabel htmlFor={f('cert-exp')}>Expiration (YYYY-MM, optional)</FieldLabel>
                <input
                  id={f('cert-exp')}
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={newCertification.expirationDate || ''}
                  onChange={(e) => setNewCertification({ ...newCertification, expirationDate: e.target.value })}
                />
                <FieldLabel htmlFor={f('cert-cred-url')}>Credential URL</FieldLabel>
                <input
                  id={f('cert-cred-url')}
                  type="url"
                  className={inputClass}
                  value={newCertification.credentialUrl || ''}
                  onChange={(e) => setNewCertification({ ...newCertification, credentialUrl: e.target.value })}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddItem('certifications', newCertification)}
                    className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Save
                  </button>
                  <button type="button" onClick={cancelAdd} className="px-4 py-2 rounded-lg text-sm font-bold text-stone-600 border border-stone-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </EditableSection>

          <section className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
            <h3 className="font-bold text-xl text-stone-900 mb-6 flex items-center space-x-3">
              <Settings className="text-emerald-600" size={24} aria-hidden />
              <span>Skills</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills?.map((skill, i) => (
                <span
                  key={`${skill}-${i}`}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-stone-50 text-stone-700 rounded-xl text-sm font-bold border border-stone-100"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveAt('skills', i)}
                    className="p-0.5 rounded hover:bg-stone-200 text-stone-400 hover:text-red-600"
                    aria-label={`Remove skill ${skill}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setShowAdd('skills')}
                className="px-4 py-2 border-2 border-dashed border-stone-200 text-stone-400 rounded-xl text-sm font-bold hover:border-emerald-500 hover:text-emerald-600 transition-colors"
              >
                + Add skill
              </button>
            </div>
            {showAdd === 'skills' && (
              <div className="p-4 bg-stone-50 rounded-lg mt-4 space-y-2 border border-stone-100">
                <FieldLabel htmlFor={f('skill-input')}>Skill name</FieldLabel>
                <input
                  id={f('skill-input')}
                  type="text"
                  className={inputClass}
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddItem('skills', newSkill);
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddItem('skills', newSkill)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Save
                  </button>
                  <button type="button" onClick={cancelAdd} className="px-4 py-2 rounded-lg text-sm font-bold text-stone-600 border border-stone-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
