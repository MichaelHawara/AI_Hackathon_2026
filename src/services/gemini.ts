import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = "gemini-2.0-flash";

/**
 * Career Assistant Chat
 */
export async function getCareerAdvice(message: string, userProfile: any) {
  const systemInstruction = `
You are CareerPath AI, an expert Career Assistant built specifically for students navigating the workforce.

User Profile: ${JSON.stringify(userProfile)}

Your capabilities:
- Answer questions about what specific jobs/roles require
- Suggest ways to improve skills for a given sector
- Recommend learning resources (courses, books, certifications, projects)
- Provide tips to improve chances of getting accepted for roles
- Help with interview preparation and salary negotiation
- Guide students through career exploration, preparation, and early career decisions

Be encouraging, professional, practical, and specific. When recommending resources, give actual names of courses, platforms, or books when possible. Tailor advice to the user's existing skills and experience.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: message,
      config: { systemInstruction },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini career advice error:", error);
    throw error;
  }
}

/**
 * Resume Formatter - creates a tailored resume
 */
export async function generateResume(userProfile: any, jobDescription: string) {
  const prompt = `
Create a professional, ATS-optimized resume tailored to this specific job posting.

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

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini resume generation error:", error);
    throw error;
  }
}

/**
 * Cover Letter Generator
 */
export async function generateCoverLetter(userProfile: any, jobDescription: string) {
  const prompt = `
Write a compelling, tailored cover letter for this specific job posting.

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

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini cover letter generation error:", error);
    throw error;
  }
}

/**
 * Transcript Skill Extraction - parses transcript text and extracts skills
 */
export async function extractSkillsFromTranscript(transcriptText: string) {
  const prompt = `
Analyze this academic transcript and extract relevant professional skills.

TRANSCRIPT TEXT:
${transcriptText}

Instructions:
- Identify courses and their descriptions
- Map courses to industry-relevant skills
- Return ONLY a JSON array of skill strings, nothing else
- Include both technical skills (e.g., "Python", "Data Analysis") and soft skills (e.g., "Technical Writing", "Research Methods")
- Be specific: prefer "React.js" over "Web Development", "Statistical Analysis" over "Math"
- Deduplicate and limit to the top 20 most relevant skills

Example output: ["Python", "Machine Learning", "Statistical Analysis", "Technical Writing"]
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    const text = response.text || '[]';
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      return JSON.parse(match[0]) as string[];
    }
    return [];
  } catch (error) {
    console.error("Gemini transcript extraction error:", error);
    throw error;
  }
}
