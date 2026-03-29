import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Filter,MapPin, Briefcase, ChevronRight, DollarSign, Clock, Sparkles, X } from 'lucide-react';
import { Job, UserProfile } from '../types';
import { db, auth, doc, getDoc } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import JobModal from '../components/JobModal';
import { computeApplicationFit } from '../services/fitScore';
import { fetchJobsForUser } from '../services/jobsApi';

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    source: [] as string[],
    workType: [] as string[],
    minPay: 0,
    maxPay: 200000,
    location: ''
  });
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (user) => {
      let profile: UserProfile | null = null;
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          profile = { uid: user.uid, ...docSnap.data() } as UserProfile;
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      try {
        const list = await fetchJobsForUser(profile);
        if (!cancelled) setJobs(list);
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (normalizedSearch) {
        const hay = `${job.title} ${job.company} ${job.description} ${job.location} ${(job.requirements ?? []).join(' ')}`.toLowerCase();
        const tokens = normalizedSearch.split(/\s+/).filter(Boolean);
        const matchesPhrase = hay.includes(normalizedSearch);
        const matchesAllTokens = tokens.every((t) => hay.includes(t));
        if (!matchesPhrase && !matchesAllTokens) return false;
      }

      if (filters.source.length > 0 && !filters.source.includes(job.source)) {
        return false;
      }

      if (filters.workType.length > 0 && job.workType && !filters.workType.includes(job.workType)) {
        return false;
      }

      if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [jobs, normalizedSearch, filters.source, filters.workType, filters.location]);

  return (
    <div className="space-y-10 pb-20">
      <header className="space-y-4">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
          <Sparkles size={14} className="text-indigo-600" />
          <span className="text-indigo-700 text-[10px] font-black uppercase tracking-widest">Global Marketplace</span>
        </div>
        <h1 className="text-4xl font-black text-stone-900 tracking-tight">Discover Opportunities</h1>
        <p className="text-stone-500 max-w-xl font-medium">
          Search by title, company, description, or location. Listings combine Adzuna and other feeds; your profile shapes personalized results when you’re signed in.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center space-x-4 bg-white border border-stone-200 rounded-3xl px-6 py-4 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
          <SearchIcon size={20} className="text-stone-400" />
          <input
            type="text"
            placeholder="Search by title, company, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-base w-full font-medium"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center space-x-3 bg-white border border-stone-200 px-8 py-4 rounded-3xl font-black text-stone-600 hover:bg-stone-50 transition-all shadow-sm relative"
        >
          <Filter size={20} />
          <span className="text-sm uppercase tracking-widest">Filters</span>
          {(filters.source.length > 0 || filters.workType.length > 0 || filters.location) && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {(filters.source.length || 0) + (filters.workType.length || 0) + (filters.location ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-8 rounded-3xl border border-stone-200 shadow-lg space-y-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-stone-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Source Filter */}
              <div className="space-y-3">
                <label className="font-bold text-sm text-stone-900 uppercase tracking-widest">Source</label>
                <div className="space-y-2">
                  {['Handshake', 'LinkedIn', 'Indeed', 'Google', 'Adzuna'].map(source => (
                    <label key={source} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.source.includes(source)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, source: [...filters.source, source] });
                          } else {
                            setFilters({ ...filters, source: filters.source.filter(s => s !== source) });
                          }
                        }}
                        className="w-4 h-4 rounded border-stone-300 text-emerald-600"
                      />
                      <span className="text-sm text-stone-600">{source}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Work Type Filter */}
              <div className="space-y-3">
                <label className="font-bold text-sm text-stone-900 uppercase tracking-widest">Work Type</label>
                <div className="space-y-2">
                  {['In-person', 'Remote', 'Hybrid'].map(type => (
                    <label key={type} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.workType.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, workType: [...filters.workType, type] });
                          } else {
                            setFilters({ ...filters, workType: filters.workType.filter(w => w !== type) });
                          }
                        }}
                        className="w-4 h-4 rounded border-stone-300 text-emerald-600"
                      />
                      <span className="text-sm text-stone-600">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div className="space-y-3">
                <label className="font-bold text-sm text-stone-900 uppercase tracking-widest">Location</label>
                <input
                  type="text"
                  placeholder="City or region"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="w-full p-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ source: [], workType: [], minPay: 0, maxPay: 200000, location: '' })}
                  className="w-full px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-lg hover:bg-stone-200 transition-colors text-sm"
                >
                  Clear All
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loadingJobs && (
        <p className="text-stone-500 text-sm font-medium px-1">Loading jobs…</p>
      )}

      {!loadingJobs && filteredJobs.length === 0 && (
        <p className="text-stone-500 text-sm font-medium px-1">No jobs match your search. Try different keywords or clear filters.</p>
      )}

      <div className="grid grid-cols-1 gap-6">
        {filteredJobs.map((job) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedJob(job)}
            className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center space-x-8">
              <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:shadow-inner transition-all">
                <Briefcase size={32} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-xl text-stone-900 group-hover:text-emerald-600 transition-colors">{job.title}</h3>
                  {userProfile && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                      {computeApplicationFit(job, userProfile).score}% align
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <span className="text-emerald-600 font-black text-sm">{job.company}</span>
                  <div className="flex items-center text-stone-400 text-xs font-bold">
                    <MapPin size={14} className="mr-1" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center text-stone-400 text-xs font-bold">
                    <DollarSign size={14} className="mr-1" />
                    <span>{job.pay ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-8 mt-6 md:mt-0">
              <div className="hidden lg:flex items-center space-x-2 text-stone-300">
                <Clock size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{job.source}</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg transition-all">
                <ChevronRight size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <JobModal 
        job={selectedJob} 
        onClose={() => setSelectedJob(null)} 
        userProfile={userProfile}
        isSaved={false}
      />
    </div>
  );
}
