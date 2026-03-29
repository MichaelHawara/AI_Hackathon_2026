# CareerPath AI - Implementation Guide

## Overview

CareerPath AI is a comprehensive AI-powered career navigation platform specifically designed for students. It leverages machine learning to help students explore, prepare for, and apply to jobs while reducing uncertainty and stress.

## Key Features Implemented

### 1. **Authentication & Onboarding** 🔐

Users can create accounts using:

- Google Sign-in (one-click authentication)
- Email/Password authentication

**Multi-Step Onboarding Process:**

- **Step 1 - Personal Info**: Name, email, phone, DOB, address, profile picture
- **Step 2 - Background**: Experience, education, projects, research papers, volunteer work, skills
- **Step 3 - Preferences**: Job types, work environment (in-person/remote/hybrid), location radius, base pay

**Special Feature**: LinkedIn Auto-Fill Simulation

- Click "Fill in using LinkedIn" to auto-populate experience, education, projects, and skills with sample data
- Fully editable after import

### 2. **Job Discovery** 🔍

The platform aggregates job listings from multiple sources:

- **Handshake** - College-focused opportunities
- **LinkedIn** - Professional positions
- **Indeed** - General job market

**Features:**

- **Home Page**: Personalized job feed with AI-recommended listings based on your profile
- **Search Page**: Advanced filtering and search capabilities
- **Filters Available**:
  - Search by job title, company, or keywords
  - Filter by source platform
  - Filter by work type (Remote/Hybrid/In-person)
  - Filter by location
  - Pay range filtering (ready to implement)

### 3. **AI-Powered Document Generation** 📄

Generate customized, ATS-optimized documents for each job:

**Resume Generation:**

- Automatically tailors your resume to match job requirements
- Highlights relevant skills and experience
- Generates in markdown format (easy to edit)
- Can preview before downloading
- Save to Documents for future reference

**Cover Letter Generation:**

- Creates compelling, personalized cover letters
- Connects your experience to job requirements
- Follows professional formatting standards
- Preview and edit before final submission

**Process:**

1. Click on a job listing
2. Click "Format Resume" or "Format Cover Letter"
3. AI generates optimized document
4. Preview directly in the app
5. Download as markdown or save to Documents

### 4. **Career Advisor Chatbot** 💬

An AI-powered assistant available 24/7 to help you with:

- Questions about specific jobs and roles
- Skill improvement suggestions
- Learning resource recommendations
- Interview preparation tips
- Career advice and guidance
- Salary negotiation strategies

**How to Access:**

- Click the chat bubble button in the bottom-right corner
- Type your question and press Enter
- The AI responds with personalized advice based on your profile

### 5. **Job Application Tracking** 💼

**My Jobs Page:**

- View all saved and applied-to jobs
- Track application status
- See when you saved each job
- Quick access to associated resume and cover letter files

**"View Files" Feature:**

- Click "View Files" on any saved job
- See all documents (resume, cover letter) created for that job
- Preview documents before downloading
- Directly download application materials from the modal

### 6. **Document Management** 📁

**Documents Page:**

- Central hub for all your generated and uploaded documents
- View resumes, cover letters, and transcripts
- See creation date for each document
- Download documents as markdown files
- Delete documents you no longer need

**Transcript Upload & Skill Extraction:**

- Click "Upload Transcript" button
- Paste course descriptions or transcript text
- AI analyzes content and extracts relevant professional skills
- Extracted skills are automatically added to your profile
- Helpful for linking coursework to job requirements

### 7. **Account Management** 👤

**Profile Page:**

- View and edit personal information
- Update contact details (phone, address)
- Manage work experience with editable timeline
- Update education information
- Manage skills and expertise areas
- View LinkedIn sync option (simulated)
- Logout functionality

### 8. **Smart Job Recommendations** ⭐

The Home page displays jobs that match your profile based on:

- Your major/field of study
- Skills listed in your profile
- Job preferences (location, work type, pay range)
- Similar job titles you've been viewing
- Match score percentage

---

## User Flow Example

### Scenario: Student Looking for Internship

1. **Sign Up**: Create account with Google or Email
2. **Onboarding**: Fill in personal info → Add education/skills → Set job preferences
3. **LinkedIn Import**: Click "Fill in using LinkedIn" to populate experience quickly
4. **Browse Jobs**: Visit Home page or Search to find internships
5. **Apply Smartly**:
   - Click on internship listing
   - View full job details and requirements
   - Click "Format Resume" → Preview → Download
   - Click "Format Cover Letter" → Preview → Download
6. **Save for Later**: Click bookmark to save job
7. **Track Applications**: Go to "My Jobs" → Click "View Files" to see your customized documents
8. **Ask Questions**: Click chatbot → Ask about role, required skills, interview prep
9. **Extract Skills**: Upload transcript → Automatically add skills from coursework

---

## Technical Architecture

### Frontend Stack

- **React 19** with TypeScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation
- **React Markdown** - Document preview
- **Lucide Icons** - UI icons

