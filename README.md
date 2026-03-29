# CareerPath AI - Project Documentation

## Overview

CareerPath AI is an AI-powered career navigation platform designed specifically for students. It helps users navigate the workforce by providing intelligent job matching, AI-powered resume and cover letter generation, and real-time career guidance through an AI chatbot.

**Mission**: Reduce uncertainty and stress for students navigating the workforce while building systems that are fair, transparent, and responsible from development through operations.

## Key Features

### 🔐 Authentication & Onboarding

- Multi-step onboarding flow (3 comprehensive steps)
- Google Sign-in and Email/Password authentication
- LinkedIn profile import (Relevance AI and/or public-page flow) for quicker profile setup
- Complete profile data: experience, education, projects, research, skills

### 🔍 Job Discovery & Management

- Aggregates jobs from **Handshake**, **Indeed**, and **LinkedIn**
- Personalized job recommendations on Home page
- Advanced filtering and search across all sources
- Save/bookmark jobs for later review
- Track saved and applied-to positions

### 🤖 AI-Powered Features

- **AI Resume Generator**: Creates tailored, ATS-optimized resumes for each job
- **AI Cover Letter Writer**: Generates compelling personalized cover letters
- **Career Chatbot**: 24/7 AI assistant for career advice, skill development, interview prep
- **Transcript Analyzer**: Extracts professional skills from course descriptions

### 📄 Document Management

- Store and manage all generated resumes and cover letters
- Upload transcripts and auto-extract relevant skills
- Preview documents before downloading
- Download as markdown files for easy editing
- Track documents by creation date and associated job

### 💼 Application Tracking

- "My Jobs" page shows all saved and applied positions
- "View Files" to see all documents created for each job application
- Direct preview and download from job card
- Application status tracking

### 👤 Account Management

- Comprehensive profile management
- View and edit all user information
- Timeline view of experience and education
- Skill management interface
- LinkedIn URL import and profile fields (see server and `docs/` notes)

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Router v7** - Client-side routing
- **Lucide Icons** - Beautiful icon library

### Backend & services

- **Node.js + Express** (`server/`) - REST API for jobs and LinkedIn profile import; in development, the same process runs Vite in middleware mode for the React app
- **Firebase Authentication** - Google OAuth, Email/Password
- **Firestore** - Document database for user data
- **Google Gemini API** - AI capabilities for content generation and analysis (client uses `VITE_*` keys from env)
- **Optional: Relevance AI** - Server-side webhook for structured LinkedIn import (`RELEVANCEAI_*` in `.env.local`, see `.env.example`)

### AI Services Integrated

- Career advice generation
- Resume customization
- Cover letter writing
- Transcript skill extraction

## Prerequisites

- Node.js v18+
- Firebase account with Firestore enabled
- Google Gemini API key

## How to run

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in values. The dev server loads `.env.local` from the project root (see `server/index.ts`). Vite only exposes variables prefixed with `VITE_` to browser code.

Required for the client: `VITE_GEMINI_API_KEY`, `VITE_FIREBASE_*`, etc., as listed in `.env.example`. Optional server-only keys (LinkedIn import): `RELEVANCEAI_API_KEY`, `RELEVANCEAI_WEBHOOK_URL`.

### 3. Start development (full stack)

```bash
npm run dev
```

This runs **Express + Vite** together: the API and the React app share one process. Default URL is **`http://localhost:3000`** (override with `PORT`, bind address with `HOST`, e.g. `PORT=3001 npm run dev`).

### 4. Production frontend build

```bash
npm run build
```

Output goes to `dist/`. Rollup bundle analysis (if enabled in `vite.config.ts`) is written under `reports/` (gitignored).

### 5. Preview the static build only

```bash
npm run preview
```

