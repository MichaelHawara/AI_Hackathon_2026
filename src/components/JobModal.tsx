import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, DollarSign, Clock, ExternalLink, FileText, FileCode, Sparkles, Loader2, Bookmark, BookmarkCheck, Eye, Download, CheckCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import { Job, UserProfile } from '../types';
import { generateResume, generateCoverLetter } from '../services/gemini';
import { db, auth, collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from '../firebase';

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
              <button onClick={() => { setPreviewType(null); setPreviewContent(null); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-white prose prose-sm max-w-none">
              <Markdown className="text-stone-700">{previewContent}</Markdown>
            </div>
            <div className="p-6 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3">
              <button
                onClick={() => downloadDocument(previewContent, previewType)}
                className="flex items-center space-x-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
              >
                <Download size={18} />
                <span>Download</span>
              </button>
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
    if (!auth.currentUser || !userProfile) return;
    setGenerating(type);
    setSuccess(null);

    try {
      const content = type === 'resume'
        ? await generateResume(userProfile, job!.description)
        : await generateCoverLetter(userProfile, job!.description);

      if (content) {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), {
          type,
          content,
          jobId: job!.id,
          jobTitle: job!.title,
          createdAt: new Date().toISOString()
        });
        setGeneratedDocs({ ...generatedDocs, [type]: content });
        setSuccess(`AI ${type.replace('-', ' ')} generated and saved to Documents!`);
      }
    } catch (error) {
      console.error("Generation failed", error);
      setSuccess(null);
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

  const downloadDocument = (content: string, type: 'resume' | 'cover-letter') => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${type}-${job!.title?.replace(/\s+/g, '-')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
                onClick={handleSave}
                className={`p-2 rounded-full transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'bg-stone-100 hover:bg-stone-200'}`}
              >
                {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
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

            <div className="space-y-6">
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
                        onClick={() => downloadDocument(generatedDocs['resume'], 'resume')}
                        className="flex items-center justify-center space-x-2 bg-emerald-100 text-emerald-700 p-3 rounded-xl border border-emerald-300 hover:bg-emerald-200 transition-all font-bold text-sm"
                      >
                        <Download size={16} />
                        <span>Download Resume</span>
                      </button>
                    )}
                    {generatedDocs['cover-letter'] && (
                      <button
                        onClick={() => downloadDocument(generatedDocs['cover-letter'], 'cover-letter')}
                        className="flex items-center justify-center space-x-2 bg-emerald-100 text-emerald-700 p-3 rounded-xl border border-emerald-300 hover:bg-emerald-200 transition-all font-bold text-sm"
                      >
                        <Download size={16} />
                        <span>Download Letter</span>
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
            <button className="text-stone-500 font-bold hover:text-stone-900 flex items-center transition-colors">
              <ExternalLink size={18} className="mr-2" />
              View on {job.source}
            </button>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="text-stone-600 font-bold hover:text-stone-900 px-6 py-3 rounded-xl transition-colors"
              >
                Close
              </button>
              <button className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 shadow-lg shadow-stone-200 transition-all">
                Apply Now
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
