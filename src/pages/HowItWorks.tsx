/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { 
  Search, 
  UserCircle, 
  FileCheck, 
  TrendingUp, 
  MessageSquare, 
  Linkedin, 
  GraduationCap, 
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Globe,
  Database
} from "lucide-react";

const phases = [
  {
    title: "Exploration",
    subtitle: "Discover your path",
    icon: <Search className="w-6 h-6 text-blue-600" />,
    description: "Chat with our AI to understand job requirements, skill gaps, and learning resources. Search aggregated listings from Handshake, Indeed, and LinkedIn.",
    features: ["AI Career Chatbot", "Aggregated Job Search", "Skill Gap Analysis"],
    color: "bg-blue-50",
    borderColor: "border-blue-100"
  },
  {
    title: "Preparation",
    subtitle: "Build your foundation",
    icon: <UserCircle className="w-6 h-6 text-purple-600" />,
    description: "Sync your LinkedIn profile or build one from scratch. Upload transcripts for automatic skill extraction and course cross-referencing.",
    features: ["LinkedIn Auto-fill", "Transcript Skill Extraction", "Project Portfolio"],
    color: "bg-purple-50",
    borderColor: "border-purple-100"
  },
  {
    title: "Applications",
    subtitle: "Apply with precision",
    icon: <FileCheck className="w-6 h-6 text-emerald-600" />,
    description: "Generate fine-tuned resumes and cover letters for every job with one click. Modify and preview documents before you hit apply.",
    features: ["One-Click Resume Tailoring", "AI Cover Letters", "Document Management"],
    color: "bg-emerald-50",
    borderColor: "border-emerald-100"
  },
  {
    title: "Early Career",
    subtitle: "Launch and grow",
    icon: <TrendingUp className="w-6 h-6 text-amber-600" />,
    description: "Track your applications, manage your career documents, and continue growing with AI-suggested learning paths.",
    features: ["Application Tracking", "Document History", "Career Growth Roadmap"],
    color: "bg-amber-50",
    borderColor: "border-amber-100"
  }
];

const chatbotQuestions = [
  "What are the current things this job wants me to know?",
  "How can I improve my skills in this sector?",
  "What are good resources to learn this new thing?",
  "What do you suggest I do to better my odds?"
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <main className="pt-20 pb-24">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-[1.1]">
              Navigating the workforce, <span className="text-blue-600">simplified.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
              A fair, transparent, and responsible AI platform designed to reduce 
              uncertainty for students at every stage of their career journey.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                <ShieldCheck className="w-4 h-4" /> Responsible AI
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                <Globe className="w-4 h-4" /> Multi-Platform Search
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                <Database className="w-4 h-4" /> Data Transparency
              </div>
            </div>
          </motion.div>
        </section>

        {/* The Lifecycle Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {phases.map((phase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`p-8 rounded-[2rem] border ${phase.borderColor} ${phase.color} flex flex-col h-full`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-inherit">
                    {phase.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Phase 0{index + 1}</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{phase.title}</h3>
                <p className="text-sm font-medium text-slate-500 mb-4 uppercase tracking-wide">{phase.subtitle}</p>
                <p className="text-slate-600 leading-relaxed mb-8 flex-grow">
                  {phase.description}
                </p>
                <ul className="space-y-3">
                  {phase.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Feature Spotlight: AI Chatbot */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
          <div className="bg-slate-900 rounded-[3rem] overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-12 lg:p-20 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                  <MessageSquare className="w-3.5 h-3.5" /> AI Assistant
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  Your personal career coach, available 24/7.
                </h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  Ask complex questions about any job listing. Our AI cross-references 
                  your profile with job requirements to give you personalized advice.
                </p>
                <div className="space-y-3">
                  {chatbotQuestions.map((q, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 text-sm hover:bg-white/10 transition-colors cursor-default">
                      "{q}"
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800/50 p-12 lg:p-20 flex items-center justify-center border-l border-white/5">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <TrendingUp className="text-white w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Pathfinder AI</p>
                      <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-tighter">Online</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-4 h-80 overflow-y-auto bg-slate-50/50">
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none text-sm max-w-[80%] shadow-sm">
                        How can I improve my odds for this Software Engineer role?
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-white text-slate-700 p-3 rounded-2xl rounded-tl-none text-sm max-w-[80%] shadow-sm border border-slate-100">
                        Based on your transcript, you've taken Advanced Algorithms. Highlight your 'A' in that class! Also, the job mentions Docker—I suggest checking out this 1-hour crash course...
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-100">
                    <div className="bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-400">
                      Type your question...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Spotlight: Preparation */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                  <Linkedin className="w-10 h-10 text-[#0077B5] mb-4" />
                  <p className="text-sm font-bold">LinkedIn Sync</p>
                  <p className="text-xs text-slate-500 mt-2">Autofill your profile in seconds</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                  <GraduationCap className="w-10 h-10 text-purple-600 mb-4" />
                  <p className="text-sm font-bold">Transcript Analysis</p>
                  <p className="text-xs text-slate-500 mt-2">Turn classes into skills</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                  <Briefcase className="w-10 h-10 text-emerald-600 mb-4" />
                  <p className="text-sm font-bold">Job Aggregator</p>
                  <p className="text-xs text-slate-500 mt-2">Handshake + Indeed + LinkedIn</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                  <FileCheck className="w-10 h-10 text-amber-600 mb-4" />
                  <p className="text-sm font-bold">Smart Formatting</p>
                  <p className="text-xs text-slate-500 mt-2">Resume & Cover Letters</p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Built for the modern student.
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                We know you're busy. That's why we built tools to automate the tedious parts 
                of job hunting. From transcript skill extraction to LinkedIn profile creation, 
                we've got your back.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-emerald-100 p-1 rounded-full">
                    <ArrowRight className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Cross-check classes with course descriptions automatically.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-emerald-100 p-1 rounded-full">
                    <ArrowRight className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Filter by pay, radius, and remote/hybrid preferences.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-emerald-100 p-1 rounded-full">
                    <ArrowRight className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Preview and manage every document you've ever created.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 relative z-10">
              Start your journey today.
            </h2>
            <p className="text-blue-100 text-lg mb-12 max-w-xl mx-auto relative z-10">
              Join Pathfinder AI and take the stress out of your career navigation. 
              Fair, transparent, and built for you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <button className="w-full sm:w-auto bg-white text-blue-600 px-10 py-4 rounded-full font-bold hover:bg-blue-50 transition-all shadow-xl">
                Create Free Account
              </button>
              <button className="w-full sm:w-auto bg-blue-700 text-white px-10 py-4 rounded-full font-bold hover:bg-blue-800 transition-all">
                Explore Jobs
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
