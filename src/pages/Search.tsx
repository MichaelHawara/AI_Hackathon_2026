import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Filter, MapPin, Briefcase, ChevronRight, DollarSign, Clock, Sparkles } from 'lucide-react';
import { Job, UserProfile } from '../types';
import { db, auth, doc, getDoc } from '../firebase';
import JobModal from '../components/JobModal';

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile({ uid: auth.currentUser.uid, ...docSnap.data() } as UserProfile);
        }
      }
    };
    fetchProfile();

    // Mock jobs
    const mockJobs: Job[] = [
      { id: '1', title: 'Software Engineering Intern', company: 'Google', location: 'Mountain View, CA', description: 'Work on large-scale distributed systems...', source: 'Handshake', pay: '$45/hr', postedDate: new Date().toISOString() },
      { id: '2', title: 'Product Management Associate', company: 'Meta', location: 'Remote', description: 'Shape the future of social connection...', source: 'LinkedIn', pay: '$120k/yr', postedDate: new Date().toISOString() },
      { id: '3', title: 'Data Science Fellow', company: 'NVIDIA', location: 'Santa Clara, CA', description: 'Apply machine learning techniques...', source: 'Indeed', pay: '$55/hr', postedDate: new Date().toISOString() },
      { id: '4', title: 'UX Research Intern', company: 'Airbnb', location: 'San Francisco, CA', description: 'Help define the future of travel...', source: 'Handshake', pay: '$40/hr', postedDate: new Date().toISOString() },
      { id: '5', title: 'Backend Developer', company: 'Stripe', location: 'Remote', description: 'Build the infrastructure of the internet economy...', source: 'LinkedIn', pay: '$150k/yr', postedDate: new Date().toISOString() },
    ];
    setJobs(mockJobs);
    setLoading(false);
  }, []);

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20">
      <header className="space-y-4">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
          <Sparkles size={14} className="text-indigo-600" />
          <span className="text-indigo-700 text-[10px] font-black uppercase tracking-widest">Global Marketplace</span>
        </div>
        <h1 className="text-4xl font-black text-stone-900 tracking-tight">Discover Opportunities</h1>
        <p className="text-stone-500 max-w-xl font-medium">Filter through thousands of listings across Handshake, Indeed, and LinkedIn to find your next career milestone.</p>
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
        <button className="flex items-center justify-center space-x-3 bg-white border border-stone-200 px-8 py-4 rounded-3xl font-black text-stone-600 hover:bg-stone-50 transition-all shadow-sm">
          <Filter size={20} />
          <span className="text-sm uppercase tracking-widest">Filters</span>
        </button>
      </div>

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
                <h3 className="font-black text-xl text-stone-900 group-hover:text-emerald-600 transition-colors">{job.title}</h3>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <span className="text-emerald-600 font-black text-sm">{job.company}</span>
                  <div className="flex items-center text-stone-400 text-xs font-bold">
                    <MapPin size={14} className="mr-1" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center text-stone-400 text-xs font-bold">
                    <DollarSign size={14} className="mr-1" />
                    <span>{job.pay}</span>
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
      />
    </div>
  );
}
