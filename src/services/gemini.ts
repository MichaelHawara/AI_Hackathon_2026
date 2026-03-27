import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "VITE_GEMINI_API_KEY is not configured. Please add it to your .env.local file. " +
    "Get your API key from: https://aistudio.google.com/app/apikey"
  );
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

const SYSTEM_INSTRUCTION = `
You are CareerPath AI, an expert Career Assistant built specifically for students navigating the workforce.

Your capabilities:
- Answer questions about what specific jobs/roles require
- Suggest ways to improve skills for a given sector
- Recommend learning resources (courses, books, certifications, projects)
- Provide tips to improve chances of getting accepted for roles
- Help with interview preparation and salary negotiation
- Guide students through career exploration, preparation, and early career decisions

Be encouraging, professional, practical, and specific. When recommending resources, give actual names of courses, platforms, or books when possible. Tailor advice to the user's existing skills and experience.
`;

/**
 * Career Assistant Chat
 */
export async function getCareerAdvice(message: string, userProfile: any) {
  try {
    const prompt = `${SYSTEM_INSTRUCTION}\n\nUser Profile: ${JSON.stringify(userProfile)}\n\nUser Question: ${message}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini career advice error:", error);
    throw error;
  }
}

/**
 * Resume Formatter - creates a tailored resume
 */
export async function generateResume(userProfile: any, jobDescription: string) {
  try {
    const prompt = `${SYSTEM_INSTRUCTION}\n\nCreate a professional, ATS-optimized resume tailored to this specific job posting.

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Instructions:
- Format the output in clean Markdown
- Include a professional summary that highlights relevant qualifications
- Emphasize skills and experiences that match the job requirements
- Use strong action verbs and quantify achievements where possible
- Organize sections: Contact Info, Professional Summary, Skills, Experience, Education, Projects (if relevant)
- Keep it concise (aim for 1-2 pages worth of content)
- Match keywords from the job description naturally
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini resume generation error:", error);
    throw error;
  }
}

/**
 * Transcript Skill Extraction - parses transcript text and extracts skills
 */
export async function extractSkillsFromTranscript(transcriptText: string) {
  try {
    const prompt = `${SYSTEM_INSTRUCTION}\n\nAnalyze this academic transcript and extract relevant professional skills.

TRANSCRIPT TEXT:
${transcriptText}

Instructions:
- Extract technical skills (programming languages, tools, software)
- Extract soft skills (communication, leadership, problem-solving)
- Extract domain knowledge (specific fields or industries)
- List them in categories
- Be specific and accurate
- Format as a JSON object with categories as keys
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini transcript analysis error:", error);
    throw error;
  }
}

/**
 * Cover Letter Generator
 */
export async function generateCoverLetter(userProfile: any, jobDescription: string) {
  try {
    const prompt = `${SYSTEM_INSTRUCTION}\n\nWrite a compelling, tailored cover letter for this specific job posting.

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Instructions:
- Format the output in Markdown
- Address it professionally (use "Dear Hiring Manager" if no specific name)
- Opening paragraph: Express enthusiasm and state the position
- Body paragraphs: Connect the user's specific experiences and skills to job requirements
- Highlight 2-3 key achievements or experiences that make them a strong fit
- Closing paragraph: Reiterate interest and include a call to action
- Keep it professional but personable
- Aim for 3-4 paragraphs total
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini cover letter generation error:", error);
    throw error;
  }
}
