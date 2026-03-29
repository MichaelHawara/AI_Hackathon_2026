import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import Markdown from 'react-markdown';
import type { Job, UserProfile, ApplicationFitEstimate } from '../types';
import { getJobCoachReply, formatGeminiError } from '../services/gemini';

interface JobCoachChatProps {
  job: Job;
  userProfile: UserProfile | null;
  fit: ApplicationFitEstimate;
}

export default function JobCoachChat({ job, userProfile, fit }: JobCoachChatProps) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    {
      role: 'bot',
      text:
        "Ask me anything about this role — skills to build, learning resources, interview prep, or how to stand out as a student. I'll tailor suggestions to your profile and this posting."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const fitSummary = `${fit.label} (${fit.score}%). ${fit.onetClusterTitle ? `Cluster: ${fit.onetClusterTitle}.` : ''} Factors: ${fit.factors.map((f) => f.label).join('; ')}.`;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const t = input.trim();
    if (!t || loading) return;
    setInput('');
    const next = [...messages, { role: 'user' as const, text: t }];
    setMessages(next);
    setLoading(true);
    try {
      const reply = await getJobCoachReply(t, job, userProfile, fitSummary, next);
      setMessages([...next, { role: 'bot', text: reply || 'No response.' }]);
    } catch (e) {
      setMessages([
        ...next,
        {
          role: 'bot',
          text: `Sorry — ${formatGeminiError(e)}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-violet-100/60 hover:bg-violet-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-violet-950">
          <Bot size={20} className="text-violet-700" aria-hidden />
          <span className="font-black text-sm uppercase tracking-widest">Role coach (this job)</span>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-violet-100">
          <p className="text-[11px] text-violet-900/80 leading-snug">
            Powered by Gemini with your profile + this listing + O*NET-style skill context. Not financial or legal advice.
          </p>
          <div className="h-48 overflow-y-auto rounded-xl bg-white border border-violet-100 p-3 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2 ${
                    m.role === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-stone-50 text-stone-800 border border-stone-100 rounded-tl-sm prose prose-sm max-w-none prose-p:my-1'
                  }`}
                >
                  {m.role === 'bot' ? (
                    <Markdown>{m.text}</Markdown>
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-violet-700 text-xs">
                <Loader2 className="animate-spin" size={14} />
                Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void send()}
              placeholder="e.g. What should I learn first for this role?"
              className="flex-1 rounded-xl border border-violet-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-violet-600 text-white px-4 py-2 disabled:opacity-50 hover:bg-violet-700"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
