import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, Clock, Bookmark, BookmarkCheck, Briefcase, Sparkles, TrendingUp } from 'lucide-react';
import { db, auth, collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Job, UserProfile } from '../types';
import JobModal from '../components/JobModal';
import { mockJobs } from '../data/mockJobs';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/jobs');
        if (res.ok) {
          const remote = (await res.json()) as Job[];
          if (!cancelled && Array.isArray(remote) && remote.length > 0) {
            setJobs(remote);
          } else if (!cancelled) {
            setJobs(mockJobs);
          }
        } else if (!cancelled) {
          setJobs(mockJobs);
        }
      } catch {
        if (!cancelled) setJobs(mockJobs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    let unsubscribeJobs: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile({ uid: user.uid, ...docSnap.data() } as UserProfile);
        }
        
        const savedJobsRef = collection(db, 'users', user.uid, 'saved_jobs');
        unsubscribeJobs = onSnapshot(savedJobsRef, (snapshot) => {
          const ids = new Set(snapshot.docs.map(doc => doc.id));
          setSavedJobIds(ids);
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
      if (unsubscribeJobs) unsubscribeJobs();
    };
  }, []);

  useEffect(() => {
    const jid = searchParams.get('jobId');
    if (!jid || jobs.length === 0) return;
    const j = jobs.find((x) => x.id === jid);
    if (j) setSelectedJob(j);
  }, [searchParams, jobs]);

  const openJob = (job: Job) => {
    setSelectedJob(job);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('jobId', job.id);
        return next;
      },
      { replace: true }
    );
  };

  const closeJobModal = () => {
    setSelectedJob(null);
    if (searchParams.get('jobId')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('jobId');
          return next;
        },
        { replace: true }
      );
    }
  };

  const toggleSave = async (job: Job, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!auth.currentUser) return;
    const docRef = doc(db, 'users', auth.currentUser.uid, 'saved_jobs', job.id);
    
    if (savedJobIds.has(job.id)) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {
        jobId: job.id,
        status: 'saved',
        savedAt: serverTimestamp(),
        jobData: job 
      });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="relative py-12 px-8 bg-gradient-to-br from-stone-900 to-stone-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full">
              <Sparkles size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Personalized Feed</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Welcome back, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                {userProfile?.fullName?.split(' ')[0] || 'Future Leader'}
              </span>
            </h1>
            <p className="text-stone-400 max-w-md">We've found 12 new opportunities that match your profile today.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl text-center">
              <div className="text-emerald-400 font-black text-2xl mb-1">85%</div>
              <div className="text-stone-500 text-[10px] uppercase font-bold tracking-widest">Profile Match</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl text-center">
              <div className="text-indigo-400 font-black text-2xl mb-1">12</div>
              <div className="text-stone-500 text-[10px] uppercase font-bold tracking-widest">New Jobs</div>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-emerald-600" size={24} />
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Recommended for You</h2>
          </div>
          <button className="text-stone-400 hover:text-stone-900 text-sm font-bold transition-colors">View All</button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 bg-stone-200 animate-pulse rounded-[2rem]"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => openJob(job)}
                className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-100 transition-colors" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-white group-hover:text-emerald-600 group-hover:shadow-lg transition-all">
                      <Briefcase size={28} />
                    </div>
                    <button
                      onClick={(e) => void toggleSave(job, e)}
                      className={`p-3 rounded-2xl transition-all ${
                        savedJobIds.has(job.id)
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                          : 'bg-stone-50 text-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      {savedJobIds.has(job.id) ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                    </button>
                  </div>

                  <h3 className="font-black text-xl text-stone-900 mb-1 leading-tight group-hover:text-emerald-600 transition-colors">{job.title}</h3>
                  <p className="text-stone-400 font-bold text-sm mb-6">{job.company}</p>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center text-stone-500 text-xs font-medium">
                      <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center mr-3">
                        <MapPin size={12} />
                      </div>
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center text-stone-500 text-xs font-medium">
                      <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center mr-3">
                        <DollarSign size={12} />
                      </div>
                      <span>{job.pay}</span>
                    </div>
                    <div className="flex items-center text-stone-500 text-xs font-medium">
                      <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center mr-3">
                        <Clock size={12} />
                      </div>
                      <span>{job.source}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-stone-50">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-400">
                          {i}
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-emerald-50 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                        +8
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openJob(job);
                      }}
                      className="bg-stone-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-stone-800 transition-all shadow-lg shadow-stone-100"
                    >
                      View More
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <JobModal 
        job={selectedJob} 
        onClose={closeJobModal} 
        userProfile={userProfile}
        isSaved={selectedJob ? savedJobIds.has(selectedJob.id) : false}
        onSaveToggle={(job) => void toggleSave(job)}
      />
    </div>
  );
}