import { useState } from 'react';
import { Info, ShieldAlert, TrendingUp } from 'lucide-react';
import type { ApplicationFitEstimate } from '../types';

export default function ApplicationFitPanel({ fit }: { fit: ApplicationFitEstimate }) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-indigo-900">
          <TrendingUp className="shrink-0 text-indigo-600" size={22} aria-hidden />
          <div>
            <h3 className="font-black text-sm uppercase tracking-widest text-indigo-800">Application alignment</h3>
            <p className="text-[11px] text-indigo-600/90 font-medium">
              How well your profile matches this posting (not a hiring guarantee)
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black text-indigo-700 tabular-nums">{fit.score}%</div>
          <div className="text-xs font-bold text-indigo-500">{fit.label}</div>
          <div className="text-[10px] uppercase tracking-wider text-stone-500 mt-1">
            Confidence: {fit.confidence}
          </div>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-indigo-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
          style={{ width: `${fit.score}%` }}
        />
      </div>

      {fit.onetClusterTitle && (
        <p className="mt-3 text-xs text-stone-600">
          <span className="font-bold text-stone-800">O*NET-inspired cluster:</span> {fit.onetClusterTitle}
          {fit.matchedOnetSkills.length > 0 && (
            <span className="text-stone-500"> — aligned skills include {fit.matchedOnetSkills.slice(0, 5).join(', ')}
              {fit.matchedOnetSkills.length > 5 ? '…' : ''}
            </span>
          )}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowWhy(!showWhy)}
        className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-900"
      >
        <Info size={14} aria-hidden />
        {showWhy ? 'Hide factors' : 'Why this score?'}
      </button>

      {showWhy && (
        <ul className="mt-2 space-y-2 text-xs text-stone-700 border-t border-indigo-100 pt-3">
          {fit.factors.map((f, i) => (
            <li key={i}>
              <span className="font-bold text-stone-900">{f.label}:</span> {f.detail}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-950 leading-snug">
        <ShieldAlert className="shrink-0 text-amber-700 mt-0.5" size={16} aria-hidden />
        <p>{fit.disclaimer}</p>
      </div>
    </div>
  );
}
