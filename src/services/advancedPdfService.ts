export interface EmployeeAttendanceRecord {
  date: string; // yyyy-MM-dd
  entries: Array<{
    time: string; // HH:mm
    type: "IN" | "OUT";
  }>;
  status: "NORMAL" | "ABSENCE" | "VACATION" | "HOLIDAY" | "COMPENSATION" | "OFF_DAY";
  justification?: string;
}

export interface ExtractedEmployee {
  name: string;
  registration: string;
  matricula?: string;
  cpf?: string;
  admission_date?: string; // yyyy-MM-dd
  department?: string;
  position?: string;
  schedule?: string;
  records: EmployeeAttendanceRecord[];
}

/**
 * Convert date from dd/MM/yyyy to yyyy-MM-dd
 */
function convertDate(ddmmyyyy: string): string {
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) return ddmmyyyy;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Parse a single DMP Light employee text block into structured data.
 */
function parseEmployeeBlock(block: string): ExtractedEmployee | null {
  const nameMatch = block.match(/Funcion[aá]rio\s*:\s*([^\n\r]+)/i);
  const matriculaMatch = block.match(/Matr[ií]cula\s*:\s*(\d+)/i);

  if (!nameMatch || !matriculaMatch) return null;

  const name = nameMatch[1].trim();
  const registration = matriculaMatch[1].trim();

  const admissionMatch = block.match(/Data de admiss[aã]o\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const deptMatch = block.match(/Estrutura organizacional\s*:\s*([^\n\r]+)/i);
  const scheduleMatch = block.match(/Escala\s*:\s*([^\n\r]+)/i) || block.match(/Hor[aá]rio\s*:\s*([^\n\r]+)/i);

  const admission_date = admissionMatch ? convertDate(admissionMatch[1]) : undefined;
  const department = deptMatch ? deptMatch[1].trim() : undefined;
  const schedule = scheduleMatch ? scheduleMatch[1].trim() : undefined;

  const records: EmployeeAttendanceRecord[] = [];

  const lines = block.split(/[\n\r]+/);
  for (const line of lines) {
    // Day abbreviations include accented chars (sáb) so use \S instead of \w
    const dateLineMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+\S{2,5}\s+(.*)/);
    if (!dateLineMatch) continue;

    const rawDate = dateLineMatch[1];
    const rest = dateLineMatch[2].trim();
    const date = convertDate(rawDate);

    // ── Strip the "Horário" column (HH:MM - HH:MM with spaces around the dash) ──
    // This column shows the employee SCHEDULE, not actual clock punches.
    // Actual apontamentos use no spaces: "09:34-19:20".
    const restClean = rest.replace(/\d{2}:\d{2}\s+-\s+\d{2}:\d{2}/, "").trim();

    let status: EmployeeAttendanceRecord["status"] = "NORMAL";
    let justification: string | undefined = undefined;
    const entries: EmployeeAttendanceRecord["entries"] = [];

    if (/f[eé]rias/i.test(restClean)) {
      status = "VACATION";
    } else if (/feriado/i.test(restClean)) {
      status = "HOLIDAY";
    } else if (/descanso\s+semanal|dsr/i.test(restClean)) {
      status = "OFF_DAY";
    } else if (/falta/i.test(restClean)) {
      status = "ABSENCE";
    } else {
      // Actual apontamentos use no-space dash: "09:34-19:20"
      // H.Trab / H.E. totals like "09:46 01:11" appear AFTER the apontamentos range
      // and are ignored once a proper IN-OUT range is found.
      const timeRanges = [...restClean.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g)];

      if (timeRanges.length > 0) {
        for (const range of timeRanges) {
          entries.push({ time: range[1], type: "IN" });
          entries.push({ time: range[2], type: "OUT" });
        }
      } else {
        // Fallback: lone punch (e.g. only "22:56" recorded for a day).
        // Take only the FIRST time — lone punches don't produce worked hours.
        const individualTimes = [...restClean.matchAll(/\b(\d{2}:\d{2})\b/g)];
        if (individualTimes.length > 0) {
          entries.push({ time: individualTimes[0][1], type: "IN" });
        }
      }

      if (entries.length === 0) continue;

      // Extract justification (strip times and hour totals like "XXX:YY")
      const withoutTimes = restClean
        .replace(/\d{2}:\d{2}(-\d{2}:\d{2})?/g, "")
        .replace(/\d{3}:\d{2}/g, "")
        .trim();
      if (withoutTimes.length > 2 && !/^\s*$/.test(withoutTimes)) {
        justification = withoutTimes.replace(/\s+/g, " ").trim();
      }
    }

    records.push({
      date,
      entries,
      status,
      justification: justification || undefined,
    });
  }

  return {
    name,
    registration,
    matricula: registration,
    admission_date,
    department,
    schedule,
    records,
  };
}

/**
 * Extract all employee data from DMP Light PDF text (no AI required).
 */
export async function extractEmployeeDataFromPdfText(
  pdfText: string
): Promise<ExtractedEmployee[]> {
  try {
    const sections = pdfText.split(/(?=Funcion[aá]rio\s*:)/i);
    const employees: ExtractedEmployee[] = [];

    for (const section of sections) {
      if (!/Funcion[aá]rio\s*:/i.test(section)) continue;
      if (!/Matr[ií]cula\s*:/i.test(section)) continue;

      const emp = parseEmployeeBlock(section);
      if (emp && emp.name && emp.registration) {
        employees.push(emp);
      }
    }

    console.log(`Parsed ${employees.length} employees from PDF text (no AI)`);
    return employees;
  } catch (error) {
    console.error("Text extraction error:", error);
    return [];
  }
}

/**
 * Compatibility export for base64 PDF input.
 */
export async function extractAllEmployeesFromPdf(
  base64Pdf: string
): Promise<ExtractedEmployee[]> {
  const { extractTextFromPDF } = await import("./pdfService.js");
  const buffer = Buffer.from(base64Pdf, "base64");
  const pdfText = await extractTextFromPDF(buffer);
  return extractEmployeeDataFromPdfText(pdfText);
}
