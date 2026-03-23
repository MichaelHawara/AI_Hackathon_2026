# CareerPath AI - Project Documentation

## Overview
CareerPath AI is an AI-powered career navigation platform designed specifically for students. It helps users navigate the workforce by providing tools for job searching, resume optimization, and career guidance.

## Prerequisites
- Node.js (v18+)
- Firebase Project (Firestore and Auth enabled)
- Gemini API Key

## How to Run
1. Install dependencies: `npm install`
2. Set up environment variables in `.env` (GEMINI_API_KEY).
3. Start the development server: `npm run dev`
4. Build for production: `npm run build`

## Database Structure (Firestore)
- `users`: User profiles and preferences.
- `jobs`: Global job listings (mocked/scraped).
- `saved_jobs`: User-specific job interactions (saved/applied).
- `documents`: AI-generated resumes and cover letters.

## AI Agents & Organization
The project uses AI agents (via Gemini) to:
- Generate tailored resumes and cover letters.
- Provide real-time career advice via a chatbot.
- Cross-check course descriptions with job requirements (planned).

## Bugs & Known Issues
- Job listings are currently mocked for demonstration.
- LinkedIn auto-fill requires official API access (simulated for now).
