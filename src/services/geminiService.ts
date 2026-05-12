import { GoogleGenAI, Type } from "@google/genai";

export interface EmployeeData {
  name: string;
  registration: string;
  records: Array<{
    date: string;
    times: string[];
    status: string;
    totalHours: string;
    extraHours: string;
  }>;
}

// Initialization with lazy API key from environment
// The platform handles providing the GEMINI_API_KEY to the environment
let ai: GoogleGenAI | null = null;

export const getAI = () => {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export async function processEmployeeSegment(segment: string): Promise<EmployeeData | null> {
  try {
    const aiInstance = getAI();
    
    const prompt = `Extract structured attendance data from this DIMEP point mirror segment. 
    Output strictly valid JSON according to this schema. Do not include any markdown formatting, just the raw JSON.
    
    SCHEMA:
    { 
      "name": "string", 
      "registration": "string", 
      "records": [
        { 
          "date": "string", 
          "times": ["string"], 
          "status": "string", 
          "totalHours": "string", 
          "extraHours": "string" 
        }
      ] 
    }
    
    SEGMENT:
    ${segment}`;

    const response = await aiInstance.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse JSON from Gemini response", text);
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    }
  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error; // Let the caller handle it
  }
}
