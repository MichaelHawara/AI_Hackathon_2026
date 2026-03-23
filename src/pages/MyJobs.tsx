import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Bookmark, CheckCircle, Clock, Trash2, ExternalLink } from 'lucide-react';
import { db, auth, collection, onSnapshot, deleteDoc, doc } from '../firebase';
import { Job } from '../types';

export default function MyJobs() {
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const savedJobsRef = collection(db, 'users', auth.currentUser.uid, 'saved_jobs');
    const unsubscribe = onSnapshot(savedJobsRef, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedJobs(jobs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const removeJob = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'saved_jobs', id));
    } catch (error) {
      console.error("Failed to remove job", error);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">My Jobs</h1>
        <p className="text-stone-500">Track the jobs you've saved and applied to.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-stone-200 animate-pulse rounded-3xl"></div>
          ))
        ) : savedJobs.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-stone-100">
            <Bookmark size={48} className="mx-auto text-stone-200 mb-4" />
            <p className="text-stone-500">You haven't saved any jobs yet. Browse the Search page to find opportunities!</p>
          </div>
        ) : (
          savedJobs.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Briefcase size={24} />
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    item.status === 'applied' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {item.status}
                  </span>
                  <button
                    onClick={() => removeJob(item.id)}
                    className="p-2 text-stone-300 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-lg text-stone-900 mb-1">{item.jobData.title}</h3>
              <p className="text-emerald-600 font-medium text-sm mb-4">{item.jobData.company}</p>

              <div className="space-y-2 mb-6 text-stone-500 text-xs">
                <div className="flex items-center">
                  <Clock size={14} className="mr-2" />
                  <span>Saved on {new Date(item.savedAt?.seconds * 1000).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle size={14} className="mr-2" />
                  <span>{item.status === 'applied' ? 'Application submitted' : 'Ready to apply'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                <button className="text-sm font-semibold text-emerald-600 hover:underline flex items-center">
                  View Files
                  <ExternalLink size={14} className="ml-1" />
                </button>
                <button className="bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors">
                  Update Status
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
