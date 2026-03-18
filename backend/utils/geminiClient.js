import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Initialize the Google Generative AI client using the API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Configure the Gemini Model.
 * We use 'gemini-flash-latest' because it is stable, fast, 
 * and available on the free tier for most regions.
 */
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-flash-latest", 
});

// Optional: Generation configuration (like temperature or max tokens) 
// can be added here if needed in the future.