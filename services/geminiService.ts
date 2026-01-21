
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMotivationalMessage = async (reducedAmount: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a very short, encouraging motivational message in Bengali for someone who just skipped or reduced their smoking by ${reducedAmount}%. Focus on lung health or heart benefits. Keep it under 20 words.`,
      config: {
        temperature: 0.7,
      },
    });
    return response.text || "আপনার ফুসফুস আজ একটু বেশি সতেজ অনুভব করছে! দারুণ কাজ করেছেন।";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "আপনার ফুসফুস আজ একটু বেশি সতেজ অনুভব করছে! দারুণ কাজ করেছেন।";
  }
};

export const getScoldingMessage = async (overLimitAmount: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a firm, serious, and slightly scolding (তিরস্কারমূলক) short message in Bengali for someone who just EXCEEDED their daily cigarette limit by ${overLimitAmount.toFixed(2)} units. Remind them of their promise to quit and the damage they are doing. Keep it under 20 words. Be direct.`,
      config: {
        temperature: 0.8,
      },
    });
    return response.text || "আপনি আপনার সীমা অতিক্রম করেছেন! নিজের শরীরের প্রতি অবিচার করা বন্ধ করুন। এখনই থামা দরকার।";
  } catch (error) {
    return "আপনি আপনার সীমা অতিক্রম করেছেন! নিজের শরীরের প্রতি অবিচার করা বন্ধ করুন। এখনই থামা দরকার।";
  }
};

export const getHealthFact = async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Provide a unique, interesting, and scientific health fact or tip related to quitting smoking in Bengali. Focus on different organs (lungs, heart, skin, brain) or immediate benefits. Keep it to one short, engaging sentence. Avoid repeating common ones like 'lung cancer' every time.",
      config: {
        temperature: 0.9,
      },
    });
    return response.text?.trim() || "ধূমপান ছাড়ার ২০ মিনিটের মধ্যে আপনার হার্ট রেট স্বাভাবিক হতে শুরু করে।";
  } catch (error) {
    return "ধূমপান ছাড়ার ২০ মিনিটের মধ্যে আপনার হার্ট রেট স্বাভাবিক হতে শুরু করে।";
  }
};
