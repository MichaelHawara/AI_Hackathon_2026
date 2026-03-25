import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Target, ChevronRight, ChevronLeft, Linkedin, Mail, Lock, Sparkles, ArrowRight, Camera, Plus, X, Briefcase, FlaskConical, Heart, Code } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, db, doc, setDoc, getDoc, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '../firebase';

export default function Onboarding() {
  const [view, setView] = useState<'hero' | 'auth' | 'onboarding'>('hero');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<any>({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    photoURL: '',
    experience: [],
    education: [],
    projects: [],
    researchPapers: [],
    volunteerExperience: [],
    skills: [],
    preferences: {
      roles: [],
      workType: 'Remote',
      radius: 25,
      basePay: 50000
    }
  });

  // Temporary state for adding items
  const [newExperience, setNewExperience] = useState({ company: '', role: '', startDate: '', endDate: '', description: '' });
  const [newEducation, setNewEducation] = useState({ school: '', degree: '', major: '', graduationDate: '' });
  const [newProject, setNewProject] = useState({ name: '', description: '', technologies: [] as string[], url: '' });
  const [newResearch, setNewResearch] = useState({ title: '', abstract: '', publishedDate: '', journal: '', url: '' });
  const [newVolunteer, setNewVolunteer] = useState({ organization: '', role: '', startDate: '', endDate: '', description: '' });
  const [roleInput, setRoleInput] = useState('');
  const [techInput, setTechInput] = useState('');

  // Collapsible section states
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [showAddEducation, setShowAddEducation] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddResearch, setShowAddResearch] = useState(false);
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (profileSnap.exists()) {
        return;
      }
      setFormData({ ...formData, fullName: user.displayName || '', email: user.email || '', photoURL: user.photoURL || '' });
      setView('onboarding');
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups and try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Check Firebase Console > Auth > Settings > Authorized domains.');
      } else if (error.code === 'auth/internal-error' || error.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled. Enable it in Firebase Console > Authentication > Sign-in method.');
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
        const result = await createUserWithEmailAndPassword(auth, email, password);
        setFormData({ ...formData, email });
        setView('onboarding');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try logging in.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message);
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
      setFormData({ ...formData, photoURL: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleComplete = async () => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), formData);
    } catch (error) {
      console.error("Failed to save profile", error);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleLinkedInImport = () => {
    // Simulate LinkedIn data import
    const linkedInData = {
      experience: [
        {
          company: 'Tech Company A',
          role: 'Software Engineer Intern',
          startDate: '2023-06',
          endDate: '2023-12',
          description: 'Developed full-stack features using React and Node.js. Collaborated with cross-functional teams on product launches.'
        }
      ],
      education: [
        {
          school: 'State University',
          degree: 'BS',
          major: 'Computer Science',
          graduationDate: '2024-05'
        }
      ],
      projects: [
        {
          name: 'AI Chat Application',
          description: 'Built a real-time chat application using WebSockets and Machine Learning for sentiment analysis.',
          technologies: ['React', 'Node.js', 'TensorFlow'],
          url: 'https://github.com/example/ai-chat'
        }
      ],
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'Machine Learning', 'AWS']
    };

    setFormData({
      ...formData,
      experience: linkedInData.experience,
      education: linkedInData.education,
      projects: linkedInData.projects,
      skills: linkedInData.skills
    });

    alert('LinkedIn data imported successfully! Feel free to edit any details.');
  };

  const inputClass = "w-full p-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-sm";
  const addBtnClass = "flex items-center space-x-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors";
  const tagClass = "px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 flex items-center space-x-1";

  // ---- HERO VIEW ----
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
            <Sparkles size={16} className="text-emerald-600" />
            <span className="text-emerald-700 text-sm font-bold tracking-wide uppercase">AI-Powered Career Growth</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-stone-900 tracking-tighter leading-[0.9] mb-8"
          >
            YOUR FUTURE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-indigo-600">ACCELERATED.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl text-xl text-stone-500 mb-12 leading-relaxed"
          >
            CareerPath AI uses advanced intelligence to match your unique skills with the world's best opportunities. Stop searching, start growing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <button
              onClick={() => setView('auth')}
              className="group relative bg-stone-900 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-2xl shadow-stone-200 flex items-center space-x-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              <span className="relative">Get Started Free</span>
              <ArrowRight className="relative group-hover:translate-x-1 transition-transform" size={20} />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-24 w-full max-w-5xl aspect-video bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-stone-100 overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-indigo-50/50" />
            <div className="absolute top-8 left-8 flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-stone-200" />
              <div className="w-3 h-3 rounded-full bg-stone-200" />
              <div className="w-3 h-3 rounded-full bg-stone-200" />
            </div>
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="flex justify-center space-x-3">
                  <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Exploration</div>
                  <div className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">Preparation</div>
                  <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Applications</div>
                  <div className="px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">Early Career</div>
                </div>
                <div className="text-stone-300 font-mono text-sm tracking-widest uppercase">Your Career Journey</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ---- AUTH VIEW ----
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
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 bg-white border border-stone-200 p-4 rounded-2xl hover:bg-stone-50 transition-all font-bold text-stone-700 shadow-sm disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>
            {error && <p className="text-red-500 text-xs font-medium px-2">{error}</p>}
            <div className="flex items-center space-x-4">
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-stone-300 text-xs font-bold uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all" />
            </div>
            {error && <p className="text-red-500 text-xs font-medium px-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 disabled:opacity-50">
              {loading ? 'Processing...' : authMode === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setError(''); }}
              className="text-stone-500 text-sm font-bold hover:text-emerald-600 transition-colors"
            >
              {authMode === 'signup' ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- ONBOARDING STEPS ----
  const steps = [
    // STEP 1: Personal Information
    {
      title: "Personal Information",
      subtitle: "Let's get to know you better.",
      content: (
        <div className="space-y-6">
          {/* PFP Upload */}
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-stone-300 group-hover:border-emerald-500 transition-colors">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Camera size={32} className="text-stone-300 group-hover:text-emerald-500 transition-colors" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg">
                <Plus size={14} />
              </div>
              <input type="file" accept="image/*" onChange={handlePFPUpload} className="hidden" />
            </label>
          </div>
          <p className="text-center text-xs text-stone-400 -mt-2">Upload profile picture</p>

          <input type="text" placeholder="Full Name *" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className={inputClass} />
          <input type="email" placeholder="Email" value={formData.email} disabled className={inputClass + " opacity-60"} />
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} />
            <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className={inputClass} />
          </div>
          <input type="text" placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className={inputClass} />
        </div>
      )
    },
    // STEP 2: Experience, Education, Projects, Research, Volunteer, Skills
    {
      title: "Your Background",
      subtitle: "Tell us about your experience and skills.",
      content: (
        <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2">
          {/* LinkedIn Fill */}
          <button
            onClick={handleLinkedInImport}
            type="button"
            className="w-full flex items-center justify-center space-x-3 bg-[#0077B5] text-white p-4 rounded-2xl hover:bg-[#006097] transition-all font-bold shadow-lg shadow-blue-100"
          >
            <Linkedin size={20} />
            <span>Fill in using LinkedIn</span>
          </button>

          {/* Work Experience */}
          <div className="border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Briefcase size={18} className="text-emerald-600" />
                <h4 className="font-bold text-stone-900 text-sm">Work Experience</h4>
              </div>
              <button onClick={() => setShowAddExperience(!showAddExperience)} className={addBtnClass}>
                <Plus size={16} /><span>Add</span>
              </button>
            </div>
            {formData.experience.map((exp: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl mb-2">
                <div><p className="font-bold text-sm text-stone-900">{exp.role}</p><p className="text-xs text-stone-500">{exp.company}</p></div>
                <button onClick={() => setFormData({ ...formData, experience: formData.experience.filter((_: any, idx: number) => idx !== i) })} className="text-stone-300 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
            {showAddExperience && (
              <div className="space-y-2 mt-3 pt-3 border-t border-stone-100">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Company" value={newExperience.company} onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })} className={inputClass} />
                  <input placeholder="Role/Title" value={newExperience.role} onChange={(e) => setNewExperience({ ...newExperience, role: e.target.value })} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="month" placeholder="Start" value={newExperience.startDate} onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })} className={inputClass} />
                  <input type="month" placeholder="End" value={newExperience.endDate} onChange={(e) => setNewExperience({ ...newExperience, endDate: e.target.value })} className={inputClass} />
                </div>
                <textarea placeholder="Description" value={newExperience.description} onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })} className={inputClass + " h-20 resize-none"} />
                <button onClick={() => { if (newExperience.company && newExperience.role) { setFormData({ ...formData, experience: [...formData.experience, newExperience] }); setNewExperience({ company: '', role: '', startDate: '', endDate: '', description: '' }); setShowAddExperience(false); }}} className="w-full bg-emerald-600 text-white p-2 rounded-xl text-sm font-bold hover:bg-emerald-700">Save Experience</button>
              </div>
            )}
          </div>

          {/* Education */}
          <div className="border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <GraduationCap size={18} className="text-emerald-600" />
                <h4 className="font-bold text-stone-900 text-sm">Education</h4>
              </div>
              <button onClick={() => setShowAddEducation(!showAddEducation)} className={addBtnClass}>
                <Plus size={16} /><span>Add</span>
              </button>
            </div>
            {formData.education.map((edu: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl mb-2">
                <div><p className="font-bold text-sm text-stone-900">{edu.school}</p><p className="text-xs text-stone-500">{edu.degree} in {edu.major}</p></div>
                <button onClick={() => setFormData({ ...formData, education: formData.education.filter((_: any, idx: number) => idx !== i) })} className="text-stone-300 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
            {showAddEducation && (
              <div className="space-y-2 mt-3 pt-3 border-t border-stone-100">
                <input placeholder="School" value={newEducation.school} onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })} className={inputClass} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Degree (e.g. BS)" value={newEducation.degree} onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })} className={inputClass} />
                  <input placeholder="Major" value={newEducation.major} onChange={(e) => setNewEducation({ ...newEducation, major: e.target.value })} className={inputClass} />
                </div>
                <input type="month" placeholder="Graduation Date" value={newEducation.graduationDate} onChange={(e) => setNewEducation({ ...newEducation, graduationDate: e.target.value })} className={inputClass} />
                <button onClick={() => { if (newEducation.school && newEducation.degree) { setFormData({ ...formData, education: [...formData.education, newEducation] }); setNewEducation({ school: '', degree: '', major: '', graduationDate: '' }); setShowAddEducation(false); }}} className="w-full bg-emerald-600 text-white p-2 rounded-xl text-sm font-bold hover:bg-emerald-700">Save Education</button>
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Code size={18} className="text-emerald-600" />
                <h4 className="font-bold text-stone-900 text-sm">Projects</h4>
              </div>
              <button onClick={() => setShowAddProject(!showAddProject)} className={addBtnClass}>
                <Plus size={16} /><span>Add</span>
              </button>
            </div>
            {formData.projects.map((proj: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl mb-2">
                <div><p className="font-bold text-sm text-stone-900">{proj.name}</p><p className="text-xs text-stone-500">{proj.technologies.join(', ')}</p></div>
                <button onClick={() => setFormData({ ...formData, projects: formData.projects.filter((_: any, idx: number) => idx !== i) })} className="text-stone-300 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
            {showAddProject && (
              <div className="space-y-2 mt-3 pt-3 border-t border-stone-100">
                <input placeholder="Project Name" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} className={inputClass} />
                <textarea placeholder="Description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} className={inputClass + " h-20 resize-none"} />
                <div>
                  <input placeholder="Technologies (press Enter to add)" value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && techInput.trim()) { e.preventDefault(); setNewProject({ ...newProject, technologies: [...newProject.technologies, techInput.trim()] }); setTechInput(''); }}} className={inputClass} />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newProject.technologies.map((t, i) => (
                      <span key={i} className={tagClass}><span>{t}</span><button onClick={() => setNewProject({ ...newProject, technologies: newProject.technologies.filter((_, idx) => idx !== i) })}><X size={12} /></button></span>
                    ))}
                  </div>
                </div>
                <input placeholder="URL (optional)" value={newProject.url} onChange={(e) => setNewProject({ ...newProject, url: e.target.value })} className={inputClass} />
                <button onClick={() => { if (newProject.name) { setFormData({ ...formData, projects: [...formData.projects, newProject] }); setNewProject({ name: '', description: '', technologies: [], url: '' }); setShowAddProject(false); }}} className="w-full bg-emerald-600 text-white p-2 rounded-xl text-sm font-bold hover:bg-emerald-700">Save Project</button>
              </div>
            )}
          </div>

          {/* Research Papers */}
          <div className="border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FlaskConical size={18} className="text-emerald-600" />
                <h4 className="font-bold text-stone-900 text-sm">Research Papers</h4>
              </div>
              <button onClick={() => setShowAddResearch(!showAddResearch)} className={addBtnClass}>
                <Plus size={16} /><span>Add</span>
              </button>
            </div>
            {formData.researchPapers.map((paper: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl mb-2">
                <div><p className="font-bold text-sm text-stone-900">{paper.title}</p><p className="text-xs text-stone-500">{paper.journal || 'Unpublished'}</p></div>
                <button onClick={() => setFormData({ ...formData, researchPapers: formData.researchPapers.filter((_: any, idx: number) => idx !== i) })} className="text-stone-300 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
            {showAddResearch && (
              <div className="space-y-2 mt-3 pt-3 border-t border-stone-100">
                <input placeholder="Paper Title" value={newResearch.title} onChange={(e) => setNewResearch({ ...newResearch, title: e.target.value })} className={inputClass} />
                <textarea placeholder="Abstract" value={newResearch.abstract} onChange={(e) => setNewResearch({ ...newResearch, abstract: e.target.value })} className={inputClass + " h-20 resize-none"} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Journal/Conference" value={newResearch.journal} onChange={(e) => setNewResearch({ ...newResearch, journal: e.target.value })} className={inputClass} />
                  <input type="month" value={newResearch.publishedDate} onChange={(e) => setNewResearch({ ...newResearch, publishedDate: e.target.value })} className={inputClass} />
                </div>
                <input placeholder="URL (optional)" value={newResearch.url} onChange={(e) => setNewResearch({ ...newResearch, url: e.target.value })} className={inputClass} />
                <button onClick={() => { if (newResearch.title) { setFormData({ ...formData, researchPapers: [...formData.researchPapers, newResearch] }); setNewResearch({ title: '', abstract: '', publishedDate: '', journal: '', url: '' }); setShowAddResearch(false); }}} className="w-full bg-emerald-600 text-white p-2 rounded-xl text-sm font-bold hover:bg-emerald-700">Save Research</button>
              </div>
            )}
          </div>

          {/* Volunteer Experience */}
          <div className="border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Heart size={18} className="text-emerald-600" />
                <h4 className="font-bold text-stone-900 text-sm">Volunteer Experience</h4>
              </div>
              <button onClick={() => setShowAddVolunteer(!showAddVolunteer)} className={addBtnClass}>
                <Plus size={16} /><span>Add</span>
              </button>
            </div>
            {formData.volunteerExperience.map((vol: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl mb-2">
                <div><p className="font-bold text-sm text-stone-900">{vol.role}</p><p className="text-xs text-stone-500">{vol.organization}</p></div>
                <button onClick={() => setFormData({ ...formData, volunteerExperience: formData.volunteerExperience.filter((_: any, idx: number) => idx !== i) })} className="text-stone-300 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
            {showAddVolunteer && (
              <div className="space-y-2 mt-3 pt-3 border-t border-stone-100">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Organization" value={newVolunteer.organization} onChange={(e) => setNewVolunteer({ ...newVolunteer, organization: e.target.value })} className={inputClass} />
                  <input placeholder="Role" value={newVolunteer.role} onChange={(e) => setNewVolunteer({ ...newVolunteer, role: e.target.value })} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="month" value={newVolunteer.startDate} onChange={(e) => setNewVolunteer({ ...newVolunteer, startDate: e.target.value })} className={inputClass} />
                  <input type="month" value={newVolunteer.endDate} onChange={(e) => setNewVolunteer({ ...newVolunteer, endDate: e.target.value })} className={inputClass} />
                </div>
                <textarea placeholder="Description" value={newVolunteer.description} onChange={(e) => setNewVolunteer({ ...newVolunteer, description: e.target.value })} className={inputClass + " h-20 resize-none"} />
                <button onClick={() => { if (newVolunteer.organization && newVolunteer.role) { setFormData({ ...formData, volunteerExperience: [...formData.volunteerExperience, newVolunteer] }); setNewVolunteer({ organization: '', role: '', startDate: '', endDate: '', description: '' }); setShowAddVolunteer(false); }}} className="w-full bg-emerald-600 text-white p-2 rounded-xl text-sm font-bold hover:bg-emerald-700">Save Volunteer</button>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="border border-stone-200 rounded-2xl p-4">
            <h4 className="font-bold text-stone-900 text-sm mb-3">Skills</h4>
            <input
              type="text"
              placeholder="Type a skill and press Enter"
              className={inputClass}
              onKeyDown={(e: any) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  setFormData({ ...formData, skills: [...formData.skills, e.target.value.trim()] });
                  e.target.value = '';
                }
              }}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.skills.map((skill: string, i: number) => (
                <span key={i} className={tagClass}>
                  <span>{skill}</span>
                  <button onClick={() => setFormData({ ...formData, skills: formData.skills.filter((_: any, idx: number) => idx !== i) })}><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )
    },
    // STEP 3: Job Preferences
    {
      title: "Job Preferences",
      subtitle: "What are you looking for?",
      content: (
        <div className="space-y-8">
          {/* Roles */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 px-2">Roles / Jobs / Internships you're looking for</label>
            <input
              type="text"
              placeholder="e.g. Software Engineer (press Enter to add)"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && roleInput.trim()) {
                  e.preventDefault();
                  setFormData({ ...formData, preferences: { ...formData.preferences, roles: [...formData.preferences.roles, roleInput.trim()] }});
                  setRoleInput('');
                }
              }}
              className={inputClass}
            />
            <div className="flex flex-wrap gap-2">
              {formData.preferences.roles.map((role: string, i: number) => (
                <span key={i} className={tagClass}>
                  <span>{role}</span>
                  <button onClick={() => setFormData({ ...formData, preferences: { ...formData.preferences, roles: formData.preferences.roles.filter((_: any, idx: number) => idx !== i) }})}><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Work Type */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 px-2">Work Type</label>
            <div className="grid grid-cols-3 gap-3">
              {['In-person', 'Remote', 'Hybrid'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFormData({ ...formData, preferences: { ...formData.preferences, workType: type } })}
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

          {/* Base Pay */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 px-2 flex justify-between">
              <span>Base Pay (Min Annual)</span>
              <span className="text-emerald-600">${formData.preferences.basePay.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min="0"
              max="200000"
              step="5000"
              value={formData.preferences.basePay}
              onChange={(e) => setFormData({ ...formData, preferences: { ...formData.preferences, basePay: parseInt(e.target.value) } })}
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Radius */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 px-2">Search Radius (Miles)</label>
            <input
              type="number"
              value={formData.preferences.radius}
              onChange={(e) => setFormData({ ...formData, preferences: { ...formData.preferences, radius: parseInt(e.target.value) || 0 } })}
              className={inputClass + " font-bold"}
            />
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

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
            <button onClick={handleSkip} className="text-stone-300 hover:text-stone-500 text-xs font-black uppercase tracking-widest transition-colors">Skip</button>
          </div>

          {currentStep.content}

          <div className="mt-12 flex items-center justify-between">
            <button
              onClick={() => step > 0 ? setStep(step - 1) : setView('auth')}
              className="flex items-center space-x-2 text-stone-400 font-bold hover:text-stone-900 transition-colors"
            >
              <ChevronLeft size={20} />
              <span>Back</span>
            </button>

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center space-x-3 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all"
              >
                <span>Continue</span>
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex items-center space-x-3 bg-stone-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-stone-800 shadow-xl shadow-stone-200 transition-all"
              >
                <span>Launch Career</span>
                <Target size={20} />
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
