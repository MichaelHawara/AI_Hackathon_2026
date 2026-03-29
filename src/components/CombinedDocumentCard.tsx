import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import { FileCode, FileType, Trash2, FileText, FileDown, Briefcase, X, ExternalLink } from 'lucide-react';
import { UserDocument } from '../types';
import { format } from 'date-fns';
import { downloadUserContentAsPdf, downloadAsMarkdownFile } from '../utils/documentDownload';

interface CombinedDocumentCardProps {
  docs: UserDocument[];
  onDelete: (id: string) => void;
}

export default function CombinedDocumentCard({ docs, onDelete }: CombinedDocumentCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const downloadPdf = (content: string, type: string, jobTitle?: string) => {
    downloadUserContentAsPdf(
      content,
      type,
      `${type}-${jobTitle ? jobTitle.replace(/\s+/g, '-') : 'document'}`
    );
  };

  const resume = docs.find((d) => d.type === 'resume');
  const coverLetter = docs.find((d) => d.type === 'cover-letter');
  const jobId = docs[0]?.jobId;
  const jobTitle = docs[0]?.jobTitle;
  const jobCompany = docs[0]?.jobCompany;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setDetailOpen(true)}
        onClick={() => setDetailOpen(true)}
        className="bg-white p-4 rounded-2xl border border-stone-100 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer text-left"
      >
        <div className="h-32 bg-stone-50 rounded-lg mb-4 flex items-center justify-center text-stone-300 overflow-hidden pointer-events-none">
          {resume && coverLetter ? (
            <div className="flex w-full h-full">
              <div className="w-1/2 flex items-center justify-center bg-blue-50">
                <FileCode size={48} className="text-blue-300" />
              </div>
              <div className="w-1/2 flex items-center justify-center bg-emerald-50">
                <FileType size={48} className="text-emerald-300" />
              </div>
            </div>
          ) : resume ? (
            <FileCode size={48} className="text-blue-300" />
          ) : coverLetter ? (
            <FileType size={48} className="text-emerald-300" />
          ) : (
            <FileText size={48} />
          )}
        </div>
        <h3 className="font-bold text-stone-900 capitalize">
          {jobTitle || docs[0].name || 'Generated documents'}
        </h3>
        {jobCompany && <p className="text-sm text-stone-500">{jobCompany}</p>}
        <p className="text-xs text-stone-400 mb-3">
          Created {format(new Date(docs[0].createdAt), 'MMM d, yyyy')} · Tap to preview
        </p>
        <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {docs.map((doc) => (
            <button
              key={`${doc.id}-pdf`}
              type="button"
              onClick={() => downloadPdf(doc.content, doc.type, doc.jobTitle)}
              className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title={`Download ${doc.type} as PDF`}
            >
              <FileDown size={16} />
            </button>
          ))}
          {docs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => onDelete(doc.id)}
              className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title={`Delete ${doc.type}`}
            >
              <Trash2 size={16} />
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {detailOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doc-detail-title"
            onClick={() => setDetailOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-4 bg-stone-50">
                <div>
                  <h2 id="doc-detail-title" className="text-xl font-black text-stone-900">
                    {jobTitle || 'Job documents'}
                  </h2>
                  {jobCompany && (
                    <p className="text-stone-600 font-medium flex items-center gap-2 mt-1">
                      <Briefcase size={16} className="text-stone-400" />
                      {jobCompany}
                    </p>
                  )}
                  {jobId && (
                    <Link
                      to={`/?jobId=${encodeURIComponent(jobId)}`}
                      className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      <ExternalLink size={16} />
                      Open this job in CareerPath
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="p-2 rounded-full hover:bg-stone-200 text-stone-500"
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-stone-100 rounded-2xl p-4 bg-stone-50/50 min-h-[240px]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-blue-700 mb-3 flex items-center gap-2">
                    <FileCode size={18} />
                    Resume preview
                  </h3>
                  {resume ? (
                    <div className="prose prose-sm max-w-none text-stone-700 max-h-[50vh] overflow-y-auto">
                      <Markdown>{resume.content}</Markdown>
                    </div>
                  ) : (
                    <p className="text-stone-400 text-sm">No resume for this job yet.</p>
                  )}
                </div>
                <div className="border border-stone-100 rounded-2xl p-4 bg-stone-50/50 min-h-[240px]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-emerald-700 mb-3 flex items-center gap-2">
                    <FileType size={18} />
                    Cover letter preview
                  </h3>
                  {coverLetter ? (
                    <div className="prose prose-sm max-w-none text-stone-700 max-h-[50vh] overflow-y-auto">
                      <Markdown>{coverLetter.content}</Markdown>
                    </div>
                  ) : (
                    <p className="text-stone-400 text-sm">No cover letter for this job yet.</p>
                  )}
                </div>
              </div>
              {(resume || coverLetter) && (
                <div
                  className="p-4 border-t border-stone-100 bg-stone-50 flex flex-wrap items-center gap-3 justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-wrap gap-2">
                    {resume && (
                      <button
                        type="button"
                        onClick={() => downloadPdf(resume.content, 'resume', jobTitle)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                      >
                        <FileDown size={16} />
                        Resume PDF
                      </button>
                    )}
                    {coverLetter && (
                      <button
                        type="button"
                        onClick={() => downloadPdf(coverLetter.content, 'cover-letter', jobTitle)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                      >
                        <FileDown size={16} />
                        Cover letter PDF
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-stone-500 font-semibold hover:text-stone-800 underline"
                    onClick={() => {
                      docs.forEach((doc) =>
                        downloadAsMarkdownFile(doc.content, `${doc.type}-${doc.jobTitle ?? 'doc'}`)
                      );
                    }}
                  >
                    Export all as Markdown
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