This is **Vite’s static preview** of `dist/` (no Express APIs). For local full-stack behavior, use `npm run dev`.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Express + Vite dev server (`tsx server/index.ts`) |
| `npm run build` | Production Vite build → `dist/` |
| `npm run preview` | Static preview of `dist/` |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm run clean` | Remove `dist/` (Unix-style `rm`; on Windows you can delete `dist` manually) |

## Project structure

The repo separates the **React client** (`src/`), the **Node server** (`server/`), and **config / docs** at the top level.

### Top level

| Path | Role |
|------|------|
| `index.html` | Vite HTML shell; loads `/src/main.tsx` |
| `vite.config.ts` | React plugin, Tailwind, path alias `@` → repo root, bundle visualizer → `reports/bundle-analysis.html` |
| `tsconfig.json` | TypeScript for `src/`, `server/`, and `vite.config.ts` |
| `package.json` / `package-lock.json` | Dependencies and npm scripts |
| `.env.example` | Documented template for `.env.local` |
| `.env.local` | Local secrets (gitignored); not committed |

### `src/` — frontend (React + Vite)

| Path | Role |
|------|------|
| `main.tsx`, `App.tsx` | Bootstrap and app shell / routing |
| `index.css` | Global styles (Tailwind v4) |
| `firebase.ts` | Firebase client initialization |
| `components/` | Shared UI: Navbar, Chatbot, job modals, document cards, etc. |
| `pages/` | Route screens: Home, Search, Onboarding, My Jobs, Documents, Account |
| `services/` | Client helpers (e.g. Gemini, LinkedIn-related calls) |
| `utils/` | PDF export, document download, job links, transcript helpers |
| `types/` | Shared TypeScript types (also imported by `server/` for API payloads) |
| `data/` | Mock jobs, `onetSkillClusters.json` (O*NET-style clusters), `collegeScorecardSample.json` (illustrative ROI context) |

### `server/` — backend (Express)

| File | Role |
|------|------|
| `index.ts` | Entrypoint: JSON API (`/api/health`, `/api/jobs`, `/api/metrics`, LinkedIn import), Vite middleware in dev, static `dist/` + SPA fallback in production |
| `jobsAggregator.ts` | Aggregates jobs from public RSS/APIs (e.g. Indeed, LinkedIn RSS, Google Careers) plus Handshake samples from mock data |
| `linkedinScrape.ts` | Fallback scrape of public LinkedIn HTML when needed |
| `relevanceLinkedIn.ts` | Relevance AI webhook integration for structured profile import |

### `docs/` — documentation

| File | Role |
|------|------|
| `IMPLEMENTATION_GUIDE.md` | Deeper feature / implementation notes |
| `LINKEDIN_SCRAPING_AND_JOBS.txt` | Notes on LinkedIn and job sources |
| `CHALLENGE_COMPLIANCE.txt` | Avanade-style challenge: prompt fit, data sources, bias, student impact |
| `DATASET_INTEGRATION_AND_TESTING.txt` | How datasets/AI are wired; how to test; improvement ideas |
| `DEVOPS_AND_MONITORING.md` | Post-deploy monitoring, NIST AI RMF–style lifecycle, metrics |
| `metadata.json` | Project metadata (e.g. tooling / studio manifests) |

### `firebase/`

| File | Role |
|------|------|
| `firestore.rules` | Firestore security rules (reference copy; point Firebase CLI here if you add `firebase.json`) |
| `firebase-blueprint.json` | Firebase-oriented blueprint / config reference |

### Generated folders

| Path | Role |
|------|------|
| `dist/` | Output of `npm run build` (deploy or serve as static files) |
| `reports/` | Bundle analysis HTML from Rollup visualizer (gitignored) |

## Database structure (Firestore)

```
users/{uid}
├── Personal info: fullName, email, phone, dob, address, photoURL
├── Background: experience[], education[], projects[], skills[]
├── Preferences: preferredRoles[], workType, location, basePay
└── Metadata: createdAt, lastUpdated

saved_jobs/{jobId}
├── jobData: Complete job information
├── status: 'saved' | 'applied'
└── savedAt: timestamp

