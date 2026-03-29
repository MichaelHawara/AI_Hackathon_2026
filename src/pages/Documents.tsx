import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Loader2, X, Upload } from 'lucide-react';
import { db, auth, collection, onSnapshot, deleteDoc, doc, addDoc, getDoc, updateDoc } from '../firebase';
import { UserDocument } from '../types';
import { extractSkillsFromTranscript } from '../services/gemini';
import { extractTextFromPdfFile } from '../utils/extractPdfText';
import DocumentCard from '../components/DocumentCard';
import CombinedDocumentCard from '../components/CombinedDocumentCard';

export default function Documents() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState<'resume' | 'cover-letter' | 'transcript' | null>(null);
  const [uploadText, setUploadText] = useState('');
  const [pdfFileLabel, setPdfFileLabel] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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

  const handlePdfPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file (.pdf).');
      return;
    }
    setUploading(true);
    setPdfFileLabel(file.name);
    try {
      const text = await extractTextFromPdfFile(file);
      if (!text.trim()) {
        alert('No text could be extracted from this PDF. Try a text-based PDF or paste content manually.');
        setPdfFileLabel(null);
        return;
      }
      setUploadText(text);
    } catch (err) {
      console.error(err);
      alert('Could not read this PDF. Try another file.');
      setPdfFileLabel(null);
    } finally {
      setUploading(false);
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
          name: pdfFileLabel ? `Transcript (${pdfFileLabel})` : 'Uploaded Transcript',
          ...(pdfFileLabel ? { sourceFileName: pdfFileLabel } : {})
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
        const label =
          showUpload === 'resume' ? 'Resume' : 'Cover letter';
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), {
          type: showUpload,
          content: uploadText,
          createdAt: new Date().toISOString(),
          name: pdfFileLabel ? `${label} (${pdfFileLabel})` : `Uploaded ${label}`,
          ...(pdfFileLabel ? { sourceFileName: pdfFileLabel } : {})
        });
        alert(`${label} uploaded successfully!`);
      }

      setUploadText('');
      setPdfFileLabel(null);
      setShowUpload(null);
    } catch (error) {
      console.error("Failed to upload document", error);
      alert('Failed to process document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const openPdfPicker = () => pdfInputRef.current?.click();

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
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        aria-hidden
        onChange={handlePdfPick}
      />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">My Documents</h1>
          <p className="text-stone-500">Upload PDFs or use AI-generated documents from jobs.</p>
        </div>
        <div className="flex items-center space-x-2">
           <button
            type="button"
            onClick={() => { setShowUpload('resume'); setUploadText(''); setPdfFileLabel(null); }}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
          >
            <Plus size={18} />
            <span>Upload Resume</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowUpload('cover-letter'); setUploadText(''); setPdfFileLabel(null); }}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus size={18} />
            <span>Upload Cover Letter</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowUpload('transcript'); setUploadText(''); setPdfFileLabel(null); }}
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
            <h3 className="font-bold text-lg text-stone-900">Upload your {showUpload.replace('-', ' ')} (PDF)</h3>
            <button
              type="button"
              onClick={() => { setShowUpload(null); setPdfFileLabel(null); setUploadText(''); }}
              className="text-stone-400 hover:text-stone-600"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-stone-600 text-sm">
            Choose a <strong>.pdf</strong> file. We extract text in your browser and store that text in your account (not the binary file).
            {showUpload === 'transcript' && " We'll analyze it to extract skills and add them to your profile."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openPdfPicker}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              Choose PDF
            </button>
            {pdfFileLabel && (
              <span className="text-sm text-stone-600">
                Loaded: <span className="font-semibold text-stone-900">{pdfFileLabel}</span>
              </span>
            )}
          </div>
          {uploadText.trim() ? (
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Extracted text preview (editable)</p>
              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                className="w-full min-h-[200px] p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-y text-sm"
              />
            </div>
          ) : (
            <p className="text-stone-400 text-sm italic">No PDF loaded yet.</p>
          )}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => { setShowUpload(null); setPdfFileLabel(null); setUploadText(''); }}
              className="px-4 py-2 text-stone-600 font-bold hover:bg-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading || !uploadText.trim()}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {uploading && <Loader2 className="animate-spin" size={18} />}
              <span>{uploading ? 'Saving…' : 'Save to documents'}</span>
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
                <p className="text-stone-500 text-sm">Your uploaded PDFs (stored as extracted text) appear here.</p>
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
