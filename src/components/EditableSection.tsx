import type { ReactNode } from 'react';

interface EditableSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  onAdd: () => void;
}

export default function EditableSection({ title, icon, children, onAdd }: EditableSectionProps) {
  const addLabel = `Add ${title} entry`;
  return (
    <section className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm" aria-labelledby={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {icon}
          <h3 id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`} className="font-bold text-xl text-stone-900">
            {title}
          </h3>
        </div>
        <button type="button" onClick={onAdd} className="text-emerald-600 font-bold text-sm" aria-label={addLabel}>
          + Add
        </button>
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </section>
  );
}