documents/{docId}
├── content: Document text
├── type: 'resume' | 'cover-letter' | 'transcript'
├── jobId: Associated job (if applicable)
└── createdAt: timestamp
```

## User Journey

### First-Time User

1. **Sign Up** → Choose Google or Email authentication
2. **Onboarding** → Fill 3 steps of profile information
3. **LinkedIn import** or **resume PDF upload** on Account → AI-assisted profile fields (review before saving)
4. **View Home** → Jobs with O*NET-informed alignment scores and explanations

### Finding & Applying Jobs

1. **Search** → Browse jobs with advanced filters
2. **View Job** → Click job to see full details and requirements
3. **Generate Documents** → AI creates resume and cover letter
4. **Preview & Download** → Review and download before applying
5. **Save Job** → Bookmark for later reference
6. **Track Progress** → Monitor applications in "My Jobs"

### Skill Development

1. **Upload Transcript** → Add course descriptions
2. **AI Extracts Skills** → Skills automatically added to profile
3. **Ask Chatbot** → Get learning resources for new skills
4. **Track Growth** → Update profile as you learn

## Features Implemented ✅

### Core Platform

- ✅ Authentication (Google OAuth, Email/Password)
- ✅ Multi-step onboarding
- ✅ Firestore data persistence
- ✅ Responsive design

### Job Discovery

- ✅ Home page with recommendations
- ✅ Advanced search and filtering
- ✅ Job aggregation from multiple sources
- ✅ Save/bookmark functionality

### AI Features

- ✅ Resume generation and customization
- ✅ Cover letter generation
- ✅ Career chatbot (student-oriented copy)
- ✅ **Resume PDF → profile** (Gemini structured extract; review on Account)
- ✅ **Application alignment scores** (transparent TypeScript + O*NET-style clusters; not a hiring guarantee)
- ✅ **Per-job Role coach** (Gemini: skills to learn, resources, pathway hints for that posting)
- ✅ Transcript analysis

### Document Management

- ✅ Generate, store, and manage documents
- ✅ Download documents
- ✅ Preview with markdown rendering
- ✅ Transcript upload and processing

### Application Tracking

- ✅ Save applications
- ✅ View associated documents per job
- ✅ Status tracking
- ✅ Application history

## Bugs & Known Issues

### Current limitations

- Jobs on the Home/Search flows combine **live public feeds** (e.g. Indeed RSS, LinkedIn job RSS, Google Careers API) with **Handshake samples** from mock data; behavior and availability depend on third-party endpoints
- LinkedIn **profile import** uses Relevance AI and/or public-page scraping, not official LinkedIn OAuth
- Transcript-related features use text analysis as implemented in the app (no full document pipeline described here)
- No payment or billing

### Future Improvements

- Connect to real job APIs (Indeed, LinkedIn, Handshake)
- Implement real LinkedIn OAuth integration
- Add email notification system
- Build interview preparation module
- Develop mobile app version
- Create analytics dashboard

## Recommended Enhancements

### Near-term

1. **Real Job APIs** - Integrate Indeed, LinkedIn Jobs API
2. **LinkedIn OAuth** - Real data import from LinkedIn
3. **Email Notifications** - Alert users to new matching jobs
4. **Analytics** - Track application success rates

### Medium-term

1. **Interview Prep** - Mock interview questions, tips by company
2. **Salary Negotiation** - Industry salary data and negotiation guides
3. **Mentor Matching** - Connect students with industry professionals
4. **Skill Assessments** - Quizzes and tests for desired skills

### Long-term

1. **Company Insights** - Culture fit analysis, employee reviews
2. **Career Paths** - Suggested career progression routes
3. **Alumni Network** - School-specific job board and networking
4. **Premium Features** - Advanced analytics, priority support

## Deployment

Production uses **one Node process**: after `npm run build`, `npm start` runs Express with `NODE_ENV=production`, serving the SPA from `dist/` and `/api/*` on the same origin (see [`server/index.ts`](server/index.ts)).

```bash
npm install
npm run build
npm start
```

**Never deployed before?** Follow **[docs/HOSTING.md](docs/HOSTING.md)** from the top (GitHub → Render → env vars → Firebase). Same file also has the short checklist (env vars, `PORT`, SEO).

If you split frontend and backend across separate hosts, you must configure API base URLs and CORS yourself; the default app assumes a single origin.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CareerPath AI App                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            React Components (Pages)                   │   │
│  │  Onboarding → Home → Search → MyJobs → Documents → Account
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      React Router + client-side state               │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express API (dev: + Vite) / static dist (prod)      │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Firebase + Gemini (client)                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │   │
│  │  │ Auth         │  │ Firestore    │  │ Gemini   │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Contributing

For issues and contributions:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For help, refer to:

- [Implementation guide](./docs/IMPLEMENTATION_GUIDE.md) — feature documentation
- [Challenge compliance & student impact](./docs/CHALLENGE_COMPLIANCE.txt) — prompt alignment, bias, significance
- [Dataset integration & testing](./docs/DATASET_INTEGRATION_AND_TESTING.txt) — data sources, how to verify features
- [DevOps & monitoring](./docs/DEVOPS_AND_MONITORING.md) — lifecycle monitoring and governance
- [LinkedIn / jobs notes](./docs/LINKEDIN_SCRAPING_AND_JOBS.txt) — scraping and job sources
- [Firebase Docs](https://firebase.google.com/docs)
- [Google Gemini API](https://ai.google.dev/)
- [React Documentation](https://react.dev)

## License

This project is part of the AI Hackathon 2026 initiative.

---

**CareerPath AI** - Empowering students to navigate their career journey with confidence! 🚀
