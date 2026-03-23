import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, DollarSign, Clock, ExternalLink, FileText, FileCode, Sparkles, Loader2 } from 'lucide-react';
import { Job, UserProfile } from '../types';
import { generateResume, generateCoverLetter } from '../services/gemini';
import { db, auth, collection, addDoc, serverTimestamp } from '../firebase';

interface JobModalProps {
  job: Job | null;
  onClose: () => void;
  userProfile: UserProfile | null;
}

export default function JobModal({ job, onClose, userProfile }: JobModalProps) {
  const [generating, setGenerating] = useState<'resume' | 'cover-letter' | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!job) return null;

  const handleGenerate = async (type: 'resume' | 'cover-letter') => {
    if (!auth.currentUser || !userProfile) return;
    setGenerating(type);
    setSuccess(null);

    try {
      const content = type === 'resume' 
        ? await generateResume(userProfile, job.description)
        : await generateCoverLetter(userProfile, job.description);

      if (content) {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), {
          type,
          content,
          jobId: job.id,
          createdAt: new Date().toISOString()
        });
        setSuccess(`AI ${type.replace('-', ' ')} generated and saved to Documents!`);
      }
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setGenerating(null);
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
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
              <X size={20} />
            </button>
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
              </div>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="font-bold text-stone-900 mb-2 uppercase text-xs tracking-widest">Description</h3>
                <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </section>

              <section className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                <div className="flex items-center space-x-2 mb-4">
                  <Sparkles className="text-emerald-600" size={20} />
                  <h3 className="font-bold text-emerald-900">AI Career Tools</h3>
                </div>
                <p className="text-emerald-800 text-sm mb-6">
                  Generate tailored documents for this specific role using your profile information.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    disabled={!!generating}
                    onClick={() => handleGenerate('resume')}
                    className="flex items-center justify-center space-x-2 bg-white text-emerald-700 p-4 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all font-bold disabled:opacity-50"
                  >
                    {generating === 'resume' ? <Loader2 className="animate-spin" /> : <FileCode size={20} />}
                    <span>Format Resume</span>
                  </button>
                  <button
                    disabled={!!generating}
                    onClick={() => handleGenerate('cover-letter')}
                    className="flex items-center justify-center space-x-2 bg-white text-emerald-700 p-4 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all font-bold disabled:opacity-50"
                  >
                    {generating === 'cover-letter' ? <Loader2 className="animate-spin" /> : <FileText size={20} />}
                    <span>Format Cover Letter</span>
                  </button>
                </div>

                {success && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center text-emerald-700 font-bold text-sm"
                  >
                    {success}
                  </motion.p>
                )}
              </section>
            </div>
          </div>

          <div className="p-6 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
            <button className="text-stone-500 font-bold hover:text-stone-900 flex items-center">
              <ExternalLink size={18} className="mr-2" />
              View on {job.source}
            </button>
            <button className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 shadow-lg shadow-stone-200">
              Apply Now
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
