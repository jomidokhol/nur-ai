
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export type ChatMode = 'fast' | 'study' | 'deep_think';

export interface FilePart {
  mimeType: string;
  data: string;
}

export const getGeminiResponseStream = async (
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text?: string; inlineData?: any }[] }[] = [],
  mode: ChatMode = 'fast',
  files: FilePart[] = []
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Defaulting to flash-lite for 'fast' mode to handle higher traffic/quota limits
  let modelName = 'gemini-flash-lite-latest';
  let config: any = {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
  };

  if (mode === 'deep_think') {
    modelName = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 16000 };
  } else if (mode === 'study') {
    modelName = 'gemini-3-flash-preview';
    config.systemInstruction = "You are an expert tutor. Your goal is to help the user learn by providing clear, step-by-step explanations, asking clarifying questions, and encouraging critical thinking. Use analogies where helpful.";
  }

  const currentParts: any[] = [{ text: prompt }];
  files.forEach(file => {
    currentParts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  });

  const response = await ai.models.generateContentStream({
    model: modelName,
    contents: [
      ...history.map(h => ({
        role: h.role,
        parts: h.parts
      })),
      { role: 'user', parts: currentParts }
    ],
    config: config
  });

  return response;
};

export const generateTitle = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `Generate a short, concise title (max 5 words) for a conversation that starts with: "${prompt}". Return ONLY the title text.`,
    });
    return response.text?.trim() || "New Chat";
  } catch (error) {
    console.error("Error generating title:", error);
    return "New Chat";
  }
};
