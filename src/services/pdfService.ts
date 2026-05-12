import { GoogleGenAI } from "@google/genai";

export interface ParsedAttendanceData {
  employeeId?: string;
  name: string;
  registration: string;
  cpf?: string;
  department?: string;
  records: Array<{
    date: string; // ISO format: yyyy-MM-dd
    entries: Array<{
      time: string; // HH:mm format
      type: "IN" | "OUT";
    }>;
    totalWorkMinutes?: number;
    overtime50Minutes?: number;
    overtime100Minutes?: number;
    nightShiftMinutes?: number;
    delayMinutes?: number;
    status: "NORMAL" | "ABSENCE" | "VACATION" | "HOLIDAY" | "CERTIFICATE" | "OFF_DAY" | "COMPENSATION";
    justification?: string;
  }>;
}

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

import zlib from "node:zlib";
import { promisify } from "node:util";

const inflateRaw = promisify(zlib.inflateRaw);
const inflate    = promisify(zlib.inflate);

function decodePDFString(s: string): string {
  return s
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\").replace(/\\([()\\])/g, "$1");
}

/**
 * Extract text from PDF buffer using raw stream parsing + zlib decompression.
 * Zero external dependencies — works in any Node.js environment including Vercel serverless.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const bytes = buffer.toString("latin1");
    const allContent: string[] = [bytes];

    // Try to decompress every stream block (FlateDecode / zlib)
    const streamRx = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m: RegExpExecArray | null;
    while ((m = streamRx.exec(bytes)) !== null) {
      const raw = Buffer.from(m[1], "latin1");
      for (const fn of [inflate, inflateRaw] as typeof inflate[]) {
        try {
          const dec = await fn(raw);
          allContent.push(dec.toString("latin1"));
          break;
        } catch { /* not this encoding, try next */ }
      }
    }

    const combined = allContent.join("\n");
    const texts: string[] = [];

    // (text)Tj  /  (text)' / (text)"
    const tjRx = /\(([^)\\]*(?:\\[\s\S][^)\\]*)*)\)\s*(?:Tj|'|")/g;
    while ((m = tjRx.exec(combined)) !== null) {
      const t = decodePDFString(m[1]).trim();
      if (t) texts.push(t);
    }

    // [(text)...]TJ
    const tjArrRx = /\[((?:[^\]]*\([^)]*\)[^\]]*)*)\]\s*TJ/g;
    while ((m = tjArrRx.exec(combined)) !== null) {
      const strRx = /\(([^)\\]*(?:\\[\s\S][^)\\]*)*)\)/g;
      let s: RegExpExecArray | null;
      while ((s = strRx.exec(m[1])) !== null) {
        const t = decodePDFString(s[1]).trim();
        if (t) texts.push(t);
      }
    }

    const result = texts.join(" ");
    if (!result.trim()) throw new Error("No text extracted from PDF");
    return result;
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to parse PDF content");
  }
}

/**
 * Parse employee segments from raw PDF text
 */
export function extractEmployeeSegments(text: string): string[] {
  // Split by common DIMEP delimiters (Funcionário:, Matrícula:, etc)
  const segments = text.split(/(?=(?:FUNCIONÁRIO|Funcionário|EMPLOYEE|Employee|MATRÍCULA|Matrícula|REGISTRATION|Registration)[\s\S]*?:)/gi);

  return segments
    .filter(segment => segment.trim().length > 200) // Filter meaningful segments
    .map(segment => segment.trim());
}

/**
 * Use Gemini AI to parse employee attendance data from text
 */
