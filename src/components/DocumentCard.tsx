import { motion } from 'framer-motion';
import { FileCode, FileType, FileDown, Trash2, FileText } from 'lucide-react';
import { UserDocument } from '../types';
import { format } from 'date-fns';
import { downloadUserContentAsPdf } from '../utils/documentDownload';

interface DocumentCardProps {
  doc: UserDocument;
  onDelete: (id: string) => void;
}

export default function DocumentCard({ doc, onDelete }: DocumentCardProps) {
  const downloadPdf = () => {
    downloadUserContentAsPdf(
      doc.content,
      doc.type,
      `${doc.type}-${doc.jobTitle ?? doc.name ?? 'document'}`
    );
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-4 rounded-2xl border border-stone-100 flex items-start justify-between hover:border-blue-200 transition-colors group"
    >
      <div className="flex items-start space-x-4 flex-1">
        <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
          {getIcon(doc.type)}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-stone-900 capitalize">{doc.name || doc.type.replace('-', ' ')}</h3>
          <p className="text-xs text-stone-400">
            Created on {format(new Date(doc.createdAt), 'MMM d, yyyy')}
            {doc.sourceFileName && (
              <span className="block text-stone-500 mt-0.5">PDF: {doc.sourceFileName}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        <button
            type="button"
            onClick={downloadPdf}
            className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Download PDF"
        >
            <FileDown size={18} />
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}
