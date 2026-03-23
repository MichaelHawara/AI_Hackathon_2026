import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Trash2, Plus, FileCode, FileType } from 'lucide-react';
import { db, auth, collection, onSnapshot, deleteDoc, doc } from '../firebase';
import { UserDocument } from '../types';
import { format } from 'date-fns';

export default function Documents() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);

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
        <button className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100">
          <Plus size={18} />
          <span>Upload New</span>
        </button>
      </header>

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
              className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center justify-between hover:border-emerald-200 transition-colors group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center">
                  {getIcon(doc.type)}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 capitalize">{doc.type.replace('-', ' ')}</h3>
                  <p className="text-xs text-stone-400">
                    Created on {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                  <Download size={18} />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
