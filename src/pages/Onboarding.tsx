import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Briefcase, GraduationCap, Target, ChevronRight, ChevronLeft, Linkedin, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, db, doc, setDoc, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const [view, setView] = useState<'hero' | 'auth' | 'onboarding'>('hero');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [step, setStep] = useState(0); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<any>({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    experience: [],
    education: [],
    skills: [],
    preferences: {
      roles: [],
      workType: 'Remote',
      radius: 25,
      basePay: 50000
    }
  });

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setFormData({ ...formData, fullName: user.displayName || '', email: user.email || '' });
      setView('onboarding');
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        setFormData({ ...formData, email });
        setView('onboarding');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // If login success, App.tsx will handle redirect, but we might want to check if profile exists
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  if (view === 'hero') {
    return (
      <div className="min-h-screen bg-stone-50 overflow-hidden relative">
        {/* Abstract Background Elements */}
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
            <button
              onClick={() => navigate('/how-it-works')}
              className="text-stone-500 font-bold hover:text-stone-900 transition-colors flex items-center space-x-2"
            >
              <span>See How It Works</span>
              <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
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
              <div className="text-stone-300 font-mono text-sm tracking-widest uppercase">Dashboard Preview</div>
            </div>
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
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center space-x-3 bg-white border border-stone-200 p-4 rounded-2xl hover:bg-stone-50 transition-all font-bold text-stone-700 shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              <span>Continue with Google</span>
            </button>
            <div className="flex items-center space-x-4">
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-stone-300 text-xs font-bold uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-medium px-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 disabled:opacity-50"
            >
              {loading ? 'Processing...' : authMode === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
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

  const steps = [
    {
      title: "Personal Information",
      subtitle: "Let's get to know you better.",
      content: (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full p-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="date"
              placeholder="DOB"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="w-full p-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <input
            type="text"
            placeholder="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full p-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )
    },
    {
      title: "Experience & Education",
      subtitle: "Tell us about your background.",
      content: (
        <div className="space-y-6">
          <button className="w-full flex items-center justify-center space-x-3 bg-[#0077B5] text-white p-4 rounded-2xl hover:bg-[#006097] transition-all font-bold shadow-lg shadow-blue-100">
            <Linkedin size={20} />
            <span>Connect LinkedIn</span>
          </button>
          
          <div className="p-8 border-2 border-dashed border-stone-200 rounded-[2rem] text-center text-stone-400 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group">
            <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
              <GraduationCap size={24} />
            </div>
            <p className="text-sm font-bold text-stone-500">Add Education or Experience</p>
            <button className="mt-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">Add Item</button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 px-2">Skills</label>
            <input
              type="text"
              placeholder="e.g. Python, React, Data Analysis"
              className="w-full p-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
              onKeyPress={(e: any) => {
                if (e.key === 'Enter' && e.target.value) {
                  setFormData({ ...formData, skills: [...formData.skills, e.target.value] });
                  e.target.value = '';
                }
              }}
            />
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.skills.map((skill: string, i: number) => (
                <span key={i} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Job Preferences",
      subtitle: "What are you looking for?",
      content: (
        <div className="space-y-8">
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

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 px-2 flex justify-between">
              <span>Base Pay (Min Annual)</span>
              <span className="text-emerald-600">${formData.preferences.basePay.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min="30000"
              max="200000"
              step="5000"
              value={formData.preferences.basePay}
              onChange={(e) => setFormData({ ...formData, preferences: { ...formData.preferences, basePay: parseInt(e.target.value) } })}
              className="w-full accent-emerald-600"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 px-2">Search Radius (Miles)</label>
            <input
              type="number"
              value={formData.preferences.radius}
              onChange={(e) => setFormData({ ...formData, preferences: { ...formData.preferences, radius: parseInt(e.target.value) } })}
              className="w-full p-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold"
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
            <button
              onClick={handleSkip}
              className="text-stone-300 hover:text-stone-500 text-xs font-black uppercase tracking-widest transition-colors"
            >
              Skip
            </button>
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