export async function parseEmployeeDataWithAI(segment: string): Promise<ParsedAttendanceData | null> {
  try {
    const aiInstance = getAI();

    const prompt = `You are an expert at parsing Brazilian DIMEP (attendance system) reports.
Extract and structure the attendance data from this segment. 

Return ONLY a valid JSON object (no markdown, no explanation) matching this schema:
{
  "name": "string (full employee name)",
  "registration": "string (employee registration/matrícula)",
  "cpf": "string optional (CPF format XXX.XXX.XXX-XX or XXXXXXXXXXX)",
  "department": "string optional (department name)",
  "records": [
    {
      "date": "string (ISO format: yyyy-MM-dd)",
      "entries": [
        {
          "time": "string (HH:mm format, e.g., 08:00)",
          "type": "IN" or "OUT"
        }
      ],
      "status": "NORMAL or ABSENCE or VACATION or HOLIDAY or CERTIFICATE or OFF_DAY or COMPENSATION",
      "justification": "string optional (reason for absence/certificate)"
    }
  ]
}

Important rules:
1. Parse ALL dates in dd/MM/yyyy format to yyyy-MM-dd
2. Parse ALL times in HH:mm format (24-hour)
3. Alternate IN and OUT entries sequentially
4. If date shows absence (falta, ausência), set status to ABSENCE
5. If date shows vacation (férias), set status to VACATION
6. If date shows holiday (feriado), set status to HOLIDAY
7. Do NOT calculate work hours - just extract raw entries
8. Do NOT include calculated fields (totalWorkMinutes, overtime, etc)
9. Return EMPTY records array if no attendance data found

SEGMENT TO PARSE:
${segment}`;

    const response = await aiInstance.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    const text = response.text || "";
    
    if (!text) {
      console.warn("Empty response from Gemini");
      return null;
    }

    try {
      // Clean JSON if wrapped in markdown code blocks
      let cleanedJson = text;
      if (text.includes("```json")) {
        cleanedJson = text.split("```json")[1]?.split("```")[0] || text;
      } else if (text.includes("```")) {
        cleanedJson = text.split("```")[1]?.split("```")[0] || text;
      }

      const parsed = JSON.parse(cleanedJson.trim());

      // Validate structure
      if (!parsed.name || !parsed.registration) {
        console.warn("Missing required fields in parsed data");
        return null;
      }

      return {
        name: parsed.name?.trim() || "",
        registration: parsed.registration?.toString()?.trim() || "",
        cpf: parsed.cpf?.trim(),
        department: parsed.department?.trim(),
        records: Array.isArray(parsed.records) ? parsed.records : [],
      };
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Text:", text.substring(0, 200));
      return null;
    }
  } catch (error) {
    console.error("AI parsing error:", error);
    throw error;
  }
}

/**
 * Calculate work hours from time entries
 */
export function calculateWorkHours(entries: Array<{ time: string; type: string }>): {
  totalWorkMinutes: number;
  overtime50Minutes: number;
  overtime100Minutes: number;
  nightShiftMinutes: number;
  delayMinutes: number;
} {
  let totalMinutes = 0;
  let overtime50Minutes = 0;
  let overtime100Minutes = 0;
  let nightShiftMinutes = 0;
  let delayMinutes = 0;

  // Expected: IN 08:00, OUT 12:00, IN 13:00, OUT 17:00 = 8 hours
  const expectedWorkMinutes = 480; // 8 hours standard
  const nightShiftStart = 22; // 22:00
  const nightShiftEnd = 6; // 06:00
  const delayToleranceMinutes = 10;
  const expectedStartTime = 8 * 60; // 08:00 in minutes

  if (entries.length < 2) {
    return { totalWorkMinutes: totalMinutes, overtime50Minutes, overtime100Minutes, nightShiftMinutes, delayMinutes };
  }

  // Sort entries by time
  const sortedEntries = [...entries].sort((a, b) => {
    const aTime = timeToMinutes(a.time);
    const bTime = timeToMinutes(b.time);
    return aTime - bTime;
  });

  // Calculate work periods (IN to OUT pairs)
  for (let i = 0; i < sortedEntries.length - 1; i += 2) {
    const inEntry = sortedEntries[i];
    const outEntry = sortedEntries[i + 1];

    if (inEntry.type !== "IN" || outEntry.type !== "OUT") continue;

    const inTime = timeToMinutes(inEntry.time);
    const outTime = timeToMinutes(outEntry.time);

    if (outTime < inTime) continue; // Invalid period

    const periodMinutes = outTime - inTime;
    totalMinutes += periodMinutes;

    // Calculate delay (if first entry is late)
    if (i === 0 && inTime > expectedStartTime) {
      delayMinutes = Math.max(0, inTime - expectedStartTime - delayToleranceMinutes);
    }

    // Calculate night shift (entries between 22:00 and 06:00)
    const nightMinutes = calculateNightShiftMinutes(inTime, outTime, nightShiftStart, nightShiftEnd);
    nightShiftMinutes += nightMinutes;
  }

  // Calculate overtime
  if (totalMinutes > expectedWorkMinutes) {
    const overtimeMinutes = totalMinutes - expectedWorkMinutes;
    // First 2 hours at 50%, rest at 100%
    const overtime50Limit = expectedWorkMinutes + 120; // +2 hours
    if (totalMinutes <= overtime50Limit) {
      overtime50Minutes = overtimeMinutes;
    } else {
      overtime50Minutes = 120;
      overtime100Minutes = totalMinutes - overtime50Limit;
    }
  }

  return {
    totalWorkMinutes: Math.floor(totalMinutes),
    overtime50Minutes: Math.floor(overtime50Minutes),
    overtime100Minutes: Math.floor(overtime100Minutes),
    nightShiftMinutes: Math.floor(nightShiftMinutes),
    delayMinutes: Math.floor(delayMinutes),
  };
}

