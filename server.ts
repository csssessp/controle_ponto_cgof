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
  // Single IN/OUT pair (no lunch punch) → deduct lunch automatically
  const netWork = pairCount === 1 && lunchMinutes > 0
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
      const { date, status, justification, entries } = req.body;
      const isoDate = parseToISO(date);
      if (!isoDate) return res.status(400).json({ error: "Invalid date" });

      // upsert record
      const sched = await getEmpSchedule(employeeId);
      const hours = entries?.length ? calculateWorkHours(entries, sched.expected, sched.lunch) : { totalWorkMinutes:0, overtime50Minutes:0, overtime100Minutes:0, nightShiftMinutes:0, delayMinutes:0 };
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
      const { status, justification, entries } = req.body;
      const updates: any = { updated_at: new Date().toISOString() };
      if (status !== undefined) updates.status = status;
      if (justification !== undefined) updates.justification = justification;

      if (entries !== undefined) {
        const { data: rec0 } = await supabase
          .from("attendance_records").select("employee_id").eq("id", req.params.recordId).single();
        const sched = rec0 ? await getEmpSchedule(rec0.employee_id) : { expected: 480, lunch: 60 };
        const hours = calculateWorkHours(entries, sched.expected, sched.lunch);
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
      const { data, error } = await supabase
        .from(BANK_TABLE)
        .select("*")
        .eq(BANK_EMP_COL, req.params.employeeId)
        .order("date", { ascending: false });
      if (error) {
        console.error("[time-bank GET]", error.message, error.details, "table:", BANK_TABLE);
        throw new Error(error.message);
      }
      // Normalize to snake_case for frontend regardless of which table was used
      const entries = (data || []).map((r: any) => ({
        id: r.id,
        employee_id: r.employee_id ?? r.employeeId,
        minutes: r.minutes,
        date: r.date,
        description: r.description,
        type: r.type,
        created_at: r.created_at ?? r.createdAt,
      }));
      const total = entries.reduce((s: number, r: any) => s + (r.minutes || 0), 0);
      res.json({ success: true, entries, totalMinutes: total });
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
