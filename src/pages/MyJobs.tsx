import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Bookmark, CheckCircle, Clock, Trash2, ExternalLink, X, FileText, FileCode, FileDown, Eye } from 'lucide-react';
import Markdown from 'react-markdown';
import { db, auth, collection, onSnapshot, deleteDoc, doc, getDocs, query, where } from '../firebase';
import { Job, UserProfile } from '../types';
import JobModal from '../components/JobModal';
import { downloadUserContentAsPdf } from '../utils/documentDownload';

export default function MyJobs() {
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedJobDocuments, setSelectedJobDocuments] = useState<any[] | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubProfile = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      setUserProfile(doc.data() as UserProfile);
    });

    const savedJobsRef = collection(db, 'users', auth.currentUser.uid, 'saved_jobs');
    const unsubJobs = onSnapshot(savedJobsRef, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedJobs(jobs);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubJobs();
    };
  }, []);

  const removeJob = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'saved_jobs', id));
    } catch (error) {
      console.error("Failed to remove job", error);
    }
  };

  const fetchJobDocuments = async (jobId: string) => {
    if (!auth.currentUser) return;
    try {
      const docsRef = collection(db, 'users', auth.currentUser.uid, 'documents');
      const q = query(docsRef, where('jobId', '==', jobId));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSelectedJobDocuments(docs);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  };

  const handleViewFiles = (jobId: string) => {
    setSelectedJobId(jobId);
    fetchJobDocuments(jobId);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">My Jobs</h1>
        <p className="text-stone-500">Track the jobs you've saved and applied to.</p>
      </header>

      {/* Job Modal */}
      {selectedJob && (
        <JobModal
          job={selectedJob}
          userProfile={userProfile}
          onClose={() => setSelectedJob(null)}
          isSaved={savedJobs.some(j => j.id === selectedJob.id)}
          onSaveToggle={() => {
            const jobToToggle = savedJobs.find(j => j.id === selectedJob.id);
            if (jobToToggle) {
              removeJob(jobToToggle.id);
            }
            setSelectedJob(null);
          }}
        />
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <h2 className="text-xl font-bold text-stone-900">Preview - {previewDoc.type === 'resume' ? 'Resume' : 'Cover Letter'}</h2>
                <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-white prose prose-sm max-w-none text-stone-700">
                <Markdown>{previewDoc.content}</Markdown>
              </div>
              <div className="p-6 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    downloadUserContentAsPdf(
                      previewDoc.content,
                      previewDoc.type,
                      `${previewDoc.type}-${previewDoc.jobTitle?.replace(/\s+/g, '-') ?? 'document'}`
                    )
                  }
                  className="flex items-center space-x-2 text-emerald-700 font-bold hover:text-emerald-800 transition-colors"
                >
                  <FileDown size={18} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Job Files Modal */}
      <AnimatePresence>
        {selectedJobId && selectedJobDocuments !== null && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-900">Job Application Files</h2>
                <button onClick={() => { setSelectedJobId(null); setSelectedJobDocuments(null); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {selectedJobDocuments.length === 0 ? (
                  <p className="text-stone-500 text-center py-8">No documents generated for this job yet.</p>
                ) : (
                  selectedJobDocuments.map((doc: any) => (
                    <div key={doc.id} className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                          {doc.type === 'resume' ? <FileCode className="text-blue-500" /> : <FileText className="text-emerald-500" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-900 capitalize">{doc.type.replace('-', ' ')}</h3>
                          <p className="text-xs text-stone-400">Created on {new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-2 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadUserContentAsPdf(
                              doc.content,
                              doc.type,
                              `${doc.type}-${doc.jobTitle?.replace(/\s+/g, '-') ?? 'document'}`
                            )
                          }
                          className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <FileDown size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-6 border-t border-stone-100 bg-stone-50">
                <button
                  onClick={() => { setSelectedJobId(null); setSelectedJobDocuments(null); }}
                  className="w-full bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 shadow-lg shadow-stone-200"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
              onClick={() => setSelectedJob(item.jobData)}
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
                    onClick={(e) => { e.stopPropagation(); removeJob(item.id); }}
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
                <button
                  onClick={(e) => { e.stopPropagation(); handleViewFiles(item.jobData.id); }}
                  className="text-sm font-semibold text-emerald-600 hover:underline flex items-center transition-colors"
                >
                  View Files
                  <ExternalLink size={14} className="ml-1" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); alert('Feature not implemented yet.'); }}
                  className="bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors"
                >
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
