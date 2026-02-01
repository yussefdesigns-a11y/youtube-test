
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisLength, ScorecardItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function suggestTitles(base64Image: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] } },
          { text: "Suggest 5 viral YouTube titles for this thumbnail. Return JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["titles"]
        }
      }
    });
    return JSON.parse(response.text).titles;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function analyzeThumbnailScorecard(base64Image: string, length: AnalysisLength): Promise<ScorecardItem[]> {
  const prompt = `Analyze this YouTube thumbnail. 
    1. Identify 4 distinct positive visual categories (e.g., Color Theory, Focal Point, Text Clarity, Emotional Impact).
    2. For each category, provide a description. 
    Length requirement: ${length === 'short' ? 'Max 5 words' : length === 'medium' ? 'One sentence' : 'Detailed 2-sentence explanation'}.
    3. Assign a 'strengthScore' from 1-100 based on effectiveness.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scorecard: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  strengthScore: { type: Type.NUMBER }
                },
                required: ["category", "description", "strengthScore"]
              }
            }
          },
          required: ["scorecard"]
        }
      }
    });
    return JSON.parse(response.text).scorecard;
  } catch (error) {
    console.error(error);
    return [];
  }
}
