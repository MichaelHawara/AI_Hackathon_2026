import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Career Assistant Chat
 */
export async function getCareerAdvice(message: string, userProfile: any) {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `
    You are an expert Career Assistant for students.
    User Profile: ${JSON.stringify(userProfile)}
    Help the user with job search, skill improvement, and career planning.
    Be encouraging, professional, and practical.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: message,
    config: {
      systemInstruction,
    },
  });

  return response.text;
}

/**
 * Resume Formatter
 */
export async function generateResume(userProfile: any, jobDescription: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Create a professional resume based on this user profile and job description.
    User Profile: ${JSON.stringify(userProfile)}
    Job Description: ${jobDescription}
    Format the output in Markdown. Focus on highlighting relevant skills and experiences.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
}

/**
 * Cover Letter Generator
 */
export async function generateCoverLetter(userProfile: any, jobDescription: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Write a tailored cover letter for this user profile and job description.
    User Profile: ${JSON.stringify(userProfile)}
    Job Description: ${jobDescription}
    The letter should be professional, persuasive, and highlight why the user is a great fit.
    Format the output in Markdown.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
}
