import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, DollarSign, Clock, ExternalLink, FileText, FileCode, Sparkles, Loader2, Bookmark, BookmarkCheck, Eye, CheckCircle, FileDown } from 'lucide-react';
import Markdown from 'react-markdown';
import { Job, UserProfile } from '../types';
import { generateResume, generateCoverLetter, formatGeminiError } from '../services/gemini';
import { downloadUserContentAsPdf, downloadAsMarkdownFile } from '../utils/documentDownload';
import { getJobApplyUrl } from '../utils/jobLinks';
import { db, auth, collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, query, where, onSnapshot, onAuthStateChanged } from '../firebase';

interface JobModalProps {
  job: Job | null;
  onClose: () => void;
  userProfile: UserProfile | null;
  isSaved?: boolean;
  onSaveToggle?: (job: Job) => void;
}

export default function JobModal({ job, onClose, userProfile, isSaved = false, onSaveToggle }: JobModalProps) {
  const [generating, setGenerating] = useState<'resume' | 'cover-letter' | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'resume' | 'cover-letter' | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!job) {
      setGeneratedDocs({});
      return;
    }
    setGeneratedDocs({});
    let cancelled = false;
    let unsubDocs: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubDocs?.();
      unsubDocs = undefined;
      if (cancelled) return;
      if (!user) {
        setGeneratedDocs({});
        return;
      }
      const q = query(collection(db, 'users', user.uid, 'documents'), where('jobId', '==', job.id));
      unsubDocs = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          // Ignore stale empty cache reads so we don't briefly clear resume/cover letter before server data arrives.
          if (snap.empty && snap.metadata.fromCache) {
            return;
          }
          const next: Record<string, string> = {};
          snap.forEach((d) => {
            const data = d.data() as { type?: string; content?: string };
            if (data.type === 'resume' || data.type === 'cover-letter') {
              next[data.type] = data.content ?? '';
            }
          });
          setGeneratedDocs(next);
        },
        (e) => console.error('Failed to load saved documents for job', e)
      );
    });
    return () => {
      cancelled = true;
      unsubDocs?.();
      unsubAuth();
    };
  }, [job?.id]);

  if (!job) return null;

  if (previewType && previewContent) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h2 className="text-xl font-bold text-stone-900">Preview - {previewType === 'resume' ? 'Resume' : 'Cover Letter'}</h2>
              <button onClick={() => { setPreviewType(null); setPreviewContent(null); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors" aria-label="Close preview">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-white prose prose-sm max-w-none text-stone-700">
              <Markdown>{previewContent}</Markdown>
            </div>
            <div className="p-6 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    downloadUserContentAsPdf(
                      previewContent,
                      previewType,
                      `${previewType}-${job?.title ?? 'document'}`
                    )
                  }
                  className="flex items-center space-x-2 text-emerald-700 font-bold hover:text-emerald-800 transition-colors"
                >
                  <FileDown size={18} />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadAsMarkdownFile(previewContent, `${previewType}-${job?.title ?? 'document'}`)}
                  className="text-sm text-stone-500 font-semibold hover:text-stone-800 underline underline-offset-2"
                >
                  Also export as Markdown
                </button>
              </div>
              <button
                onClick={() => { setPreviewType(null); setPreviewContent(null); }}
                className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
              >
                Back
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const handleGenerate = async (type: 'resume' | 'cover-letter') => {
    if (!auth.currentUser) {
      alert("Please log in to use this feature.");
      return;
    }
    if (!userProfile?.experience?.length || !userProfile?.skills?.length) {
      alert("Your profile is incomplete! Please go to the Account page to fill in your experience and skills before generating documents.");
      return;
    }
    if (!auth.currentUser || !userProfile) return;
    setGenerating(type);
    setSuccess(null);

    try {
      const content =
        type === 'resume'
          ? await generateResume(userProfile, job)
          : await generateCoverLetter(userProfile, job);

      if (content) {
        const name =
          type === 'resume'
            ? `Resume — ${job!.title}`
            : `Cover letter — ${job!.title}`;
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), {
          type,
          name,
          content,
          jobId: job!.id,
          jobTitle: job!.title,
          jobCompany: job!.company,
          createdAt: new Date().toISOString()
        });
        setGeneratedDocs({ ...generatedDocs, [type]: content });
        setSuccess(`${type === 'resume' ? 'Resume' : 'Cover letter'} saved to Documents (linked to this job).`);
      }
    } catch (error) {
      console.error('Generation failed', error);
      setSuccess(null);
      alert(`Could not generate document: ${formatGeminiError(error)}`);
    } finally {
      setGenerating(null);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser || !job) return;
    if (onSaveToggle) {
      onSaveToggle(job);
    } else {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'saved_jobs', job.id);
      if (isSaved) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, {
          jobId: job.id,
          status: 'saved',
          savedAt: serverTimestamp(),
          jobData: job
        });
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900">Job Details</h2>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSave}
                aria-label={isSaved ? 'Remove from saved jobs' : 'Save job'}
                className={`p-2 rounded-full transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'bg-stone-100 hover:bg-stone-200'}`}
              >
                {isSaved ? <BookmarkCheck size={20} aria-hidden /> : <Bookmark size={20} aria-hidden />}
              </button>
              <button type="button" onClick={onClose} aria-label="Close job details" className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X size={20} aria-hidden />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-stone-900 mb-2">{job.title}</h1>
              <p className="text-emerald-600 font-bold text-lg mb-4">{job.company}</p>
              
              <div className="flex flex-wrap gap-4 text-stone-500 text-sm">
                <div className="flex items-center">
                  <MapPin size={16} className="mr-2" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign size={16} className="mr-2" />
                  <span>{job.pay}</span>
                </div>
                <div className="flex items-center">
                  <Clock size={16} className="mr-2" />
                  <span>{job.source}</span>
                </div>
                {job.workType && (
                  <div className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                    {job.workType}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <section>
                <h3 className="font-bold text-stone-900 mb-2 uppercase text-xs tracking-widest">Description</h3>
                <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </section>

              {job.requirements && job.requirements.length > 0 && (
                <section>
                  <h3 className="font-bold text-stone-900 mb-3 uppercase text-xs tracking-widest">Requirements</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.requirements.map((req, idx) => (
                      <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                        {req}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <div className="flex items-center space-x-2 mb-4">
                  <Sparkles className="text-emerald-600" size={20} />
                  <h3 className="font-bold text-emerald-900">AI Career Tools</h3>
                </div>
                <p className="text-emerald-800 text-sm mb-6">
                  Generate tailored documents for this specific role using your profile information.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <button
                    disabled={!!generating}
                    onClick={() => generatedDocs['resume'] ? (setPreviewContent(generatedDocs['resume']), setPreviewType('resume')) : handleGenerate('resume')}
                    className="flex items-center justify-center space-x-2 bg-white text-emerald-700 p-4 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all font-bold disabled:opacity-50"
                  >
                    {generating === 'resume' ? <Loader2 className="animate-spin" size={20} /> : generatedDocs['resume'] ? <Eye size={20} /> : <FileCode size={20} />}
                    <span>{generatedDocs['resume'] ? 'Preview Resume' : 'Format Resume'}</span>
                  </button>
                  <button
                    disabled={!!generating}
                    onClick={() => generatedDocs['cover-letter'] ? (setPreviewContent(generatedDocs['cover-letter']), setPreviewType('cover-letter')) : handleGenerate('cover-letter')}
                    className="flex items-center justify-center space-x-2 bg-white text-emerald-700 p-4 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all font-bold disabled:opacity-50"
                  >
                    {generating === 'cover-letter' ? <Loader2 className="animate-spin" size={20} /> : generatedDocs['cover-letter'] ? <Eye size={20} /> : <FileText size={20} />}
                    <span>{generatedDocs['cover-letter'] ? 'Preview Letter' : 'Format Cover Letter'}</span>
                  </button>
                </div>

                {(generatedDocs['resume'] || generatedDocs['cover-letter']) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-emerald-200">
                    {generatedDocs['resume'] && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadUserContentAsPdf(
                            generatedDocs['resume'],
                            'resume',
                            `resume-${job!.title ?? 'document'}`
                          )
                        }
                        className="flex items-center justify-center space-x-2 bg-emerald-100 text-emerald-700 p-3 rounded-xl border border-emerald-300 hover:bg-emerald-200 transition-all font-bold text-sm"
                      >
                        <FileDown size={16} />
                        <span>Download resume (PDF)</span>
                      </button>
                    )}
                    {generatedDocs['cover-letter'] && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadUserContentAsPdf(
                            generatedDocs['cover-letter'],
                            'cover-letter',
                            `cover-letter-${job!.title ?? 'document'}`
                          )
                        }
                        className="flex items-center justify-center space-x-2 bg-emerald-100 text-emerald-700 p-3 rounded-xl border border-emerald-300 hover:bg-emerald-200 transition-all font-bold text-sm"
                      >
                        <FileDown size={16} />
                        <span>Download letter (PDF)</span>
                      </button>
                    )}
                  </div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center space-x-2 text-emerald-700 font-bold text-sm p-3 bg-white rounded-xl border border-emerald-200"
                  >
                    <CheckCircle size={18} />
                    <span>{success}</span>
                  </motion.div>
                )}
              </section>
            </div>
          </div>

          <div className="p-6 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3">
            <a
              href={getJobApplyUrl(job)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 font-bold hover:text-stone-900 flex items-center transition-colors"
            >
              <ExternalLink size={18} className="mr-2" />
              Open on {job.source}
            </a>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="text-stone-600 font-bold hover:text-stone-900 px-6 py-3 rounded-xl transition-colors"
              >
                Close
              </button>
              <a
                href={getJobApplyUrl(job)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 shadow-lg shadow-stone-200 transition-all"
              >
                Apply Now
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
