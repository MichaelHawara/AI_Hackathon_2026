import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Trash2, Plus, FileCode, FileType, Loader2, X } from 'lucide-react';
import { db, auth, collection, onSnapshot, deleteDoc, doc, addDoc } from '../firebase';
import { UserDocument } from '../types';
import { format } from 'date-fns';
import { extractSkillsFromTranscript } from '../services/gemini';

export default function Documents() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);
  const [showTranscriptUpload, setShowTranscriptUpload] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const docsRef = collection(db, 'users', auth.currentUser.uid, 'documents');
    const unsubscribe = onSnapshot(docsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument));
      setDocuments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'documents', id));
    } catch (error) {
      console.error("Failed to delete document", error);
    }
  };

  const handleTranscriptUpload = async () => {
    if (!auth.currentUser || !transcriptText.trim()) return;
    setUploadingTranscript(true);

    try {
      // Extract skills from transcript using Gemini
      const extractedSkills = await extractSkillsFromTranscript(transcriptText);

      // Save transcript to documents
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), {
        type: 'transcript',
        content: transcriptText,
        extractedSkills: extractedSkills,
        createdAt: new Date().toISOString()
      });

      // Also add skills to user profile
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await (
        //@ts-ignore
        db.getDoc?.(userRef) || (await import('../firebase')).getDoc(userRef)
      );

      if (docSnap?.exists?.()) {
        const existingSkills = docSnap.data()?.skills || [];
        const newSkills = Array.from(new Set([...existingSkills, ...extractedSkills]));
        await (await import('../firebase')).updateDoc(userRef, { skills: newSkills });
      }

      setTranscriptText('');
      setShowTranscriptUpload(false);
      alert(`Transcript uploaded! Extracted ${extractedSkills.length} new skills.`);
    } catch (error) {
      console.error("Failed to upload transcript", error);
      alert('Failed to process transcript. Please try again.');
    } finally {
      setUploadingTranscript(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'resume': return <FileCode className="text-blue-500" />;
      case 'cover-letter': return <FileType className="text-emerald-500" />;
      case 'transcript': return <FileText className="text-orange-500" />;
      default: return <FileText className="text-stone-500" />;
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">My Documents</h1>
          <p className="text-stone-500">Manage your resumes, cover letters, and transcripts.</p>
        </div>
        <button
          onClick={() => setShowTranscriptUpload(true)}
          className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
        >
          <Plus size={18} />
          <span>Upload Transcript</span>
        </button>
      </header>

      {/* Transcript Upload Modal */}
      {showTranscriptUpload && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 space-y-4 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-stone-900">Upload Your Transcript</h3>
            <button
              onClick={() => setShowTranscriptUpload(false)}
              className="text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          </div>
          <p className="text-stone-600 text-sm">
            Paste your transcript text here. We'll analyze it to extract skills and automatically add them to your profile.
          </p>
          <textarea
            placeholder="Paste your transcript or course descriptions here..."
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            className="w-full h-40 p-4 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowTranscriptUpload(false)}
              className="px-4 py-2 text-stone-600 font-bold hover:bg-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTranscriptUpload}
              disabled={uploadingTranscript || !transcriptText.trim()}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {uploadingTranscript && <Loader2 className="animate-spin" size={18} />}
              <span>{uploadingTranscript ? 'Analyzing...' : 'Upload & Analyze'}</span>
            </button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-stone-200 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-100">
          <FileText size={48} className="mx-auto text-stone-200 mb-4" />
          <p className="text-stone-500">No documents found. Start by generating a resume!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-2xl border border-stone-100 flex items-start justify-between hover:border-emerald-200 transition-colors group"
            >
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  {getIcon(doc.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-stone-900 capitalize">{doc.type.replace('-', ' ')}</h3>
                  <p className="text-xs text-stone-400">
                    Created on {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                  </p>
                  {doc.type === 'transcript' && (doc as any).extractedSkills && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(doc as any).extractedSkills.slice(0, 3).map((skill: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-[10px] font-bold">
                          {skill}
                        </span>
                      ))}
                      {(doc as any).extractedSkills.length > 3 && (
                        <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-[10px] font-bold">
                          +{(doc as any).extractedSkills.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const element = document.createElement('a');
                    const file = new Blob([doc.content], { type: 'text/markdown' });
                    element.href = URL.createObjectURL(file);
                    element.download = `${doc.type}-${doc.jobTitle ? doc.jobTitle.replace(/\s+/g, '-') : 'untitled'}.md`;
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                  }}
                  className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
