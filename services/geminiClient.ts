import { GoogleGenAI } from "@google/genai";

// Centralized initialization to prevent multiple instances
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
