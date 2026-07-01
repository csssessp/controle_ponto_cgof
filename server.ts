import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Allow self-signed certs in dev (corporate proxy)
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  https.globalAgent.options.rejectUnauthorized = false;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE!;
if (!supabaseUrl || !supabaseServiceRole) throw new Error("Missing Supabase env vars");

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Time-bank table detection ──────────────────────────────────────────────────
let BANK_TABLE = "time_bank_entries";
let BANK_EMP_COL = "employee_id";

// ── PIN Project configuration (module-level, updatable by admin) ──────────────
// Decreto nº 70.273/2025 — Apr, Jun, Jul = 48h (feriado); todos os outros = 40h
let PIN_MONTH_GOALS: Record<number, number> = {
  1: 2400, 2: 2400, 3: 2400, 4: 2880, 5: 2400,
  6: 2880, 7: 2880, 8: 2400, 9: 2400, 10: 2400, 11: 2400, 12: 2400,
};
const PIN_MONTH_ABBR: Record<number, string> = {
  1: "JAN", 2: "FEV", 3: "MAR", 4: "ABR", 5: "MAI",
  6: "JUN", 7: "JUL", 8: "AGO", 9: "SET", 10: "OUT", 11: "NOV", 12: "DEZ",
};

async function loadPinGoalsFromDb() {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "pin_month_goals")
      .single();
    if (data?.value && typeof data.value === "object") {
      for (const [k, v] of Object.entries(data.value as Record<string, number>)) {
        const m = parseInt(k);
        if (m >= 1 && m <= 12 && typeof v === "number" && v > 0) PIN_MONTH_GOALS[m] = v;
      }
      console.log("[server] ✅ PIN goals loaded from app_settings");
    }
  } catch { /* use hardcoded defaults */ }
}

