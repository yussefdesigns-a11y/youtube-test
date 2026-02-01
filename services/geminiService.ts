
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
          { text: "Suggest 5 viral YouTube titles for this thumbnail. Focus on high CTR. Return JSON." }
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
    console.error("Gemini Titles Error:", error);
    return [];
  }
}

export async function analyzeThumbnailScorecard(base64Image: string, length: AnalysisLength): Promise<ScorecardItem[]> {
  const depth = {
    short: "Keep each description under 5 words.",
    medium: "Keep each description to one clear sentence.",
    long: "Provide a detailed two-sentence professional analysis for each point."
  }[length];

  const prompt = `Perform a high-level creative analysis of this YouTube thumbnail. 
    Identify 4 positive aspects in these categories: 'composition', 'color', 'text', 'impact'.
    Rules: ${depth}
    Assign a strengthScore (1-100) for how well each category is executed.
    Return the result as a JSON array named 'scorecard'.`;

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
                  strengthScore: { type: Type.NUMBER },
                  iconType: { type: Type.STRING, enum: ['composition', 'color', 'text', 'impact'] }
                },
                required: ["category", "description", "strengthScore", "iconType"]
              }
            }
          },
          required: ["scorecard"]
        }
      }
    });
    return JSON.parse(response.text).scorecard;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return [];
  }
}
