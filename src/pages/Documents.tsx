import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Trash2, Plus, FileCode, FileType, Loader2, X } from 'lucide-react';
import { db, auth, collection, onSnapshot, deleteDoc, doc, addDoc, getDoc, updateDoc } from '../firebase';
import { UserDocument } from '../types';
import { extractSkillsFromTranscript } from '../services/gemini';
import DocumentCard from '../components/DocumentCard';
import CombinedDocumentCard from '../components/CombinedDocumentCard';

export default function Documents() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState<'resume' | 'cover-letter' | 'transcript' | null>(null);
  const [uploadText, setUploadText] = useState('');

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

  const handleUpload = async () => {
    if (!auth.currentUser || !uploadText.trim() || !showUpload) return;
    setUploading(true);

    try {
      if (showUpload === 'transcript') {
        const extractedSkills = await extractSkillsFromTranscript(uploadText);
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), {
          type: 'transcript',
          content: uploadText,
          extractedSkills: extractedSkills,
          createdAt: new Date().toISOString(),
          name: 'Uploaded Transcript'
        });
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const existingSkills = docSnap.data()?.skills || [];
          const newSkills = Array.from(new Set([...existingSkills, ...extractedSkills]));
          await updateDoc(userRef, { skills: newSkills });
        }
        alert(`Transcript uploaded! Extracted ${extractedSkills.length} new skills.`);
      } else {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), {
          type: showUpload,
          content: uploadText,
          createdAt: new Date().toISOString(),
          name: `Uploaded ${showUpload.charAt(0).toUpperCase() + showUpload.slice(1)}`
        });
        alert(`${showUpload.charAt(0).toUpperCase() + showUpload.slice(1)} uploaded successfully!`);
      }

      setUploadText('');
      setShowUpload(null);
    } catch (error) {
      console.error("Failed to upload document", error);
      alert('Failed to process document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const generatedDocs = documents.filter(doc => doc.jobId);
  const userUploadedDocs = documents.filter(doc => !doc.jobId);

  const groupedGeneratedDocs = generatedDocs.reduce((acc, doc) => {
    const key = doc.jobId!;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(doc);
    return acc;
  }, {} as { [key: string]: UserDocument[] });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">My Documents</h1>
          <p className="text-stone-500">Manage your resumes, cover letters, and transcripts.</p>
        </div>
        <div className="flex items-center space-x-2">
           <button
            onClick={() => setShowUpload('resume')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
          >
            <Plus size={18} />
            <span>Upload Resume</span>
          </button>
          <button
            onClick={() => setShowUpload('cover-letter')}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus size={18} />
            <span>Upload Cover Letter</span>
          </button>
          <button
            onClick={() => setShowUpload('transcript')}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
          >
            <Plus size={18} />
            <span>Upload Transcript</span>
          </button>
        </div>
      </header>

      {showUpload && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-stone-900">Upload Your {showUpload}</h3>
            <button
              onClick={() => setShowUpload(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-stone-600 text-sm">
            Paste your {showUpload} text here.
            {showUpload === 'transcript' && " We'll analyze it to extract skills and automatically add them to your profile."}
          </p>
          <textarea
            placeholder={`Paste your ${showUpload} here...`}
            value={uploadText}
            onChange={(e) => setUploadText(e.target.value)}
            className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none"
          />
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setShowUpload(null)}
              className="px-4 py-2 text-stone-600 font-bold hover:bg-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !uploadText.trim()}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {uploading && <Loader2 className="animate-spin" size={18} />}
              <span>{uploading ? 'Uploading...' : 'Upload'}</span>
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
      ) : (
        <>
          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-4">Generated Resumes & Cover Letters</h2>
            {Object.keys(groupedGeneratedDocs).length === 0 ? (
              <div className="text-center py-10 bg-white rounded-3xl border border-stone-100">
                <FileText size={32} className="mx-auto text-stone-300 mb-2" />
                <p className="text-stone-500 text-sm">Documents you generate for jobs will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(groupedGeneratedDocs).map(([jobId, docs]) => (
                  <CombinedDocumentCard key={jobId} docs={docs} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 mb-4">My Uploaded Documents</h2>
            {userUploadedDocs.length === 0 ? (
               <div className="text-center py-10 bg-white rounded-3xl border border-stone-100">
                <FileText size={32} className="mx-auto text-stone-300 mb-2" />
                <p className="text-stone-500 text-sm">Your uploaded resumes, cover letters, and transcripts will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {userUploadedDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