/**
 * Convert HH:mm time string to total minutes
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Calculate night shift minutes between two times
 */
function calculateNightShiftMinutes(inMinutes: number, outMinutes: number, nightStart: number, nightEnd: number): number {
  const nightStartMinutes = nightStart * 60;
  const nightEndMinutes = nightEnd * 60;

  if (outMinutes < inMinutes) {
    // Period crosses midnight
    const minutesAfterMidnight = outMinutes; // 0 to nightEnd
    const minutesBeforeMidnight = 24 * 60 - inMinutes; // inMinutes to 24:00

    let nightMinutes = 0;
    if (inMinutes >= nightStartMinutes) {
      nightMinutes += minutesBeforeMidnight;
    }
    if (minutesAfterMidnight >= nightEndMinutes) {
      nightMinutes += minutesAfterMidnight - nightEndMinutes;
    } else {
      nightMinutes += minutesAfterMidnight;
    }
    return nightMinutes;
  } else {
    // Period within same day
    if (outMinutes <= nightStartMinutes || inMinutes >= nightEndMinutes) {
      return 0; // Entirely outside night shift
    }

    const effectiveIn = Math.max(inMinutes, nightStartMinutes);
    const effectiveOut = Math.min(outMinutes, nightEndMinutes + 24 * 60); // Handle next day

    return Math.max(0, effectiveOut - effectiveIn);
  }
}

/**
 * Determine absence status from text clues
 */
export function determineAbsenceStatus(text: string): "NORMAL" | "ABSENCE" | "VACATION" | "HOLIDAY" | "CERTIFICATE" | "OFF_DAY" | "COMPENSATION" {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("férias") || lowerText.includes("vacation")) return "VACATION";
  if (lowerText.includes("feriado") || lowerText.includes("holiday")) return "HOLIDAY";
  if (lowerText.includes("atestado") || lowerText.includes("medical") || lowerText.includes("certificate")) return "CERTIFICATE";
  if (lowerText.includes("falta") || lowerText.includes("absence") || lowerText.includes("ausência")) return "ABSENCE";
  if (lowerText.includes("compensação") || lowerText.includes("compensation")) return "COMPENSATION";
  if (lowerText.includes("folga") || lowerText.includes("day off")) return "OFF_DAY";

  return "NORMAL";
}

/**
 * Parse date string in various formats to ISO format
 */
export function parseToISO(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try dd/MM/yyyy format
  const ddmmyyyyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  // Try yyyy-MM-dd format
  const yyyymmddMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmddMatch) {
    return dateStr.substring(0, 10);
  }

  return null;
}
