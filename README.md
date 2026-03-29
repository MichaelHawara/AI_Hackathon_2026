# CareerPath AI - Project Documentation

## Overview

CareerPath AI is an AI-powered career navigation platform designed specifically for students. It helps users navigate the workforce by providing intelligent job matching, AI-powered resume and cover letter generation, and real-time career guidance through an AI chatbot.

**Mission**: Reduce uncertainty and stress for students navigating the workforce while building systems that are fair, transparent, and responsible from development through operations.

## Key Features

### 🔐 Authentication & Onboarding

- Multi-step onboarding flow (3 comprehensive steps)
- Google Sign-in and Email/Password authentication
- LinkedIn auto-fill simulation for quick profile setup
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
- Profile sync with LinkedIn (simulated)

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Router v7** - Client-side routing
- **Lucide Icons** - Beautiful icon library

### Backend & Services

- **Firebase Authentication** - Google OAuth, Email/Password
- **Firestore** - Document database for user data
- **Google Gemini API** - AI capabilities for content generation and analysis

### AI Services Integrated

- Career advice generation
- Resume customization
- Cover letter writing
- Transcript skill extraction

## Prerequisites

- Node.js v18+
- Firebase account with Firestore enabled
- Google Gemini API key

## How to Run

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env` file with:

```
GEMINI_API_KEY=your_gemini_api_key
VITE_FIREBASE_API_KEY=your_firebase_config
# ... other Firebase config variables
```

### 3. Start Development Server

```bash
npm run dev
```

The app will run on `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
npm run preview
```

## Database Structure (Firestore)

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
3. **LinkedIn Import** → Auto-fill data (optional)
4. **View Home** → See personalized job recommendations

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
- ✅ Career chatbot
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

### Current Limitations

- Job listings are mocked (not connected to real APIs yet)
- LinkedIn import is simulated, not real OAuth
- Transcript parsing uses text analysis only (no actual transcript upload/parsing)
- No payment system implemented

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

### Firebase Hosting

```bash
npm run build
firebase deploy
```

### Vercel (Alternative)

```bash
npm run build
vercel --prod
```

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
│  │      React Router + Redux State Management           │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Firebase Services                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │   │
│  │  │ Auth (OAuth) │  │ Firestore DB │  │ Gemini AI│   │   │
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

- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Detailed feature documentation
- [Firebase Docs](https://firebase.google.com/docs)
- [Google Gemini API](https://ai.google.dev/)
- [React Documentation](https://react.dev)

## License

This project is part of the AI Hackathon 2026 initiative.

---

**CareerPath AI** - Empowering students to navigate their career journey with confidence! 🚀