### Backend Services

- **Firebase Authentication** (Google OAuth, Email/Password)
- **Firestore Database** - Document storage
- **Google Gemini API** - AI capabilities

### Database Schema

```
users/{uid}
├── fullName: string
├── email: string
├── phone: string
├── dob: string
├── address: string
├── photoURL: string
├── experience: Experience[]
├── education: Education[]
├── projects: Project[]
├── skills: string[]
├── preferences: JobPreferences

saved_jobs/{jobId}
├── jobId: string
├── status: 'saved' | 'applied'
├── savedAt: timestamp
├── jobData: Job

documents/{docId}
├── type: 'resume' | 'cover-letter' | 'transcript'
├── content: string
├── createdAt: timestamp
├── jobId?: string
├── jobTitle?: string
├── extractedSkills?: string[]
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase Project with Firestore enabled
- Gemini API key

### Installation

```bash
npm install
```

### Environment Setup

Create `.env` file:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Running the Application

```bash
npm run dev
```

The application will start on `http://localhost:5173`

---

## Key Improvements Made

### 1. Enhanced JobModal

- ✅ Document preview with markdown rendering
- ✅ Download functionality for generated documents
- ✅ Save/bookmark toggle with visual feedback
- ✅ Display job requirements as skill tags
- ✅ Show work type (Remote/Hybrid/In-person)
- ✅ Persistent document generation state

### 2. Search Page Enhancements

- ✅ Multi-filter system (source, work type, location)
- ✅ Active filter counter badge
- ✅ Filter panel toggle
- ✅ Clear all filters button
- ✅ Comprehensive mock job data with all fields

### 3. Documents Page Improvements

- ✅ Functional download for all document types
- ✅ Transcript upload modal
- ✅ AI skill extraction from transcripts
- ✅ Display extracted skills as tags
- ✅ Automatic skill profile updates

### 4. MyJobs Page Enhancements

- ✅ "View Files" modal showing job-specific documents
- ✅ Preview functionality for documents
- ✅ Direct download from job card
- ✅ File type indicators (resume, cover letter)
- ✅ Creation date tracking

### 5. Account Page Improvements

- ✅ Logout functionality added
- ✅ Better visual hierarchy
- ✅ Editable profile information
- ✅ Timeline view for experience
- ✅ Skill management interface

---

## Advanced Features (Ready for Enhancement)

### 1. Real Job API Integration

Could connect to:

- Indeed API for job listings
- LinkedIn Jobs API
- Handshake API (if available)
- Custom job scraping

### 2. Recommendation Algorithm

- Skill-based matching
- Location-based recommendations
- Company culture fit analysis
- Salary expectations matching

### 3. Interview Preparation

- Mock interview questions
- Interview tips by company
- Salary negotiation guides
- Common questions for roles

### 4. Analytics Dashboard

- Application tracking
- Success rate metrics
- Interview conversion rates
- Most applied roles/companies

### 5. Email Notifications

- New job matches
- Application reminders
- Saved job alerts
- Interview preparation tips

---

## Best Practices for Using CareerPath AI

### 1. Complete Your Profile

- The more detailed your profile, the better the job recommendations
- Add all relevant skills, not just technical ones
- Include volunteer work and projects

### 2. Use LinkedIn Auto-Fill

- Saves time during onboarding
- Ensures consistent information across platforms
- Can be edited to add custom details

### 3. Leverage AI Documents

- Always preview generated documents before use
- Feel free to edit markdown documents after generation
- Compare multiple document versions for different jobs

### 4. Ask the Chatbot

- Use for skill development guidance
- Get resources for learning new technologies
- Understand role requirements better
- Prepare interview strategies

### 5. Track Applications

- Use "My Jobs" to stay organized
- Keep all application documents in one place
- Monitor your application pipeline

---

## Troubleshooting

### Jobs Not Loading

- Check Firebase configuration
- Verify internet connection
- Clear browser cache

### AI Generation Failing

- Verify Gemini API key is set
- Check API quota and rate limits
- Ensure user profile is complete

### Document Download Issues

- Check browser's download settings
- Ensure pop-ups are not blocked
- Try different browser if issues persist

### Chatbot Not Responding

- Verify API connection
- Check user profile data
- Try rephrasing your question

---

## Future Roadmap

### Phase 2

- [ ] Real job API integrations
- [ ] Advanced recommendation algorithm
- [ ] Email notification system
- [ ] Mobile app (React Native)

### Phase 3

- [ ] Interview preparation module
- [ ] Salary negotiation guide
- [ ] Company culture matching
- [ ] Mentor connection system

### Phase 4

- [ ] Analytics dashboard
- [ ] Employer partnerships
- [ ] Premium features
- [ ] Global expansion

---

## Support & Contact

For issues or questions:

1. Check this implementation guide
2. Review the code comments
3. Check Firebase/Gemini documentation
4. Open an issue on GitHub

---

**CareerPath AI v1.0** - Empowering students to navigate their career journey with confidence! 🚀