async function detectBankTable() {
  // Try snake_case first (preferred)
  const { error: e1 } = await supabase.from("time_bank_entries").select("id").limit(1);
  if (!e1 || e1.code !== "42P01") {
    if (!e1) console.log("[server] ✅ time_bank_entries table found");
    return;
  }
  // Fallback: try Prisma PascalCase
  const { error: e2 } = await supabase.from("TimeBankEntry").select("id").limit(1);
  if (!e2 || e2.code !== "42P01") {
    BANK_TABLE = "TimeBankEntry";
    BANK_EMP_COL = "employeeId";
    console.log("[server] ✅ Using TimeBankEntry (Prisma) for bank of hours");
    return;
  }
  console.warn("[server] ⚠️  No time bank table found. Run create_time_bank_table.sql in Supabase.");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseToISO(dateStr: string): string | null {
  if (!dateStr) return null;
  // already ISO yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
  // dd/MM/yyyy
  const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function minutesToHHMM(min: number): string {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return (min < 0 ? "-" : "") + `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function calculateWorkHours(
  entries: Array<{ time: string; type: string }>,
  expectedMinutes = 480,
  lunchMinutes = 60,
  noLunch = false,
) {
  const sorted = [...entries].sort((a, b) => a.time.localeCompare(b.time));
  let rawMinutes = 0;
  let pairCount = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const a = sorted[i], b = sorted[i + 1];
    if (a?.type === "IN" && b?.type === "OUT") {
      const [ih, im] = a.time.split(":").map(Number);
      const [oh, om] = b.time.split(":").map(Number);
      rawMinutes += (oh * 60 + om) - (ih * 60 + im);
      pairCount++;
    }
  }
  // Single IN/OUT pair (no lunch punch) → deduct lunch automatically, unless noLunch flag
  const netWork = (pairCount === 1 && lunchMinutes > 0 && !noLunch)
    ? Math.max(0, rawMinutes - lunchMinutes)
    : rawMinutes;
  const diff = netWork - expectedMinutes;
  return {
    totalWorkMinutes: netWork,
    overtime50Minutes: Math.max(0, diff),   // total OT stored here
    overtime100Minutes: 0,
    nightShiftMinutes: 0,
    delayMinutes: diff < 0 ? -diff : 0,
  };
}

const LEAVE_STATUSES = ["VACATION", "PREMIUM_LEAVE", "HOLIDAY", "OFF_DAY"];

async function getEmpSchedule(employeeId: string): Promise<{ expected: number; lunch: number }> {
  const { data } = await supabase
    .from("employees")
    .select("schedules(*)")
    .eq("id", employeeId)
    .single();
  const s = data?.schedules as any;
  if (!s) return { expected: 480, lunch: 60 };
  const expected = s.expectedWork ?? s.expected_work ?? 480;
  const startT: string | null = s.startTime ?? s.start_time ?? null;
  const endT: string | null   = s.endTime   ?? s.end_time   ?? null;
  let lunch = 60;
  if (startT && endT) {
    const [sh, sm] = startT.split(":").map(Number);
    const [eh, em] = endT.split(":").map(Number);
    lunch = Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - expected);
  }
  return { expected, lunch };
}

async function getOrCreateOrg(): Promise<string> {
  const { data } = await supabase.from("organizations").select("id").limit(1);
  if (data?.[0]) return data[0].id;
  const { data: created } = await supabase
    .from("organizations")
    .insert([{ name: "Empresa Padrão" }])
    .select("id");
  return created![0].id;
}

// ─── App factory (shared between local dev server and Vercel handler) ──────────

export async function createApp() {
  await detectBankTable();
  await loadPinGoalsFromDb();

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(cors());
  // Serve img folder in local dev (on Vercel, images live in public/)
  app.use("/img", express.static(path.join(process.cwd(), "img")));

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", name: "Chronos Ponto API", timestamp: new Date().toISOString() });
  });

  // ── Employees ─────────────────────────────────────────────────────────────
  app.get("/api/employees", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*, departments(name), schedules(*)")
        .order("name");
      if (error) throw error;
      // Normalize schedule: resolve camelCase/snake_case and compute lunch_minutes
      const employees = (data || []).map((e: any) => {
        if (!e.schedules) return e;
        const s = e.schedules;
        const expected = s.expectedWork ?? s.expected_work ?? 480;
        const startT: string | null = s.startTime ?? s.start_time ?? null;
        const endT: string | null   = s.endTime   ?? s.end_time   ?? null;
        let lunch_minutes = 60;
        if (startT && endT) {
          const [sh, sm] = startT.split(":").map(Number);
          const [eh, em] = endT.split(":").map(Number);
          lunch_minutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - expected);
        }
        return { ...e, schedules: { ...s, expected_work: expected, lunch_minutes } };
      });
      res.json({ success: true, count: employees.length, employees });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*, departments(name), schedules(*)")
        .eq("id", req.params.id)
        .single();
      if (error) throw error;
      res.json({ success: true, employee: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create single employee
  app.post("/api/employees", async (req, res) => {
    try {
      const orgId = await getOrCreateOrg();
      const { name, registration, email, phone, role_title, admission_date, department_id, schedule_id, cpf } = req.body;
      if (!name || !registration) return res.status(400).json({ error: "name e registration são obrigatórios" });
      // Check duplicate registration
      const { data: existing } = await supabase.from("employees").select("id").eq("registration", registration).limit(1);
      if (existing?.[0]) return res.status(409).json({ error: `Matrícula ${registration} já existe` });
      const { data, error } = await supabase
        .from("employees")
        .insert([{
          name, registration, organization_id: orgId,
          email: email || null, phone: phone || null,
          role_title: role_title || "Colaborador",
          cpf: cpf || null,
          admission_date: admission_date || null,
          department_id: department_id || null,
          schedule_id: schedule_id || null,
          pin_project: req.body.pin_project ?? false,
        }])
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, employee: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const allowed = ["name","registration","email","phone","role_title","admission_date","department_id","schedule_id"];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (key in req.body) updates[key] = req.body[key];
      }
      updates.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", req.params.id);
      if (error) throw error;

      // pin_project: use RPC function to bypass PostgREST schema cache limitation
      // (PostgREST may not know about newly-added columns until schema is reloaded)
      if ("pin_project" in req.body) {
        const pinVal = req.body.pin_project === true || req.body.pin_project === "true";
        const { error: rpcErr } = await supabase.rpc("set_pin_project", {
          emp_id: req.params.id,
          pin_val: pinVal,
        });
        if (rpcErr) {
          // Fallback: try direct PostgREST update (works if schema was reloaded via NOTIFY)
          await supabase.from("employees").update({ pin_project: pinVal }).eq("id", req.params.id);
        }
      }

      // Re-fetch with joins so frontend gets fresh nested data
      const { data, error: fetchErr } = await supabase
        .from("employees")
        .select("*, departments(name), schedules(*)")
        .eq("id", req.params.id)
        .single();
      if (fetchErr) throw fetchErr;
      res.json({ success: true, employee: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Deactivate / activate employee
  app.patch("/api/employees/:id/status", async (req, res) => {
    try {
      const { status } = req.body; // "ATIVO" | "INATIVO"
      if (!["ATIVO","INATIVO"].includes(status)) return res.status(400).json({ error: "Invalid status" });
      const { data, error } = await supabase
        .from("employees")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, employee: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete employee
  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const { error } = await supabase.from("employees").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Departments ───────────────────────────────────────────────────────────
  app.get("/api/departments", async (_req, res) => {
    try {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      res.json({ success: true, departments: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const orgId = await getOrCreateOrg();
      const { data, error } = await supabase
        .from("departments")
        .insert([{ name: req.body.name, organization_id: orgId }])
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, department: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const orgId = await getOrCreateOrg();
      const { data, error } = await supabase
        .from("departments")
        .insert([{ name: req.body.name, organization_id: orgId }])
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, department: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/departments/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .update({ name: req.body.name })
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, department: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      const { error } = await supabase.from("departments").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Schedules ─────────────────────────────────────────────────────────────
  // DB columns are camelCase (Prisma migration): startTime, endTime, expectedWork
  // Frontend expects snake_case: start_time, end_time, expected_work
  const normalizeSchedule = (s: any) => {
    const start_time = s.startTime ?? s.start_time ?? null;
    const end_time   = s.endTime   ?? s.end_time   ?? null;
    const expected_work = s.expectedWork ?? s.expected_work ?? 480;
    // Derive lunch_minutes from stored value or compute from span - expected
    let lunch_minutes: number = s.lunchMinutes ?? s.lunch_minutes ?? -1;
    if (lunch_minutes < 0 && start_time && end_time) {
      const [sh, sm] = start_time.split(":").map(Number);
      const [eh, em] = end_time.split(":").map(Number);
      lunch_minutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - expected_work);
    }
    // CLT fallback: span > 375min (6h15) → 60min; span > 255min (4h15) → 15min
    if (lunch_minutes < 0) {
      if (start_time && end_time) {
        const [sh, sm] = start_time.split(":").map(Number);
        const [eh, em] = end_time.split(":").map(Number);
        const span = (eh * 60 + em) - (sh * 60 + sm);
        lunch_minutes = span > 375 ? 60 : span > 255 ? 15 : 0;
      } else {
        lunch_minutes = 60;
      }
    }
    return {
      id: s.id, name: s.name, description: s.description,
      start_time, end_time, expected_work, lunch_minutes,
      tolerance: s.tolerance ?? 10,
      createdAt: s.createdAt,
    };
  };

  app.get("/api/schedules", async (_req, res) => {
    try {
      const { data, error } = await supabase.from("schedules").select("*").order("name");
      if (error) throw error;
      res.json({ success: true, schedules: (data || []).map(normalizeSchedule) });
    } catch (e: any) {
      res.status(500).json({ error: e.message, code: (e as any).code, hint: (e as any).hint, details: (e as any).details });
    }
  });

  app.post("/api/schedules", async (req, res) => {
    try {
      const { name, start_time, end_time, expected_work } = req.body;

      // Try camelCase first (Prisma migration creates camelCase columns)
      const payload: Record<string, any> = {
        name,
        expectedWork: expected_work || 480,
        updatedAt: new Date().toISOString(),
      };
      if (start_time) payload.startTime = start_time;
      if (end_time)   payload.endTime   = end_time;

      const { data, error } = await supabase.from("schedules").insert([payload]).select().single();
      if (error) {
        console.log("[POST /api/schedules] camelCase failed, trying snake_case:", error.message);
        const payload2: Record<string, any> = { name, expected_work: expected_work || 480 };
        if (start_time) payload2.start_time = start_time;
        if (end_time)   payload2.end_time   = end_time;
        const { data: data2, error: error2 } = await supabase.from("schedules").insert([payload2]).select().single();
        if (error2) {
          console.error("[POST /api/schedules] both failed:", error2);
          return res.status(500).json({ error: error2.message, hint: error2.hint, details: error2.details, code: error2.code });
        }
        return res.json({ success: true, schedule: normalizeSchedule(data2) });
      }
      res.json({ success: true, schedule: normalizeSchedule(data) });
    } catch (e: any) {
      console.error("[POST /api/schedules] unhandled:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/schedules/:id", async (req, res) => {
    try {
      const { name, start_time, end_time, expected_work } = req.body;
      const id = req.params.id;

      // Fetch existing row to determine actual column naming (camelCase vs snake_case)
      const { data: existing, error: fetchErr } = await supabase
        .from("schedules").select("*").eq("id", id).single();
      if (fetchErr) {
        console.error("[PUT /api/schedules] fetch existing failed:", fetchErr);
        return res.status(500).json({ error: fetchErr.message, code: fetchErr.code, hint: fetchErr.hint, details: fetchErr.details });
      }

      const isCamel = existing && "expectedWork" in existing;
      console.log(`[PUT /api/schedules] column style: ${isCamel ? "camelCase" : "snake_case"}, id=${id}`);

      const updates: Record<string, any> = isCamel
        ? {
            name,
            expectedWork: expected_work ?? 480,
            updatedAt: new Date().toISOString(),
            ...(start_time != null && { startTime: start_time }),
            ...(end_time   != null && { endTime:   end_time   }),
          }
        : {
            name,
            expected_work: expected_work ?? 480,
            ...(start_time != null && { start_time }),
            ...(end_time   != null && { end_time   }),
          };

      const { data, error } = await supabase
        .from("schedules").update(updates).eq("id", id).select().single();
      if (error) {
        console.error("[PUT /api/schedules] update failed:", error);
        return res.status(500).json({ error: error.message, code: error.code, hint: error.hint, details: error.details });
      }
      res.json({ success: true, schedule: normalizeSchedule(data) });
    } catch (e: any) {
      console.error("[PUT /api/schedules] unhandled:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/schedules/:id", async (req, res) => {
    try {
      const { error } = await supabase.from("schedules").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message, code: (e as any).code, hint: (e as any).hint, details: (e as any).details });
    }
  });

  // ── Attendance ────────────────────────────────────────────────────────────
  app.get("/api/attendance/:employeeId", async (req, res) => {
    try {
      const { year, month } = req.query as { year?: string; month?: string };
      let query = supabase
        .from("attendance_records")
        .select("*, time_entries(*)")
        .eq("employee_id", req.params.employeeId)
        .order("date", { ascending: true });
      if (year && month) {
        const from = `${year}-${String(month).padStart(2,"0")}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const to = `${year}-${String(month).padStart(2,"0")}-${lastDay}`;
        query = query.gte("date", from).lte("date", to);
      }
      const { data, error } = await query;
      if (error) throw error;
      res.json({ success: true, count: data?.length ?? 0, records: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create or update a record for a specific day
  app.post("/api/attendance/:employeeId/record", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { date, status, justification, entries, no_lunch } = req.body;
      const isoDate = parseToISO(date);
      if (!isoDate) return res.status(400).json({ error: "Invalid date" });

      // upsert record
      const sched = await getEmpSchedule(employeeId);
      const isLeave = LEAVE_STATUSES.includes(status || "");
      const effExpected = (isLeave && entries?.length) ? 0 : sched.expected;
      // For leave days, never deduct lunch (all worked hours count as overtime)
      const effectiveNoLunch = !!no_lunch || isLeave;
      const hours = entries?.length ? calculateWorkHours(entries, effExpected, sched.lunch, effectiveNoLunch) : { totalWorkMinutes:0, overtime50Minutes:0, overtime100Minutes:0, nightShiftMinutes:0, delayMinutes:0 };
      const { data: rec, error: recErr } = await supabase
        .from("attendance_records")
        .upsert({
          employee_id: employeeId,
          date: isoDate,
          status: status || "NORMAL",
          justification: justification || null,
          total_work: hours.totalWorkMinutes,
          overtime50: hours.overtime50Minutes,
          overtime100: hours.overtime100Minutes,
          night_shift: hours.nightShiftMinutes,
          delay: hours.delayMinutes,
          updated_at: new Date().toISOString(),
        }, { onConflict: "employee_id,date" })
        .select()
        .single();
      if (recErr) throw recErr;

      // replace entries if provided
      if (entries !== undefined) {
        await supabase.from("time_entries").delete().eq("record_id", rec.id);
        if (entries.length > 0) {
          const rows = entries.map((e: any) => ({
            record_id: rec.id,
            time: `${isoDate}T${e.time}:00`,
            type: e.type,
            original: e.time,
            is_manual: true,
          }));
          const { error: entErr } = await supabase.from("time_entries").insert(rows);
          if (entErr) throw entErr;
        }
      }

      // return full record with entries
      const { data: full } = await supabase
        .from("attendance_records")
        .select("*, time_entries(*)")
        .eq("id", rec.id)
        .single();
      res.json({ success: true, record: full });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/attendance/record/:recordId", async (req, res) => {
    try {
      const { status, justification, entries, no_lunch } = req.body;
      const updates: any = { updated_at: new Date().toISOString() };
      if (status !== undefined) updates.status = status;
      if (justification !== undefined) updates.justification = justification;

      if (entries !== undefined) {
        const { data: rec0 } = await supabase
          .from("attendance_records").select("employee_id, status").eq("id", req.params.recordId).single();
        const sched = rec0 ? await getEmpSchedule(rec0.employee_id) : { expected: 480, lunch: 60 };
        const effectiveStatus = updates.status ?? rec0?.status ?? "";
        const isLeave = LEAVE_STATUSES.includes(effectiveStatus);
        const effExpected = (isLeave && entries.length) ? 0 : sched.expected;
        // For leave days, never deduct lunch (all worked hours count as overtime)
        const effectiveNoLunch = !!no_lunch || isLeave;
        const hours = calculateWorkHours(entries, effExpected, sched.lunch, effectiveNoLunch);
        Object.assign(updates, {
          total_work: hours.totalWorkMinutes,
          overtime50: hours.overtime50Minutes,
          overtime100: hours.overtime100Minutes,
          night_shift: hours.nightShiftMinutes,
          delay: hours.delayMinutes,
        });
      }

      const { data: rec, error } = await supabase
        .from("attendance_records")
        .update(updates)
        .eq("id", req.params.recordId)
        .select()
        .single();
      if (error) throw error;

      if (entries !== undefined) {
        await supabase.from("time_entries").delete().eq("record_id", rec.id);
        if (entries.length > 0) {
          const rows = entries.map((e: any) => ({
            record_id: rec.id,
            time: `${rec.date}T${e.time}:00`,
            type: e.type,
            original: e.time,
            is_manual: true,
          }));
          await supabase.from("time_entries").insert(rows);
        }
      }

      const { data: full } = await supabase
        .from("attendance_records")
        .select("*, time_entries(*)")
        .eq("id", rec.id)
        .single();
      res.json({ success: true, record: full });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/attendance/record/:recordId", async (req, res) => {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("id", req.params.recordId);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Time Bank ─────────────────────────────────────────────────────────────
  app.get("/api/time-bank/:employeeId", async (req, res) => {
    try {
      const empId = req.params.employeeId;
      const { data, error } = await supabase
        .from(BANK_TABLE)
        .select("*")
        .eq(BANK_EMP_COL, empId)
        .order("date", { ascending: false });
      if (error) {
        console.error("[time-bank GET]", error.message, error.details, "table:", BANK_TABLE);
        throw new Error(error.message);
      }
      // Normalize to snake_case for frontend regardless of which table was used
      let entries = (data || []).map((r: any) => ({
        id: r.id,
        employee_id: r.employee_id ?? r.employeeId,
        minutes: r.minutes,
        date: r.date,
        description: r.description,
        type: r.type,
        created_at: r.created_at ?? r.createdAt,
      }));

      // If PIN_SEED_* entries exist, use the latest one as the authoritative balance base.
      // All entries before the latest PIN_SEED date are superseded by it.
      const pinSeeds = entries
        .filter((e: any) => e.type?.startsWith("PIN_SEED_"))
        .sort((a: any, b: any) => b.date.localeCompare(a.date));

      if (pinSeeds.length > 0) {
        const latestSeed = pinSeeds[0];
        const laterEntries = entries.filter(
          (e: any) => !e.type?.startsWith("PIN_SEED_") && e.date > latestSeed.date
        );
        const total = latestSeed.minutes + laterEntries.reduce((s: number, e: any) => s + (e.minutes || 0), 0);
        res.json({ success: true, entries, totalMinutes: total, pinSeedPresent: true, pinSeedDate: latestSeed.date });
      } else {
        const total = entries.reduce((s: number, r: any) => s + (r.minutes || 0), 0);
        res.json({ success: true, entries, totalMinutes: total, pinSeedPresent: false });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/time-bank/:employeeId", async (req, res) => {
    try {
      const { minutes, date, description, type } = req.body;
      if (!minutes) return res.status(400).json({ error: "Informe os minutos" });
      const absMin = Math.abs(Number(minutes));
      if (isNaN(absMin) || absMin === 0) return res.status(400).json({ error: "Valor de minutos inválido" });
      const record: Record<string, any> = {
        [BANK_EMP_COL]: req.params.employeeId,
        minutes: type === "debit" ? -absMin : absMin,
        date: date || new Date().toISOString().substring(0, 10),
        description: description || null,
        type: type === "debit" ? "COMPENSATION" : "OVERTIME",
      };
      const { data, error } = await supabase
        .from(BANK_TABLE)
        .insert([record])
        .select()
        .single();
      if (error) {
        const detail = [error.message, error.details, error.hint].filter(Boolean).join(" | ");
        console.error("[time-bank POST]", detail, "table:", BANK_TABLE);
        return res.status(500).json({ error: detail });
      }
      // Normalize response to snake_case
      const entry = {
        id: data.id,
        employee_id: data.employee_id ?? data.employeeId,
        minutes: data.minutes,
        date: data.date,
        description: data.description,
        type: data.type,
        created_at: data.created_at ?? data.createdAt,
      };
      res.json({ success: true, entry });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE a single time-bank entry
  app.delete("/api/time-bank/entry/:entryId", async (req, res) => {
    try {
      const { error } = await supabase
        .from(BANK_TABLE)
        .delete()
        .eq("id", req.params.entryId);
      if (error) throw new Error(error.message);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT (edit) a single time-bank entry
  app.put("/api/time-bank/entry/:entryId", async (req, res) => {
    try {
      const { minutes, date, description, type } = req.body;
      const absMin = Math.abs(Number(minutes));
      const updates: Record<string, any> = {
        minutes: type === "debit" ? -absMin : absMin,
        type: type === "debit" ? "COMPENSATION" : "OVERTIME",
      };
      if (date) updates.date = date;
      if (description !== undefined) updates.description = description || null;
      const { data, error } = await supabase
        .from(BANK_TABLE)
        .update(updates)
        .eq("id", req.params.entryId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const entry = {
        id: data.id,
        employee_id: data.employee_id ?? data.employeeId,
        minutes: data.minutes,
        date: data.date,
        description: data.description,
        type: data.type,
      };
      res.json({ success: true, entry });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── PIN Project / Saldos Acumulados ──────────────────────────────────────
  const PIN_SEED_TYPE = "PIN_SEED_MAI2026";
  // GET all active employees with their PIN_SEED_* balances (all months)
  app.get("/api/pin-project/balances", async (_req, res) => {
    try {
      // All active employees (no pin_project filter — any employee can be in the spreadsheet)
      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select("id,name,cpf,registration,departments(name)")
        .order("name");
      if (empErr) throw new Error(empErr.message);

      const empIds = (emps || []).map((e: any) => e.id);
      let seeds: any[] = [];
      if (empIds.length > 0) {
        const { data: bankData } = await supabase
          .from(BANK_TABLE)
          .select("*")
          .like("type", "PIN_SEED_%")
          .in(BANK_EMP_COL, empIds);
        seeds = bankData || [];
      }

      // Build map: { employeeId: { "MAI2026": minutes, "JUN2026": minutes, ... } }
      const seedMap: Record<string, Record<string, number>> = {};
      for (const s of seeds) {
        const eid = s.employee_id ?? s.employeeId;
        const mKey = (s.type as string).replace("PIN_SEED_", "");
        if (!seedMap[eid]) seedMap[eid] = {};
        seedMap[eid][mKey] = s.minutes;
      }

      // All unique month keys that exist in the DB, sorted chronologically
      const monthNumOf = (k: string) => {
        const ABBR: Record<string, number> = { JAN:1,FEV:2,MAR:3,ABR:4,MAI:5,JUN:6,JUL:7,AGO:8,SET:9,OUT:10,NOV:11,DEZ:12 };
        const yr = parseInt(k.slice(3), 10);
        const mo = ABBR[k.slice(0, 3)] ?? 0;
        return yr * 100 + mo;
      };
      const allMonthKeys = [...new Set(seeds.map((s: any) => (s.type as string).replace("PIN_SEED_", "")))]
        .sort((a, b) => monthNumOf(a) - monthNumOf(b));

      const result = (emps || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        cpf: e.cpf,
        registration: e.registration,
        department: e.departments?.name ?? null,
        pinSeeds: seedMap[e.id] ?? {},
        // backward-compat: May 2026 seed
        pinSeedMinutes: seedMap[e.id]?.["MAI2026"] ?? null,
      }));

      res.json({ success: true, employees: result, monthKeys: allMonthKeys });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST import/upsert PIN seed balance for one employee
  app.post("/api/pin-project/balance/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { minutes, description } = req.body;
      if (minutes === undefined || minutes === null) return res.status(400).json({ error: "Informe os minutos" });
      const min = Number(minutes);
      if (isNaN(min)) return res.status(400).json({ error: "Valor inválido de minutos" });

      // Delete any existing seed for this employee
      await supabase
        .from(BANK_TABLE)
        .delete()
        .eq(BANK_EMP_COL, employeeId)
        .eq("type", PIN_SEED_TYPE);

      // Insert new seed
      const record: Record<string, any> = {
        [BANK_EMP_COL]: employeeId,
        minutes: min,
        date: "2026-05-31",
        type: PIN_SEED_TYPE,
        description: description || "Saldo acumulado PIN Projeto Jan–Mai/2026 (planilha)",
      };
      const { data, error } = await supabase
        .from(BANK_TABLE)
        .insert([record])
        .select()
        .single();
      if (error) throw new Error(error.message);
      res.json({ success: true, entry: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST bulk import PIN seed balances
  // Stores PIN_SEED_MAI2026 (accumulated through May) AND PIN_SEED_DEZ2025 (starting balance)
  // Both seeds enable full auto-calculation from attendance records
  app.post("/api/pin-project/import-bulk", async (req, res) => {
    try {
      const { entries } = req.body as {
        entries: Array<{ employeeId: string; minutes: number; nome: string; saldoDezMin?: number }>;
      };
      if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: "Nenhuma entrada fornecida" });

      const results: Array<{ employeeId: string; nome: string; ok: boolean; error?: string }> = [];

      for (const entry of entries) {
        try {
          const min = Number(entry.minutes);
          if (isNaN(min)) { results.push({ employeeId: entry.employeeId, nome: entry.nome, ok: false, error: "Minutos inválidos" }); continue; }

          // Store May 2026 accumulated balance (PIN_SEED_MAI2026)
          await supabase.from(BANK_TABLE).delete().eq(BANK_EMP_COL, entry.employeeId).eq("type", PIN_SEED_TYPE);
          const { error: e1 } = await supabase.from(BANK_TABLE).insert([{
            [BANK_EMP_COL]: entry.employeeId,
            minutes: min,
            date: "2026-05-31",
            type: PIN_SEED_TYPE,
            description: "Saldo acumulado PIN — Jan a Mai/2026 (planilha)",
          }]);

          // Also store December 2025 starting balance (PIN_SEED_DEZ2025) if provided
          // This enables auto-calculation of Jan-May from attendance records
          if (entry.saldoDezMin !== undefined && entry.saldoDezMin !== null) {
            const dezMin = Number(entry.saldoDezMin);
            if (!isNaN(dezMin)) {
              await supabase.from(BANK_TABLE).delete().eq(BANK_EMP_COL, entry.employeeId).eq("type", "PIN_SEED_DEZ2025");
              await supabase.from(BANK_TABLE).insert([{
                [BANK_EMP_COL]: entry.employeeId,
                minutes: dezMin,
                date: "2025-12-31",
                type: "PIN_SEED_DEZ2025",
                description: "Saldo inicial PIN — Dez/2025 (planilha)",
              }]);
            }
          }

          results.push({ employeeId: entry.employeeId, nome: entry.nome, ok: !e1, error: e1?.message });
        } catch (e: any) {
          results.push({ employeeId: entry.employeeId, nome: entry.nome, ok: false, error: e.message });
        }
      }

      const ok = results.filter(r => r.ok).length;
      res.json({ success: true, imported: ok, total: results.length, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET auto-computed PIN accumulated balances from attendance records
  // Uses PIN_SEED_DEZ2025 as starting point to compute Jan–current from actual ponto records.
  // Uses PIN_SEED_MAI2026 (or any later seed) to compute current and future months.
  app.get("/api/pin-project/auto-balances", async (_req, res) => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const MONTH_ABBR_TO_NUM: Record<string, number> = {
        JAN:1,FEV:2,MAR:3,ABR:4,MAI:5,JUN:6,JUL:7,AGO:8,SET:9,OUT:10,NOV:11,DEZ:12,
      };
      const mkNum = (k: string) => parseInt(k.slice(3), 10) * 100 + (MONTH_ABBR_TO_NUM[k.slice(0, 3)] ?? 0);

      // Fetch all active employees — use schedules(*) to avoid PostgREST errors when
      // the schedules table uses camelCase column names (expectedWork from Prisma).
      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select("id,name,cpf,registration,departments(name),schedules(*)")
        .order("name");
      if (empErr) throw new Error(`employees query: ${empErr.message}`);
      if (!emps || emps.length === 0) return res.json({ success: true, employees: [] });

      const empIds = emps.map((e: any) => e.id);

      // Fetch all PIN_SEED_* entries for all employees in one query
      const { data: allSeeds, error: seedsErr } = await supabase
        .from(BANK_TABLE)
        .select("*")
        .like("type", "PIN_SEED_%")
        .in(BANK_EMP_COL, empIds)
        .order("date", { ascending: true })
        .limit(10000);
      if (seedsErr) throw new Error(`seeds query: ${seedsErr.message}`);

      // Build seed map: empId → { monthKey → minutes }
      const seedsByEmp: Record<string, Record<string, number>> = {};
      for (const s of allSeeds || []) {
        const eid = s.employee_id ?? s.employeeId;
        const mk = (s.type as string).replace("PIN_SEED_", "");
        if (!seedsByEmp[eid]) seedsByEmp[eid] = {};
        seedsByEmp[eid][mk] = s.minutes;
      }

      // Fetch regular bank entries (non-PIN_SEED) to use as fallback starting balance
      const { data: allBankEntries } = await supabase
        .from(BANK_TABLE)
        .select("employee_id, employeeId, type, minutes")
        .not("type", "like", "PIN_SEED_%")
        .in(BANK_EMP_COL, empIds)
        .limit(10000);

      // Sum regular bank entries per employee (credit adds, debit subtracts)
      const bankTotalByEmp: Record<string, number> = {};
      for (const e of allBankEntries || []) {
        const eid = e.employee_id ?? e.employeeId;
        const mins = e.type === "debit" ? -(e.minutes || 0) : (e.minutes || 0);
        bankTotalByEmp[eid] = (bankTotalByEmp[eid] || 0) + mins;
      }

      // Determine earliest start date needed from seeds to minimise row count.
      // Supabase PostgREST caps at max_rows (default 1000). Starting from the month
      // after the oldest seed (instead of 2026-01-01) keeps the result set small enough.
      let minStartYear = currentYear, minStartMonth = currentMonth;
      for (const empSeeds of Object.values(seedsByEmp)) {
        for (const mk of Object.keys(empSeeds)) {
          const abbr = mk.slice(0, 3);
          const yr = parseInt(mk.slice(3), 10);
          const mo = (MONTH_ABBR_TO_NUM[abbr] ?? 0) + 1;
          const sY = mo > 12 ? yr + 1 : yr;
          const sM = mo > 12 ? 1 : mo;
          if (sY < minStartYear || (sY === minStartYear && sM < minStartMonth)) {
            minStartYear = sY; minStartMonth = sM;
          }
        }
      }
      // If no seeds, fall back to start of current year
      if (Object.keys(seedsByEmp).length === 0) { minStartYear = currentYear; minStartMonth = 1; }
      const recStartDate = `${minStartYear}-${String(minStartMonth).padStart(2, "0")}-01`;

      // Fetch attendance records — paginated to handle Supabase row limits (default 1000/page)
      const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
      const recEndDate = `${currentYear}-${String(currentMonth).padStart(2,"0")}-${String(lastDayOfCurrentMonth).padStart(2,"0")}`;
      let allRecs: any[] = [];
      {
        let from = 0;
        const PAGE = 1000;
        for (let page = 0; page < 20; page++) {
          const { data: chunk, error: chunkErr } = await supabase
            .from("attendance_records")
            .select("employee_id, date, status, overtime50, overtime100, total_work")
            .in("employee_id", empIds)
            .gte("date", recStartDate)
            .lte("date", recEndDate)
            .order("date")
            .range(from, from + PAGE - 1);
          if (chunkErr) throw new Error(`attendance query page ${page}: ${chunkErr.message}`);
          if (!chunk || chunk.length === 0) break;
          allRecs = allRecs.concat(chunk);
          if (chunk.length < PAGE) break;
          from += PAGE;
        }
      }

      // Index records by empId → date prefix
      const recsByEmp: Record<string, { date: string; overtime50: number; overtime100: number; total_work: number | null; status: string }[]> = {};
      for (const r of allRecs || []) {
        const eid = r.employee_id;
        if (!recsByEmp[eid]) recsByEmp[eid] = [];
        recsByEmp[eid].push({
          date: r.date,
          overtime50: r.overtime50 || 0,
          overtime100: r.overtime100 || 0,
          total_work: r.total_work ?? null,
          status: r.status,
        });
      }

      const LEAVE_FOR_PIN = new Set(["VACATION","PREMIUM_LEAVE","HOLIDAY","OFF_DAY"]);

      const employees = emps.map((emp: any) => {
        // Handle both Prisma camelCase (expectedWork) and snake_case (expected_work)
        const sc = emp.schedules;
        const empExpected: number = sc ? (sc.expected_work ?? sc.expectedWork ?? 480) : 480;
        const seeds: Record<string, number> = { ...(seedsByEmp[emp.id] ?? {}) };
        const recs  = recsByEmp[emp.id]  ?? [];

        // Determine starting point: prefer DEZ2025 seed → full history
        // Otherwise: latest seed; or if no seed, start from first attendance month (accumulated = 0)
        const hasDezSeed = "DEZ2025" in seeds;
        const sortedSeedKeys = Object.keys(seeds).sort((a, b) => mkNum(a) - mkNum(b));
        const latestSeedMk = sortedSeedKeys.at(-1) ?? null;
        const startMk = hasDezSeed ? "DEZ2025" : latestSeedMk;

        let startY: number, startM: number, accumulated: number;
        let noSeedMode = false;

        if (startMk) {
          // Has seed — start from month after the seed
          const startAbbr = startMk.slice(0, 3);
          startY = parseInt(startMk.slice(3), 10);
          startM = (MONTH_ABBR_TO_NUM[startAbbr] ?? 12) + 1;
          if (startM > 12) { startM = 1; startY++; }
          accumulated = seeds[startMk];
        } else if (recs.length > 0) {
          // No PIN_SEED — use regular bank entries balance as starting point
          noSeedMode = true;
          const firstDate = recs.reduce((a, b) => a.date < b.date ? a : b).date;
          const [fy, fm] = firstDate.substring(0, 7).split("-").map(Number);
          startY = fy; startM = fm;
          accumulated = bankTotalByEmp[emp.id] ?? 0;
        } else {
          // No seed, no records — nothing to show
          return { id: emp.id, name: emp.name, cpf: emp.cpf, autoMonths: {}, hasAnySeed: false };
        }

        const autoMonths: Record<string, {
          acum: number | null; extras: number; goal: number;
          recordCount: number; isComplete: boolean; isCurrentMonth: boolean; noSeedMode: boolean;
        }> = {};

        let y = startY, m = startM;

        while (y < currentYear || (y === currentYear && m <= currentMonth)) {
          const prefix = `${y}-${String(m).padStart(2, "0")}`;
          const monthRecs = recs.filter(r => r.date.startsWith(prefix) && !LEAVE_FOR_PIN.has(r.status));
          const totalExtras = monthRecs.reduce((s, r) => {
            let ot = (r.overtime50 || 0) + (r.overtime100 || 0);
            // Fallback: if stored overtime = 0 but total_work > expected, derive overtime from total_work.
            // This handles records where time_entries were added after the initial upload
            // without recomputing attendance_records.overtime50.
            if (ot === 0 && r.total_work != null && r.total_work > empExpected) {
              ot = r.total_work - empExpected;
            }
            return s + ot;
          }, 0);
          // bonusGoal: monthly target to earn PIN bonus (may be 2880 in Apr/Jun/Jul per Decreto)
          // bankGoal: always 2400 (40h) — only excess over 40h goes to banco de horas
          const bonusGoal = PIN_MONTH_GOALS[m] ?? 2400;
          const bankGoal = 2400;
          const monthDelta = totalExtras - bankGoal;
          accumulated += monthDelta;

          const abbr = PIN_MONTH_ABBR[m] ?? "???";
          const mk = `${abbr}${y}`;
          const isCurrentMonth = (y === currentYear && m === currentMonth);
          const isComplete = !isCurrentMonth;

          // Manual seed override for this month takes precedence
          if (mk in seeds) {
            accumulated = seeds[mk];
            autoMonths[mk] = { acum: seeds[mk], extras: totalExtras, goal: bonusGoal, recordCount: monthRecs.length, isComplete, isCurrentMonth, noSeedMode: false };
          } else {
            autoMonths[mk] = { acum: accumulated, extras: totalExtras, goal: bonusGoal, recordCount: monthRecs.length, isComplete, isCurrentMonth, noSeedMode };
          }

          m++;
          if (m > 12) { m = 1; y++; }
        }

        return {
          id: emp.id,
          name: emp.name,
          cpf: emp.cpf,
          autoMonths,
          hasAnySeed: !!startMk,
          noSeedMode,
          startMk: startMk ?? null,
          hasDezSeed,
        };
      });

      res.json({ success: true, employees });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST import a specific month's accumulated balance for all employees
  // Body: { monthKey: "JUN2026", entries: [{ employeeId, minutes, nome }] }
  app.post("/api/pin-project/import-month", async (req, res) => {
    try {
      const { monthKey, entries } = req.body as {
        monthKey: string;
        entries: Array<{ employeeId: string; minutes: number; nome: string }>;
      };
      if (!monthKey || !/^[A-Z]{3}\d{4}$/.test(monthKey)) return res.status(400).json({ error: "monthKey inválido (ex: JUN2026)" });
      if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: "Nenhuma entrada fornecida" });

      const seedType = `PIN_SEED_${monthKey}`;
      // Determine date from month key (last day of the month)
      const ABBR_TO_M: Record<string, number> = { JAN:1,FEV:2,MAR:3,ABR:4,MAI:5,JUN:6,JUL:7,AGO:8,SET:9,OUT:10,NOV:11,DEZ:12 };
      const mo = ABBR_TO_M[monthKey.slice(0, 3)] ?? 1;
      const yr = parseInt(monthKey.slice(3), 10);
      const lastDay = new Date(yr, mo, 0).getDate();
      const seedDate = `${yr}-${String(mo).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;

      const results: Array<{ employeeId: string; nome: string; ok: boolean; error?: string }> = [];
      for (const entry of entries) {
        try {
          const min = Number(entry.minutes);
          if (isNaN(min)) { results.push({ employeeId: entry.employeeId, nome: entry.nome, ok: false, error: "Minutos inválidos" }); continue; }

          await supabase.from(BANK_TABLE).delete().eq(BANK_EMP_COL, entry.employeeId).eq("type", seedType);
          const { error } = await supabase.from(BANK_TABLE).insert([{
            [BANK_EMP_COL]: entry.employeeId,
            minutes: min,
            date: seedDate,
            type: seedType,
            description: `Saldo acumulado PIN — Jan a ${monthKey.slice(0,3)}/${monthKey.slice(5)} (planilha)`,
          }]);
          results.push({ employeeId: entry.employeeId, nome: entry.nome, ok: !error, error: error?.message });
        } catch (e: any) {
          results.push({ employeeId: entry.employeeId, nome: entry.nome, ok: false, error: e.message });
        }
      }
      const ok = results.filter(r => r.ok).length;
      res.json({ success: true, monthKey, seedDate, imported: ok, total: results.length, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET PIN month goals
  app.get("/api/pin-project/goals", (_req, res) => {
    res.json({ success: true, goals: PIN_MONTH_GOALS, monthAbbr: PIN_MONTH_ABBR });
  });

  // PUT PIN month goals — admin configuration
  app.put("/api/pin-project/goals", async (req, res) => {
    try {
      const { goals } = req.body as { goals: Record<string, number> };
      if (!goals || typeof goals !== "object") return res.status(400).json({ error: "goals inválido" });
      for (const [k, v] of Object.entries(goals)) {
        const m = parseInt(k);
        const min = Number(v);
        if (m >= 1 && m <= 12 && !isNaN(min) && min > 0) PIN_MONTH_GOALS[m] = min;
      }
      // Persist to app_settings (best-effort, table may not exist)
      try {
        await supabase.from("app_settings").upsert(
          { key: "pin_month_goals", value: PIN_MONTH_GOALS, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      } catch { /* no app_settings table — in-memory update still applied */ }
      res.json({ success: true, goals: PIN_MONTH_GOALS });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE PIN seed balance for one employee
  app.delete("/api/pin-project/balance/:employeeId", async (req, res) => {
    try {
      await supabase.from(BANK_TABLE).delete().eq(BANK_EMP_COL, req.params.employeeId).eq("type", PIN_SEED_TYPE);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Organization ─────────────────────────────────────────────────────────
  app.get("/api/organizations", async (_req, res) => {
    try {
      const { data, error } = await supabase.from("organizations").select("*").limit(1);
      if (error) throw error;
      res.json({ success: true, organization: data?.[0] || null });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/organizations", async (req, res) => {
    try {
      const orgId = await getOrCreateOrg();
      const allowed = ["name","cnpj","address","phone","email","logo_url"];
      const updates: Record<string,any> = {};
      for (const k of allowed) { if (k in req.body) updates[k] = req.body[k]; }
      const { data, error } = await supabase.from("organizations").update(updates).eq("id", orgId).select().single();
      if (error) throw error;
      res.json({ success: true, organization: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Reports ───────────────────────────────────────────────────────────────
  app.get("/api/reports/summary", async (req, res) => {
    try {
      const { year, month } = req.query as { year?: string; month?: string };
      const y = year || String(new Date().getFullYear());
      const m = month || String(new Date().getMonth() + 1);
      const from = `${y}-${String(m).padStart(2,"0")}-01`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const to = `${y}-${String(m).padStart(2,"0")}-${lastDay}`;

      const [empRes, recRes] = await Promise.all([
        supabase.from("employees").select("id,status", { count: "exact" }),
        supabase.from("attendance_records")
          .select("status,total_work,overtime50,overtime100,delay")
          .gte("date", from).lte("date", to),
      ]);
      const employees = empRes.data || [];
      const records = recRes.data || [];
      const active = employees.filter((e:any) => (e.status || "ATIVO") === "ATIVO").length;
      const absences = records.filter((r:any) => r.status === "ABSENCE").length;
      const certificates = records.filter((r:any) => r.status === "CERTIFICATE").length;
      const totalOvertime = records.reduce((s:number,r:any) => s + (r.overtime50||0) + (r.overtime100||0), 0);
      const totalDelay = records.reduce((s:number,r:any) => s + (r.delay||0), 0);

      // per-day aggregation for chart
      const byDay: Record<string,any> = {};
      for (const r of records as any[]) {
        if (!byDay[r.date]) byDay[r.date] = { date: r.date, worked: 0, overtime: 0, absences: 0 };
        byDay[r.date].worked += r.total_work || 0;
        byDay[r.date].overtime += (r.overtime50||0) + (r.overtime100||0);
        if (r.status === "ABSENCE") byDay[r.date].absences++;
      }

      res.json({
        success: true,
        summary: { totalEmployees: employees.length, activeEmployees: active, absences, certificates, totalOvertimeMinutes: totalOvertime, totalDelayMinutes: totalDelay },
        chartData: Object.values(byDay).sort((a:any,b:any) => a.date.localeCompare(b.date)),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/reports/absences", async (req, res) => {
    try {
      const { year, month } = req.query as { year?: string; month?: string };
      const y = year || String(new Date().getFullYear());
      const m = month || String(new Date().getMonth() + 1);
      const from = `${y}-${String(m).padStart(2,"0")}-01`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const to = `${y}-${String(m).padStart(2,"0")}-${lastDay}`;
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id,date,status,justification,employee_id,employees(name,registration)")
        .in("status", ["ABSENCE","CERTIFICATE"])
        .gte("date", from).lte("date", to)
        .order("date");
      if (error) throw error;
      res.json({ success: true, records: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Upload PDF ────────────────────────────────────────────────────────────
  app.post("/api/upload/ponto", async (req, res) => {
    try {
      const { base64 } = req.body;
      if (!base64) return res.status(400).json({ error: "Missing base64" });

      console.log("\n📄 Extracting PDF text...");
      const buffer = Buffer.from(base64, "base64");
      const { extractTextFromPDF } = await import("./src/services/pdfService.js");
      const { extractEmployeeDataFromPdfText } = await import("./src/services/advancedPdfService.js");
      const pdfText = await extractTextFromPDF(buffer);
      console.log(`✅ Extracted ${pdfText.length} chars`);

      const employees = await extractEmployeeDataFromPdfText(pdfText);
      if (!employees?.length) return res.status(400).json({ error: "Nenhum funcionário identificado no PDF." });

      console.log(`✅ ${employees.length} employees found`);
      res.json({ success: true, employees });
    } catch (e: any) {
      console.error("❌ PDF:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/upload/ponto/save", async (req, res) => {
    try {
      const { employees } = req.body;
      if (!Array.isArray(employees)) return res.status(400).json({ error: "Missing employees" });

      const orgId = await getOrCreateOrg();
      const results: any[] = [];

      for (const empData of employees) {
        try {
          const { name, registration, cpf, department, records } = empData as any;

          // ── Find or create employee ─────────────────────────────────────
          let { data: found } = await supabase
            .from("employees")
            .select("id")
            .eq("registration", String(registration).trim())
            .limit(1);
          let employeeId: string;
          if (found?.[0]) {
            employeeId = found[0].id;
          } else {
            const { data: created, error: createErr } = await supabase
              .from("employees")
              .insert([{ name, registration: String(registration).trim(), cpf: cpf || null, organization_id: orgId, role_title: "Colaborador" }])
              .select("id");
            if (createErr) throw createErr;
            employeeId = created![0].id;
          }

          const sched = await getEmpSchedule(employeeId);

          // ── Build all attendance_record payloads for this employee ──
          const recordPayloads: any[] = [];
          for (const rec of records || []) {
            if (!rec.date) continue;
            const isoDate = parseToISO(rec.date);
            if (!isoDate) continue;
            const hours = rec.entries?.length
              ? calculateWorkHours(rec.entries, sched.expected, sched.lunch)
              : { totalWorkMinutes: 0, overtime50Minutes: 0, overtime100Minutes: 0, nightShiftMinutes: 0, delayMinutes: 0 };
            recordPayloads.push({
              employee_id: employeeId,
              date: isoDate,
              status: rec.status || "NORMAL",
              justification: rec.justification || null,
              total_work: hours.totalWorkMinutes,
              overtime50: hours.overtime50Minutes,
              overtime100: hours.overtime100Minutes,
              night_shift: hours.nightShiftMinutes,
              delay: hours.delayMinutes,
              updated_at: new Date().toISOString(),
              _entries: rec.entries || [], // temporary, stripped before upsert
            });
          }

          if (!recordPayloads.length) {
            results.push({ employeeId, name, registration, savedRecords: 0, skippedRecords: 0 });
            continue;
          }

          // ── Single bulk SELECT to find which dates already exist ──
          const allDates = recordPayloads.map(r => r.date);
          const { data: existingRows } = await supabase
            .from("attendance_records")
            .select("id,date")
            .eq("employee_id", employeeId)
            .in("date", allDates);

          const existingMap = new Map<string, string>(
            (existingRows ?? []).map(r => [r.date.slice(0, 10), r.id])
          );

          // ── Batch INSERT new records; UPDATE existing ones in parallel ──
          const toInsert = recordPayloads.filter(r => !existingMap.has(r.date));
          const toUpdate = recordPayloads.filter(r =>  existingMap.has(r.date));

          const insertRows = toInsert.map(({ _entries: _e, ...rest }) => rest);
          const insertedMap = new Map<string, string>();
          if (insertRows.length) {
            const { data: ins, error: insErr } = await supabase
              .from("attendance_records")
              .insert(insertRows)
              .select("id,date");
            if (insErr) throw insErr;
            for (const r of ins ?? []) insertedMap.set(r.date.slice(0, 10), r.id);
          }

          // Run updates in parallel (no sequential round-trips)
          await Promise.all(toUpdate.map(r => {
            const { _entries: _e, ...payload } = r;
            return supabase
              .from("attendance_records")
              .update(payload)
              .eq("id", existingMap.get(r.date)!);
          }));

          const savedRecords = toInsert.length + toUpdate.length;

          // ── Build date→id map for time_entries replacement ──
          const dateToId = new Map<string, string>([...existingMap, ...insertedMap]);

          // ── Bulk replace time_entries for records that have entries ──
          const recordsWithEntries = recordPayloads.filter(r => r._entries.length > 0);
          if (recordsWithEntries.length) {
            const recordIds = recordsWithEntries
              .map(r => dateToId.get(r.date))
              .filter(Boolean) as string[];

            if (recordIds.length) {
              await supabase.from("time_entries").delete().in("record_id", recordIds);

              const timeRows: any[] = [];
              for (const r of recordsWithEntries) {
                const recId = dateToId.get(r.date);
                if (!recId) continue;
                for (const e of r._entries as any[]) {
                  timeRows.push({ record_id: recId, time: `${r.date}T${e.time}:00`, type: e.type, original: e.time });
                }
              }
              if (timeRows.length) {
                await supabase.from("time_entries").insert(timeRows);
              }
            }
          }

          results.push({ employeeId, name, registration, savedRecords, skippedRecords: 0 });
        } catch (err: any) {
          results.push({ error: err.message, name: empData?.name });
        }
      }

      res.json({ success: true, results });
    } catch (e: any) {
      console.error("❌ Save:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Bulk attendance for all employees (dashboard) ────────────────────────
  app.get("/api/attendance-bulk", async (req, res) => {
    try {
      const { year, month } = req.query as { year?: string; month?: string };
      const y = year || String(new Date().getFullYear());
      const m = month || String(new Date().getMonth() + 1);
      const from = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const to = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, date, status, total_work, employee_id, time_entries(id, time, type)")
        .gte("date", from)
        .lte("date", to)
        .order("date");
      if (error) throw error;
      res.json({ success: true, records: data || [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── System Users (Auth) ───────────────────────────────────────────────────
  // Uses Supabase Admin API (service role key) to manage auth users + app_metadata roles.

  // List all auth users with their roles
  app.get("/api/system-users", async (_req, res) => {
    try {
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      const users = (data.users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || u.user_metadata?.full_name || "",
        role: (u.app_metadata?.system_role || u.user_metadata?.system_role || "VIEWER") as string,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at || null,
        confirmed: !!u.confirmed_at,
      }));
      res.json({ success: true, users });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create new auth user with role
  app.post("/api/system-users", async (req, res) => {
    try {
      const { email, name, role, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "email e password são obrigatórios" });
      const validRoles = ["ADMIN", "AUDITOR", "VIEWER"];
      const safeRole = validRoles.includes(role) ? role : "VIEWER";
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || "" },
        app_metadata: { system_role: safeRole },
      });
      if (error) throw error;
      res.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name,
          role: safeRole,
          created_at: data.user.created_at,
          confirmed: true,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update user role and/or name/password
  app.patch("/api/system-users/:id", async (req, res) => {
    try {
      const { role, name, password } = req.body;
      const validRoles = ["ADMIN", "AUDITOR", "VIEWER"];
      const updates: any = {};
      if (name !== undefined) updates.user_metadata = { name };
      if (role && validRoles.includes(role)) updates.app_metadata = { system_role: role };
      if (password) updates.password = password;
      const { data, error } = await supabase.auth.admin.updateUserById(req.params.id, updates);
      if (error) throw error;
      res.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || "",
          role: data.user.app_metadata?.system_role || "VIEWER",
          confirmed: !!data.user.confirmed_at,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete auth user
  app.delete("/api/system-users/:id", async (req, res) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Admin: apagar TODOS os apontamentos ──────────────────────────────────
  // Requer autenticação: verifica a senha do admin via Supabase Auth
  app.delete("/api/admin/purge-attendance", async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      // Validate credentials via Supabase Auth
      const anonUrl = process.env.VITE_SUPABASE_URL!;
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE!;
      const { createClient: cc } = await import("@supabase/supabase-js");
      const anonClient = cc(anonUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Senha incorreta ou usuário não encontrado" });
      }

      // Check if user has ADMIN role
      const role = authData.user.app_metadata?.system_role ?? authData.user.user_metadata?.system_role ?? "VIEWER";
      if (role !== "ADMIN") {
        return res.status(403).json({ error: "Apenas administradores podem executar esta ação" });
      }

      // Delete all time_entries first (FK constraint), then attendance_records
      const { error: e1 } = await supabase.from("time_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (e1) throw new Error("Erro ao apagar marcações: " + e1.message);

      const { error: e2 } = await supabase.from("attendance_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (e2) throw new Error("Erro ao apagar apontamentos: " + e2.message);

      res.json({ success: true, message: "Todos os apontamentos foram apagados." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}

// ─── Local dev server (Vite + Express on same port) ───────────────────────────

async function startServer() {
  const app = await createApp();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api") || url.includes(".")) return next();
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        if (!fs.existsSync(indexPath)) return res.status(404).send("index.html not found");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        res.status(500).end(e.stack);
      }
    });
    console.log("✅ Vite integrated");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Chronos Ponto on http://localhost:${PORT}`);
    console.log(`📊 Database: Supabase (REST API)\n`);
  });
}

// Only start the local dev server when this file is run directly (not imported by Vercel)
if (process.argv[1] === __filename) {
  console.log("🎬 Starting...");
  startServer().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
}
