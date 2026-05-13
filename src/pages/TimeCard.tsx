/* ═══════════════════════════════════════════════════════════════════════════
   ChronosAI — Espelho de Ponto  |  Enterprise SaaS Grade UI
   ═══════════════════════════════════════════════════════════════════════════ */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft, ChevronRight, Download, Plus, Clock, AlertCircle,
  CheckCircle2, Pencil, Trash2, X, Save, User, CalendarDays,
  TrendingUp, TrendingDown, Moon, Sun, Coffee, FileText,
  BarChart3, Activity, ArrowUpRight, ArrowDownRight, Circle,
  ChevronDown, AlertTriangle, CheckCheck, Square, CheckSquare,
  Search, LayoutGrid, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type TimeEntry = { time: string; type: "IN" | "OUT" };
type RecordStatus = "NORMAL" | "ABSENCE" | "VACATION" | "HOLIDAY" | "CERTIFICATE" | "OFF_DAY" | "COMPENSATION" | "DECLARATION" | "PREMIUM_LEAVE";

type AttRecord = {
  id: string; date: string; status: RecordStatus; justification?: string;
  total_work: number; overtime50: number; delay: number;
  time_entries: Array<{ id: string; time: string; type: string; original?: string }>;
};
type Employee = {
  id: string; name: string; registration: string;
  role_title?: string; admission_date?: string;
  departments?: { name: string };
  schedules?: { name: string; expected_work: number; lunch_minutes: number; start_time?: string; end_time?: string };
  pin_project?: boolean;
};

/* ── Constants ─────────────────────────────────────────────────────────────── */
const STATUS_META: Record<RecordStatus, { label: string; short: string; color: string; dot: string; bg: string }> = {
  NORMAL:       { label: "Regular",      short: "REG", color: "text-emerald-700", dot: "bg-emerald-500",  bg: "bg-emerald-50 border-emerald-200" },
  ABSENCE:      { label: "Falta",        short: "FAL", color: "text-red-700",     dot: "bg-red-500",      bg: "bg-red-50 border-red-200" },
  VACATION:     { label: "Férias",       short: "FER", color: "text-blue-700",    dot: "bg-blue-500",     bg: "bg-blue-50 border-blue-200" },
  HOLIDAY:      { label: "Feriado",      short: "FÉR", color: "text-purple-700",  dot: "bg-purple-500",   bg: "bg-purple-50 border-purple-200" },
  CERTIFICATE:  { label: "Atestado",     short: "ATE", color: "text-amber-700",   dot: "bg-amber-500",    bg: "bg-amber-50 border-amber-200" },
  OFF_DAY:      { label: "Folga",        short: "FLG", color: "text-slate-500",   dot: "bg-slate-300",    bg: "bg-slate-50 border-slate-200" },
  COMPENSATION: { label: "Compensação",  short: "COM", color: "text-cyan-700",    dot: "bg-cyan-500",     bg: "bg-cyan-50 border-cyan-200" },
  DECLARATION:  { label: "Declaração",   short: "DEC", color: "text-teal-700",    dot: "bg-teal-500",     bg: "bg-teal-50 border-teal-200" },
  PREMIUM_LEAVE:{ label: "Lic. Prêmio",  short: "LP",  color: "text-violet-700",  dot: "bg-violet-500",   bg: "bg-violet-50 border-violet-200" },
};

const LEAVE_STATUSES: RecordStatus[] = ["VACATION", "PREMIUM_LEAVE", "HOLIDAY", "OFF_DAY"];

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const WEEKDAYS_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const WEEKDAYS_SHORT = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function toHHMM(min: number) {
  const a = Math.abs(min);
  return (min < 0 ? "-" : "") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
}
function parseTime(raw: string): string {
  return raw.includes("T") ? raw.split("T")[1].substring(0, 5) : raw.substring(0, 5);
}
function buildDays(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) { days.push(d.toISOString().split("T")[0]); d.setDate(d.getDate() + 1); }
  return days;
}
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* Client-side recalculation matching server logic */
function calcHours(
  entries: Array<{ time: string; type: string }>,
  expected: number,
  lunch: number,
): { net: number; ot: number; deficit: number } {
  const sorted = [...entries].sort((a, b) => parseTime(a.time).localeCompare(parseTime(b.time)));
  let raw = 0, pairs = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const a = sorted[i], b = sorted[i + 1];
    if (a?.type === "IN" && b?.type === "OUT") {
      raw += timeToMin(parseTime(b.time)) - timeToMin(parseTime(a.time));
      pairs++;
    }
  }
  const net = pairs === 1 && lunch > 0 ? Math.max(0, raw - lunch) : raw;
  const diff = net - expected;
  return { net, ot: Math.max(0, diff), deficit: diff < 0 ? -diff : 0 };
}

const ini = (n: string) => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const AVATAR_COLORS = [
  "from-blue-500 to-blue-600","from-indigo-500 to-indigo-600","from-purple-500 to-purple-600",
  "from-emerald-500 to-emerald-600","from-amber-500 to-amber-600","from-pink-500 to-pink-600",
];
const avatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

/* ── Timeline bar visual ───────────────────────────────────────────────────── */
const DAY_START = 7 * 60;   // 07:00
const DAY_END   = 20 * 60;  // 20:00
const DAY_RANGE = DAY_END - DAY_START;

function pct(min: number) { return Math.max(0, Math.min(100, ((min - DAY_START) / DAY_RANGE) * 100)); }

function TimelineBar({ entries, expected }: { entries: Array<{ time: string; type: string }>; expected: number }) {
  const sorted = [...entries].sort((a, b) => a.time.localeCompare(b.time));
  const segments: Array<{ from: number; to: number; type: "work" | "lunch" | "extra" }> = [];

  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const inMin = timeToMin(parseTime(sorted[i].time));
    const outMin = timeToMin(parseTime(sorted[i + 1].time));
    const type = i === 2 ? "lunch" : "work";
    segments.push({ from: inMin, to: outMin, type });
  }

  if (sorted.length % 2 === 1) {
    const inMin = timeToMin(parseTime(sorted[sorted.length - 1].time));
    segments.push({ from: inMin, to: inMin + 30, type: "work" });
  }

  return (
    <div className="relative h-5 w-full rounded-full bg-slate-100 overflow-hidden">
      {/* Expected marker */}
      {expected > 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-300/70 z-10"
          style={{ left: pct(DAY_START + expected) + "%" }}
          title={`Previsto: ${toHHMM(expected)}`}
        />
      )}
      {segments.map((seg, i) => (
        <div
          key={i}
          className={cn(
            "absolute top-0 bottom-0 rounded-sm",
            seg.type === "work" ? "bg-primary/80" :
            seg.type === "lunch" ? "bg-amber-300/60" : "bg-emerald-400/80"
          )}
          style={{
            left: pct(seg.from) + "%",
            width: Math.max(0.5, pct(seg.to) - pct(seg.from)) + "%",
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PDF Export — Premium Enterprise Document
══════════════════════════════════════════════════════════════════════════════ */
type PdfOptions = {
  emp: Employee;
  year: number;
  month: number;
  allDays: string[];
  recordsByDate: Record<string, AttRecord>;
  recordCalcs: Record<string, { net: number; ot: number; deficit: number }>;
  totals: { work: number; extra: number; delay: number; absences: number; bank: number; night: number };
  totalAccumulatedBank: number;
  expectedMonthly: number;
  logoDataUrl?: string;
};

const ORG_NAME  = "Coordenadoria de Gestão Orçamentária e Financeira";
const ORG_UNIT  = "CGOF — Controle de Frequência";
const ORG_CNPJ  = "47.097.042/0001-84";

/* Night hours: minutes between 22:00 and 05:00 from a set of IN/OUT entries */
function calcNightMinutes(entries: Array<{ time: string; type: string }>): number {
  const sorted = [...entries]
    .map(e => ({ ...e, t: parseTime(e.time) }))
    .sort((a, b) => a.t.localeCompare(b.t));
  let night = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    if (sorted[i].type !== "IN" || sorted[i + 1].type !== "OUT") continue;
    const inM  = timeToMin(sorted[i].t);
    const outM = timeToMin(sorted[i + 1].t);
    // Night period: 22:00-24:00 (1320-1440)
    const n1 = Math.min(outM, 24 * 60) - Math.max(inM, 22 * 60);
    if (n1 > 0) night += n1;
    // Night period: 00:00-05:00 (0-300)
    const n2 = Math.min(outM, 5 * 60) - Math.max(inM, 0);
    if (n2 > 0) night += n2;
  }
  return Math.max(0, night);
}

async function loadLogoDataUrl(): Promise<string | undefined> {
  try {
    const res = await fetch("/img/logo.png");
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch { return undefined; }
}

async function buildEspelhoPdf(opts: PdfOptions): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  renderEmpToDoc(doc, opts);
  return doc;
}

async function buildAllEspelhosPdf(empDataList: PdfOptions[]): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  for (let i = 0; i < empDataList.length; i++) {
    if (i > 0) doc.addPage();
    renderEmpToDoc(doc, empDataList[i]);
  }
  return doc;
}

/** Render one employee's espelho onto an existing jsPDF document (portrait A4).
 *  Starts on the currently active page. */
function renderEmpToDoc(doc: jsPDF, opts: PdfOptions): void {
  const { emp, year, month, allDays, recordsByDate, recordCalcs, totals, totalAccumulatedBank, expectedMonthly, logoDataUrl } = opts;

  // Portrait A4: 210 × 297 mm — enterprise clean layout
  const W = 210, H = 297, ML = 8, MR = 202, CW = MR - ML; // CW = 194mm
  const HEADER_H = 16; // compact professional header

  const monthLabel = MONTHS[month - 1] + " / " + year;
  const nowDt      = new Date();
  const emitDate   = nowDt.toLocaleDateString("pt-BR");
  const emitTime   = nowDt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const reportCode = `EP-${year}${String(month).padStart(2,"0")}-${(emp.registration || emp.id.substring(0, 6)).toUpperCase()}`;

  type RGB = [number, number, number];
  const C: Record<string, RGB> = {
    black:     [15,  23,  42 ],
    white:     [255, 255, 255],
    grayBg:    [248, 250, 252],
    grayLine:  [226, 232, 240],
    grayText:  [100, 116, 139],
    grayLight: [148, 163, 184],
    navy:      [30,  58,  138],
    blue:      [37,  99,  235],
    skyBlue:   [219, 234, 254],
    red:       [185, 28,  28 ],
    green:     [21,  128, 61 ],
    amber:     [146, 64,  14 ],
    greenBg:   [240, 253, 244],
    redBg:     [254, 242, 242],
    amberBg:   [255, 251, 235],
    nightBlue: [67,  56,  202],
  };
  const sf = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const sd = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const st = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  const startPage = doc.getNumberOfPages();

  // ── White premium header ─────────────────────────────────────────────────
  function drawPageHeader(localPage: number, total: number) {
    doc.setPage(startPage + localPage - 1);

    // White bg + bottom separator
    sf(C.white); doc.rect(0, 0, W, HEADER_H, "F");
    sd(C.grayLine); doc.setLineWidth(0.3);
    doc.line(0, HEADER_H, W, HEADER_H);

    // Logo (left zone, ≈0–45mm)
    if (logoDataUrl) {
      try {
        const lW = 33, lH = 12;
        doc.addImage(logoDataUrl, "PNG", ML + 1, (HEADER_H - lH) / 2, lW, lH);
      } catch { /* skip */ }
    }

    // Vertical dividers
    sd(C.grayLine); doc.setLineWidth(0.2);
    doc.line(ML + 37, 3, ML + 37, HEADER_H - 3);
    doc.line(MR - 38, 3, MR - 38, HEADER_H - 3);

    // Center zone
    const cx = (ML + 37 + MR - 38) / 2;
    doc.setFont("helvetica", "normal"); doc.setFontSize(3.8); st(C.grayText);
    doc.text("ESPELHO DE PONTO — CONTROLE DE FREQUÊNCIA", cx, 5, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); st(C.black);
    doc.text(ORG_NAME, cx, 11.5, { align: "center" });

    // Right zone
    const rx = MR - 1;
    doc.setFont("helvetica", "normal"); doc.setFontSize(3.5); st(C.grayLight);
    doc.text("COMPETÊNCIA", rx, 4.5, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); st(C.navy);
    doc.text(monthLabel.toUpperCase(), rx, 10.5, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(3.2); st(C.grayLight);
    doc.text(`Pág. ${localPage}/${total}  ·  Emitido: ${emitDate}`, rx, 14.5, { align: "right" });
  }

  drawPageHeader(1, 1);
  let curY = HEADER_H + 2;

  // ── Employee info bar (flat, professional, no avatar) ─────────────────────
  const empCardH = 13;
  // Background + border
  sf(C.white); doc.rect(ML, curY, CW, empCardH, "F");
  sd(C.grayLine); doc.setLineWidth(0.2); doc.rect(ML, curY, CW, empCardH, "S");
  // Left navy accent (3mm bar)
  sf(C.navy); doc.rect(ML, curY, 3, empCardH, "F");

  // Name row
  const nameStr = (emp.name.length > 44 ? emp.name.substring(0, 42) + "…" : emp.name).toUpperCase();
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); st(C.black);
  doc.text(nameStr, ML + 5.5, curY + 5.5);

  // ATIVO badge — fixed right position
  sf([220, 252, 231] as RGB); doc.rect(MR - 18, curY + 1.5, 16, 5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(4.5); st([21, 128, 61] as RGB);
  doc.text("ATIVO", MR - 10, curY + 5.3, { align: "center" });

  // 4 info columns (bottom half of card)
  const fields = [
    { lbl: "MATRÍCULA",      val: emp.registration || "—" },
    { lbl: "CARGO / FUNÇÃO", val: (emp.role_title   || "—").substring(0, 28) },
    { lbl: "SETOR",          val: (emp.departments?.name || "—").substring(0, 24) },
    { lbl: "JORNADA",        val: emp.schedules?.expected_work
        ? `${Math.floor(emp.schedules.expected_work / 60)}h${String(emp.schedules.expected_work % 60).padStart(2, "0")}min`
        : "—" },
  ];
  const fColW = CW / 4;
  fields.forEach((f, i) => {
    const fx = ML + 4 + i * fColW;
    if (i > 0) { sd(C.grayLine); doc.setLineWidth(0.1); doc.line(ML + i * fColW, curY + 7.5, ML + i * fColW, curY + empCardH - 0.5); }
    doc.setFont("helvetica", "normal"); doc.setFontSize(3.2); st(C.grayLight);
    doc.text(f.lbl, fx, curY + 9.2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(4.5); st(C.black);
    doc.text(f.val, fx, curY + 12.2);
  });

  curY += empCardH + 1;

  // ── KPI strip (12 cards, white, minimal) ─────────────────────────────────
  let diasTrab = 0, diasFer = 0, diasFalta = 0, diasCert = 0, diasVac = 0, diasFolga = 0;
  for (const d of allDays) {
    const r = recordsByDate[d]; if (!r) continue;
    if (r.status === "NORMAL")                                 diasTrab++;
    if (r.status === "HOLIDAY")                                diasFer++;
    if (r.status === "ABSENCE")                                diasFalta++;
    if (r.status === "CERTIFICATE")                            diasCert++;
    if (r.status === "VACATION")                               diasVac++;
    if (r.status === "OFF_DAY" || r.status === "COMPENSATION") diasFolga++;
  }
  const utilDays = allDays.filter(d => { const w = new Date(d + "T12:00:00").getDay(); return w !== 0 && w !== 6; }).length;
  const prsPct   = utilDays > 0 ? Math.round(((diasTrab + diasFer + diasCert + diasVac) / utilDays) * 100) : 0;

  const kpiH = 9;
  type KpiCard = { lbl: string; val: string; valC: RGB };
  const kpiCards: KpiCard[] = [
    { lbl: "Dias Úteis",   val: String(utilDays),                                                                 valC: C.navy     },
    { lbl: "Trabalhados",  val: String(diasTrab),                                                                  valC: C.blue     },
    { lbl: "Feriados",     val: String(diasFer),                                                                   valC: diasFer   > 0 ? C.amber     : C.grayLight },
    { lbl: "Folgas",       val: String(diasFolga),                                                                 valC: diasFolga > 0 ? C.nightBlue : C.grayLight },
    { lbl: "Faltas",       val: String(diasFalta),                                                                 valC: diasFalta > 0 ? C.red       : C.grayLight },
    { lbl: "Atestados",    val: String(diasCert),                                                                  valC: diasCert  > 0 ? C.amber     : C.grayLight },
    { lbl: "Férias",       val: String(diasVac),                                                                   valC: diasVac   > 0 ? C.blue      : C.grayLight },
    { lbl: "H. Previstas", val: toHHMM(expectedMonthly),                                                          valC: C.grayText },
    { lbl: "Trabalhadas",  val: toHHMM(totals.work),                                                              valC: C.blue     },
    { lbl: "Débitos",      val: totals.delay > 0 ? "-" + toHHMM(totals.delay) : "—",                             valC: totals.delay > 0 ? C.red   : C.grayLight },
    { lbl: "Banco Atual",  val: (totalAccumulatedBank >= 0 ? "+" : "") + toHHMM(Math.abs(totalAccumulatedBank)),  valC: totalAccumulatedBank >= 0 ? C.green : C.red },
    { lbl: "Presença",     val: prsPct + "%",                                                                      valC: prsPct >= 90 ? C.green : prsPct >= 75 ? C.amber : C.red },
  ];

  const kW = CW / kpiCards.length;
  kpiCards.forEach((k, i) => {
    const kx = ML + i * kW;
    sf(C.white); doc.roundedRect(kx + 0.3, curY, kW - 0.6, kpiH, 1, 1, "F");
    sd(C.grayLine); doc.setLineWidth(0.15);
    doc.roundedRect(kx + 0.3, curY, kW - 0.6, kpiH, 1, 1, "S");
    doc.setFont("helvetica", "bold"); doc.setFontSize(5); st(k.valC);
    doc.text(k.val, kx + kW / 2, curY + 5.5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(2.7); st(C.grayLight);
    doc.text(k.lbl, kx + kW / 2, curY + kpiH - 0.8, { align: "center" });
  });
  curY += kpiH + 1;

  // ── Attendance table ──────────────────────────────────────────────────────
  const STATUS_PDF: Record<string, { label: string; color: RGB; bg: RGB }> = {
    NORMAL:       { label: "REGULAR",  color: C.green,    bg: C.greenBg                  },
    ABSENCE:      { label: "FALTA",    color: C.red,      bg: C.redBg                    },
    VACATION:     { label: "FÉRIAS",   color: C.blue,     bg: [235, 245, 255] as RGB     },
    HOLIDAY:      { label: "FERIADO",  color: C.amber,    bg: C.amberBg                  },
    CERTIFICATE:  { label: "ATESTADO", color: C.amber,    bg: C.amberBg                  },
    OFF_DAY:      { label: "FOLGA",    color: C.grayText, bg: C.grayBg                   },
    COMPENSATION: { label: "COMPENS.", color: C.navy,     bg: [232, 240, 255] as RGB     },
  };

  // Calculate dynamic row height — guaranteed single page
  // BOTTOM_RESERVE: sig (5.5+32) + footer (6) + gaps = 45mm
  const BOTTOM_RESERVE = 45;
  const tableBoundary  = H - BOTTOM_RESERVE;          // 252mm — table must stop here
  const tableAvailH    = tableBoundary - curY;         // available for header+body
  const headerRowH     = 5;
  const rowH           = Math.max(3.5, Math.min(6.5, (tableAvailH - headerRowH) / Math.max(allDays.length, 1)));
  const cellPadV       = Math.max(0.3, (rowH - 4.5 * 0.352) / 2 - 0.1);

  const tableRows: any[][] = allDays.map(dateStr => {
    const dow    = new Date(dateStr + "T12:00:00").getDay();
    const isWknd = dow === 0 || dow === 6;
    const dayLbl = WEEKDAYS_SHORT[dow];
    const dateFmt= dateStr.split("-").reverse().join("/");
    const rec    = recordsByDate[dateStr];
    const calc   = recordCalcs[dateStr] || { net: 0, ot: 0, deficit: 0 };
    const dim    = (v: string) => ({ content: v, styles: { textColor: C.grayLight } });

    if (!rec) {
      const wkLbl   = dow === 0 ? "Dom" : dow === 6 ? "Sáb" : "";
      const prevStr = isWknd ? "—" : emp.schedules?.expected_work
        ? `${Math.floor(emp.schedules.expected_work / 60)}:${String(emp.schedules.expected_work % 60).padStart(2, "0")}h`
        : "—";
      return [
        { content: dateFmt, styles: { textColor: C.grayLight } },
        { content: dayLbl,  styles: { textColor: C.grayLight, fontStyle: "bold" } },
        dim(prevStr), dim("—"), dim("—"), dim("—"), dim("—"), dim("—"), dim("—"),
        { content: wkLbl, styles: { textColor: C.grayLight, fontStyle: "italic" } },
        dim(""),
      ];
    }

    const sorted = (rec.time_entries || [])
      .map((e: any) => ({ time: parseTime(e.time), type: e.type as string, min: timeToMin(parseTime(e.time)) }))
      .sort((a: any, b: any) => a.min - b.min);
    const marcacoes = sorted.map((e: any, idx: number) =>
      `${idx + 1}${e.type === "IN" ? "E" : "S"} ${e.time}`
    ).join("  ");

    const startT = (emp.schedules as any)?.start_time;
    const endT   = (emp.schedules as any)?.end_time;
    let horPrev  = "—";
    if (startT && endT) horPrev = startT.substring(0, 5) + "-" + endT.substring(0, 5);
    else if (emp.schedules?.expected_work)
      horPrev = `${Math.floor(emp.schedules.expected_work / 60)}:${String(emp.schedules.expected_work % 60).padStart(2, "0")}h`;

    const nightMin = calcNightMinutes(sorted);
    const { net, ot, deficit } = calc;
    const dayBank  = net - (emp.schedules?.expected_work ?? 480);
    const sm = STATUS_PDF[rec.status] || { label: rec.status, color: C.grayText, bg: C.grayBg };

    return [
      { content: dateFmt,  styles: { textColor: isWknd ? C.grayLight : C.black, fontStyle: isWknd ? "normal" : "bold" } },
      { content: dayLbl,   styles: { textColor: isWknd ? C.grayLight : C.grayText, fontStyle: "bold" } },
      { content: horPrev,  styles: { textColor: C.grayText } },
      { content: marcacoes || "—", styles: { textColor: C.black, fontSize: 4 } },
      { content: net > 0 ? toHHMM(net) : "—", styles: { textColor: deficit > 0 ? C.red : net > 0 ? C.black : C.grayLight, fontStyle: net > 0 ? "bold" : "normal" } },
      ot      > 0 ? { content: "+" + toHHMM(ot),      styles: { textColor: C.green,     fontStyle: "bold" } } : dim("—"),
      nightMin > 0 ? { content: toHHMM(nightMin),      styles: { textColor: C.nightBlue, fontStyle: "bold" } } : dim("—"),
      deficit  > 0 ? { content: "-" + toHHMM(deficit), styles: { textColor: C.red,       fontStyle: "bold" } } : dim("—"),
      { content: dayBank === 0 ? "—" : (dayBank > 0 ? "+" : "") + toHHMM(Math.abs(dayBank)), styles: { textColor: dayBank > 0 ? C.green : dayBank < 0 ? C.red : C.grayLight } },
      { content: sm.label, styles: { textColor: sm.color, fontStyle: "bold", fontSize: 4.5 } },
      { content: rec.justification || "", styles: { textColor: C.grayText, fontStyle: "italic" } },
    ];
  });

  autoTable(doc, {
    startY: curY,
    head: [["DATA", "DIA", "JORNADA", "MARCAÇÕES", "TRAB.", "H.E.", "A.NOT.", "DÉB.", "BCO/DIA", "STATUS", "JUSTIFICATIVA"]],
    body: tableRows,
    theme: "plain",
    styles: {
      fontSize: 4.5,
      cellPadding: { top: cellPadV, bottom: cellPadV, left: 1.2, right: 1.2 },
      font: "helvetica",
      lineColor: C.grayLine,
      lineWidth: 0.08,
      overflow: "ellipsize",
      valign: "middle",
      textColor: C.black,
      minCellHeight: rowH,
    },
    headStyles: {
      fillColor: C.navy,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 4.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.2, right: 1.2 },
      halign: "center",
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: [249, 250, 252] as RGB },
    columnStyles: {
      0:  { cellWidth: 14,  halign: "center" }, // DATA
      1:  { cellWidth:  7,  halign: "center" }, // DIA
      2:  { cellWidth: 17,  halign: "center" }, // JORNADA
      3:  { cellWidth: 47,  halign: "left"   }, // MARCAÇÕES
      4:  { cellWidth: 13,  halign: "center" }, // TRAB
      5:  { cellWidth: 11,  halign: "center" }, // H.E.
      6:  { cellWidth: 11,  halign: "center" }, // A.NOT.
      7:  { cellWidth: 11,  halign: "center" }, // DÉB.
      8:  { cellWidth: 13,  halign: "center" }, // BCO/DIA
      9:  { cellWidth: 17,  halign: "center" }, // STATUS
      10: { cellWidth: 33,  halign: "left"   }, // JUSTIFICATIVA → total 194
    },
    margin: { left: ML, right: W - MR, top: HEADER_H + 2, bottom: BOTTOM_RESERVE },
    tableLineColor: C.grayLine,
    tableLineWidth: 0.08,
    willDrawCell: (data: any) => {
      if (data.section !== "body") return;
      const dateStr = allDays[data.row.index]; if (!dateStr) return;
      const dow = new Date(dateStr + "T12:00:00").getDay();
      const rec = recordsByDate[dateStr];
      let fill: RGB | null = null;
      if      (dow === 0 || dow === 6)        fill = [243, 244, 246];
      else if (rec?.status === "HOLIDAY")     fill = [255, 251, 230];
      else if (rec?.status === "ABSENCE")     fill = [255, 241, 242];
      else if (rec?.status === "VACATION")    fill = [235, 245, 255];
      else if (rec?.status === "OFF_DAY")     fill = [248, 250, 252];
      else if (rec?.status === "CERTIFICATE") fill = [255, 251, 230];
      if (fill) { doc.setFillColor(fill[0], fill[1], fill[2]); doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F"); }
    },
    didDrawPage: () => {
      const localPage = doc.getNumberOfPages() - startPage + 1;
      drawPageHeader(localPage, 999);
    },
  });

  // ── Signature section ─────────────────────────────────────────────────────
  const sigAreaY = H - BOTTOM_RESERVE + 1;
  sd(C.grayLine); doc.setLineWidth(0.2);
  doc.line(ML, sigAreaY, MR, sigAreaY);
  sf(C.navy); doc.rect(ML, sigAreaY, 10, 0.35, "F");

  doc.setFont("helvetica", "italic"); doc.setFontSize(3.8); st(C.grayText);
  doc.text(
    `Declaro que as informações de frequência referentes à competência ${MONTHS[month - 1]}/${year} conferem com os registros do sistema.`,
    ML, sigAreaY + 3
  );
  doc.setFont("helvetica", "normal"); doc.setFontSize(3.8); st(C.black);
  doc.text(`São Paulo, _____ de ${MONTHS[month - 1]} de ${year}.`, MR, sigAreaY + 3, { align: "right" });

  const sigH    = 32;
  const sbW     = (CW - 6) / 2;   // 2 boxes with 6mm gap
  const sigBoxY = sigAreaY + 5.5;
  const sigBoxes = [
    { title: "FUNCIONÁRIO",     name: emp.name, sub: emp.role_title || "Colaborador" },
    { title: "CHEFIA IMEDIATA", name: "",        sub: "Responsável Direto"            },
  ];

  sigBoxes.forEach((box, i) => {
    const bx = ML + i * (sbW + 6);
    sf(C.white); doc.rect(bx, sigBoxY, sbW, sigH, "F");
    sd(C.grayLine); doc.setLineWidth(0.2); doc.rect(bx, sigBoxY, sbW, sigH, "S");
    sf(C.navy); doc.rect(bx, sigBoxY, sbW, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(4.5); st(C.white);
    doc.text(box.title, bx + sbW / 2, sigBoxY + 4.2, { align: "center" });
    sd([190, 198, 212] as RGB); doc.setLineWidth(0.35);
    doc.line(bx + 4, sigBoxY + sigH - 12, bx + sbW - 4, sigBoxY + sigH - 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(3.2); st(C.grayLight);
    doc.text("Assinatura / Carimbo", bx + sbW / 2, sigBoxY + sigH - 10, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(4.5); st(C.black);
    const n = box.name ? (box.name.length > 34 ? box.name.substring(0, 32) + "…" : box.name) : "";
    doc.text(n, bx + sbW / 2, sigBoxY + sigH - 5, { align: "center" });
    if (box.sub) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(3.5); st(C.grayText);
      doc.text(box.sub.substring(0, 42), bx + sbW / 2, sigBoxY + sigH - 1.5, { align: "center" });
    }
  });

  // ── Footer strip ─────────────────────────────────────────────────────────
  sf(C.grayBg); doc.rect(0, H - 6, W, 6, "F");
  sd(C.grayLine); doc.setLineWidth(0.2); doc.line(0, H - 6, W, H - 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(3.5); st(C.grayText);
  doc.text("Secretaria da Saúde do Estado de São Paulo", ML, H - 3.2);
  doc.text(ORG_NAME, ML, H - 0.8);
  doc.setFont("helvetica", "normal"); doc.setFontSize(3.2); st(C.grayLight);
  doc.text(`Emitido em ${emitDate} às ${emitTime}  ·  ${reportCode}`, MR, H - 3.2, { align: "right" });
  doc.text("Documento gerado eletronicamente — Não requer assinatura digital", MR, H - 0.8, { align: "right" });

  // Fix page count in headers
  const endPage  = doc.getNumberOfPages();
  const empTotal = endPage - startPage + 1;
  for (let lp = 1; lp <= empTotal; lp++) drawPageHeader(lp, empTotal);
}


/* ══════════════════════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════════════════════ */
export default function TimeCard() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employees,    setEmployees]    = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [records,  setRecords]  = useState<AttRecord[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [viewMode, setViewMode] = useState<"timeline" | "table">("table");
  const [filterStatus, setFilterStatus] = useState<"all" | RecordStatus>("all");
  const [filterHideWeekends, setFilterHideWeekends] = useState(false);

  // Bulk day selection
  const [bulkMode,   setBulkMode]   = useState(false);
  const [bulkDays,   setBulkDays]   = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<RecordStatus>("VACATION");
  const [bulkJust,   setBulkJust]   = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Edit dialog
  const [editDay,     setEditDay]     = useState<string | null>(null);
  const [editRecord,  setEditRecord]  = useState<AttRecord | null>(null);
  const [editStatus,  setEditStatus]  = useState<RecordStatus>("NORMAL");
  const [editJust,    setEditJust]    = useState("");
  const [editEntries, setEditEntries] = useState<TimeEntry[]>([]);
  const [saving,      setSaving]      = useState(false);
  const [noLunch,     setNoLunch]     = useState(false);

  // Accumulated bank from time_bank_entries (seed + manual entries)
  const [bankSeedTotal, setBankSeedTotal] = useState(0);
  // Latest date in time_bank_entries (determines which months are already counted in seed)
  const [bankCutoff, setBankCutoff] = useState<{ year: number; month: number } | null>(null);
  // Accumulated bank delta for months BETWEEN the seed cutoff and current viewed month
  const [historicalBankDelta, setHistoricalBankDelta] = useState(0);
  const [historicalPinDed,    setHistoricalPinDed]    = useState(0);

  // UI dropdowns
  const [empSearch,      setEmpSearch]      = useState("");
  const [empDropOpen,    setEmpDropOpen]    = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [pageView,    setPageView]    = useState<"list" | "detail">("list");
  const [listSearch,  setListSearch]  = useState("");
  const [listSetor,   setListSetor]   = useState("all");
  const [listJornada, setListJornada] = useState("all");
  const [listProjeto, setListProjeto] = useState("all");
  const empSelectorRef = useRef<HTMLDivElement>(null);
  const exportMenuRef  = useRef<HTMLDivElement>(null);

  /* ── Data ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/employees")
      .then(r => r.json())
      .then(d => {
        setEmployees(d.employees || []);
        if (d.employees?.length && !selectedEmpId) setSelectedEmpId(d.employees[0].id);
      })
      .catch(() => toast.error("Erro ao carregar funcionários"));
  }, []);

  useEffect(() => {
    if (!selectedEmpId) return;
    setLoading(true);
    fetch(`/api/attendance/${selectedEmpId}?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setLoading(false); })
      .catch(() => { toast.error("Erro ao carregar registros"); setLoading(false); });
  }, [selectedEmpId, year, month]);

  // Fetch accumulated bank (seed balance) whenever employee changes
  useEffect(() => {
    if (!selectedEmpId) return;
    fetch(`/api/time-bank/${selectedEmpId}`)
      .then(r => r.json())
      .then(d => {
        setBankSeedTotal(d.totalMinutes ?? 0);
        // Find the latest entry date to use as cutoff
        const entries: Array<{ date: string }> = d.entries || [];
        if (entries.length) {
          const latest = entries.map(e => e.date.substring(0, 10)).sort().at(-1)!;
          const [y, m] = latest.split("-").map(Number);
          // Cutoff = the month of the latest entry (entries cover UP TO end of that month - 1)
          // Convention: seed dated 2026-05-08 means it covers through April → cutoff is May
          setBankCutoff({ year: y, month: m });
        } else {
          setBankCutoff(null);
        }
      })
      .catch(() => { setBankSeedTotal(0); setBankCutoff(null); });
  }, [selectedEmpId]);

  // Accumulate bank for every month between cutoff and current viewed month (exclusive)
  // This is what the old code missed — it only added the current month's delta.
  useEffect(() => {
    const cutoffYM = bankCutoff ? bankCutoff.year * 12 + bankCutoff.month : null;
    const viewedYM = year * 12 + month;

    // Nothing to accumulate if no cutoff or we're at/before the first tracked month
    if (!selectedEmpId || cutoffYM === null || viewedYM <= cutoffYM) {
      setHistoricalBankDelta(0);
      setHistoricalPinDed(0);
      return;
    }

    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) return;

    const expected = emp.schedules?.expected_work ?? 480;
    const lunch    = emp.schedules?.lunch_minutes ?? 60;

    let cancelled = false;

    // Fetch ALL attendance records for this employee (no date filter)
    fetch(`/api/attendance/${selectedEmpId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const allRecs: AttRecord[] = d.records || [];

        let totalBankDelta = 0;
        const monthExtras: Record<string, number> = {};

        for (const rec of allRecs) {
          const dateStr = rec.date.substring(0, 10);
          const [ry, rm] = dateStr.split("-").map(Number);
          const recYM = ry * 12 + rm;

          // Only include months >= cutoff and BEFORE the currently viewed month
          // (current month's contribution comes from live `totals.bank`)
          if (recYM < cutoffYM || recYM >= viewedYM) continue;

          const calc = rec.time_entries?.length
            ? calcHours(rec.time_entries, expected, lunch)
            : { net: rec.total_work || 0, ot: rec.overtime50 || 0, deficit: rec.delay || 0 };

          totalBankDelta += calc.ot - calc.deficit;
          const mk = `${ry}-${rm}`;
          monthExtras[mk] = (monthExtras[mk] || 0) + calc.ot;
        }

        // PIN deduction per historical month (each month: deduct up to 40h from that month's extras)
        let pinDed = 0;
        if (emp.pin_project) {
          for (const extras of Object.values(monthExtras)) {
            pinDed += Math.min(extras, 2400);
          }
        }

        setHistoricalBankDelta(totalBankDelta);
        setHistoricalPinDed(pinDed);
      })
      .catch(() => { if (!cancelled) { setHistoricalBankDelta(0); setHistoricalPinDed(0); } });

    return () => { cancelled = true; };
  }, [selectedEmpId, year, month, bankCutoff, employees]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (empSelectorRef.current && !empSelectorRef.current.contains(e.target as Node)) setEmpDropOpen(false);
      if (exportMenuRef.current  && !exportMenuRef.current.contains(e.target as Node))  setExportMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allDays = useMemo(() => buildDays(year, month), [year, month]);

  const recordsByDate = useMemo(() => {
    const m: Record<string, AttRecord> = {};
    for (const r of records) m[r.date.substring(0, 10)] = r;
    return m;
  }, [records]);

  const displayDays = useMemo(() => allDays.filter(dateStr => {
    const dow = new Date(dateStr + "T00:00:00").getDay();
    const isWeekend = dow === 0 || dow === 6;
    const rec = recordsByDate[dateStr];
    if (filterHideWeekends && isWeekend && !rec) return false;
    if (filterStatus !== "all") {
      const effStatus = rec?.status || (isWeekend ? "OFF_DAY" : null);
      if (effStatus !== filterStatus) return false;
    }
    return true;
  }), [allDays, filterStatus, filterHideWeekends, recordsByDate]);

  /* ── Totals & bank ─────────────────────────────────────────────────────── */
  const selectedEmp = employees.find(e => e.id === selectedEmpId);
  const expectedMonthly = (selectedEmp?.schedules?.expected_work ?? 480) * allDays.filter(d => {
    const w = new Date(d + "T00:00:00").getDay(); return w !== 0 && w !== 6;
  }).length;

  /* Per-day recalculated values (corrects old stored data & applies schedule) */
  const recordCalcs = useMemo(() => {
    const expected = selectedEmp?.schedules?.expected_work ?? 480;
    const lunch = selectedEmp?.schedules?.lunch_minutes ?? 60;
    const map: Record<string, { net: number; ot: number; deficit: number }> = {};
    for (const r of records) {
      const key = r.date.substring(0, 10);
      if (r.time_entries?.length) {
        // On leave/vacation days with entries, all hours are overtime (expected = 0)
        const isLeave = LEAVE_STATUSES.includes(r.status || "");
        map[key] = calcHours(r.time_entries, isLeave ? 0 : expected, lunch);
      } else {
        map[key] = { net: r.total_work || 0, ot: r.overtime50 || 0, deficit: r.delay || 0 };
      }
    }
    return map;
  }, [records, selectedEmp]);

  const totals = useMemo(() => {
    let work = 0, extra = 0, deficit = 0, absences = 0, night = 0;
    for (const r of records) {
      const c = recordCalcs[r.date.substring(0, 10)] || { net: 0, ot: 0, deficit: 0 };
      work    += c.net;
      extra   += c.ot;
      deficit += c.deficit;
      if (r.status === "ABSENCE") absences++;
      if (r.time_entries?.length) night += calcNightMinutes(r.time_entries);
    }
    return { work, extra, delay: deficit, absences, bank: extra - deficit, night };
  }, [records, recordCalcs]);

  const filteredForList = useMemo(() => employees.filter(e => {
    if (listSearch && !e.name.toLowerCase().includes(listSearch.toLowerCase())) return false;
    if (listSetor !== "all" && e.departments?.name !== listSetor) return false;
    if (listProjeto === "yes" && !e.pin_project) return false;
    if (listProjeto === "no" && e.pin_project) return false;
    const w = e.schedules?.expected_work ?? 0;
    if (listJornada === "8h" && w < 420) return false;
    if (listJornada === "6h" && (w < 300 || w >= 420)) return false;
    return true;
  }), [employees, listSearch, listSetor, listJornada, listProjeto]);

  const allSetores = useMemo(
    () => [...new Set(employees.map(e => e.departments?.name).filter(Boolean) as string[])].sort(),
    [employees]
  );

  // Banco acumulado correto:
  // seed (balanço até fim do mês anterior ao cutoff)
  // + soma de banco de cada mês desde o cutoff até o mês anterior ao visualizado  (historicalBankDelta)
  // + banco do mês atual (totals.bank)
  // − dedução PIN de cada mês histórico (historicalPinDed)
  // − dedução PIN do mês atual
  const viewedAfterCutoff = bankCutoff
    ? (year > bankCutoff.year || (year === bankCutoff.year && month >= bankCutoff.month))
    : true;
  const currentPinDeduction = (selectedEmp?.pin_project && viewedAfterCutoff) ? Math.min(totals.extra, 2400) : 0;
  const totalAccumulatedBank = viewedAfterCutoff
    ? bankSeedTotal + historicalBankDelta + totals.bank - historicalPinDed - currentPinDeduction
    : bankSeedTotal;

  /* ── PDF export ────────────────────────────────────────────────────────── */
  const [exportingPdf, setExportingPdf] = useState(false);

  /**
   * Compute the correct accumulated bank for an employee in a given year/month.
   * Fetches seed + ALL records, accumulates per-month bank, applies PIN deductions.
   */
  const computeAccumulatedBank = async (
    emp: any,
    targetYear: number,
    targetMonth: number,
    currentMonthRecs: AttRecord[],
  ): Promise<number> => {
    const expected = emp.schedules?.expected_work ?? 480;
    const lunch    = emp.schedules?.lunch_minutes  ?? 60;

    // Fetch seed
    let seed = 0;
    let cutoffYM: number | null = null;
    try {
      const bd = await fetch(`/api/time-bank/${emp.id}`).then(r => r.json());
      seed = bd.totalMinutes ?? 0;
      const entries: Array<{ date: string }> = bd.entries || [];
      if (entries.length) {
        const latest = entries.map(e => e.date.substring(0, 10)).sort().at(-1)!;
        const [ly, lm] = latest.split("-").map(Number);
        cutoffYM = ly * 12 + lm;
      }
    } catch { /* no seed */ }

    const viewedYM = targetYear * 12 + targetMonth;
    if (cutoffYM !== null && viewedYM < cutoffYM) return seed;

    // Fetch ALL historical records
    let allRecs: AttRecord[] = [];
    try {
      const d = await fetch(`/api/attendance/${emp.id}`).then(r => r.json());
      allRecs = d.records || [];
    } catch { /* empty */ }

    // Merge: use live currentMonthRecs for the viewed month, historical for the rest
    const currentMonthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
    const historical = allRecs.filter(r => !r.date.startsWith(currentMonthPrefix));
    const allMerged  = [...historical, ...currentMonthRecs];

    // Accumulate bank per month from cutoffYM to viewedYM (inclusive)
    let accumulated = seed;
    const monthExtras: Record<string, number> = {};

    for (const rec of allMerged) {
      const dateStr = rec.date.substring(0, 10);
      const [ry, rm] = dateStr.split("-").map(Number);
      const recYM = ry * 12 + rm;
      if (cutoffYM !== null && recYM < cutoffYM) continue;
      if (recYM > viewedYM) continue;

      const calc = rec.time_entries?.length
        ? calcHours(rec.time_entries, expected, lunch)
        : { net: rec.total_work || 0, ot: rec.overtime50 || 0, deficit: rec.delay || 0 };

      accumulated += calc.ot - calc.deficit;
      const mk = `${ry}-${rm}`;
      monthExtras[mk] = (monthExtras[mk] || 0) + calc.ot;
    }

    // PIN deduction per month (cap each month's extras at 40h)
    if (emp.pin_project) {
      for (const extras of Object.values(monthExtras)) {
        accumulated -= Math.min(extras, 2400);
      }
    }

    return accumulated;
  };

  const exportPdfSingle = async (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    // Fetch records for this employee if different from current selection
    let recs = records;
    let rCalcs = recordCalcs;
    if (empId !== selectedEmpId) {
      const res = await fetch(`/api/attendance/${empId}?year=${year}&month=${month}`);
      const d = await res.json();
      recs = d.records || [];
      const expected = emp.schedules?.expected_work ?? 480;
      const lunch = emp.schedules?.lunch_minutes ?? 60;
      const map: Record<string, { net: number; ot: number; deficit: number }> = {};
      for (const r of recs) {
        const key = r.date.substring(0, 10);
        if (r.time_entries?.length) {
          map[key] = calcHours(r.time_entries, expected, lunch);
        }
      }
      rCalcs = map;
    }

    const rByDate: Record<string, AttRecord> = {};
    for (const r of recs) rByDate[r.date.substring(0, 10)] = r;

    let work = 0, extra = 0, delay = 0, absences = 0, night = 0;
    for (const r of recs) {
      const c = rCalcs[r.date.substring(0, 10)] || { net: 0, ot: 0, deficit: 0 };
      work += c.net; extra += c.ot; delay += c.deficit;
      if (r.status === "ABSENCE") absences++;
      if (r.time_entries?.length) night += calcNightMinutes(r.time_entries);
    }
    const bankNet = extra - delay;

    const accBank = await computeAccumulatedBank(emp, year, month, recs);

    const expMonthly = (emp.schedules?.expected_work ?? 480) * allDays.filter(d => {
      const w = new Date(d + "T00:00:00").getDay(); return w !== 0 && w !== 6;
    }).length;

    const logoDataUrl = await loadLogoDataUrl();

    return buildEspelhoPdf({
      emp, year, month, allDays, recordsByDate: rByDate, recordCalcs: rCalcs,
      totals: { work, extra, delay, absences, bank: bankNet, night },
      totalAccumulatedBank: accBank,
      expectedMonthly: expMonthly,
      logoDataUrl,
    });
  };

  const handleExportCurrentPdf = async () => {
    if (!selectedEmpId) return;
    setExportingPdf(true);
    try {
      const nightTotal = records.reduce((s, r) => s + (r.time_entries?.length ? calcNightMinutes(r.time_entries) : 0), 0);
      const logoDataUrl = await loadLogoDataUrl();
      const doc = await buildEspelhoPdf({
        emp: selectedEmp!,
        year, month, allDays, recordsByDate, recordCalcs,
        totals: { ...totals, night: nightTotal },
        totalAccumulatedBank, expectedMonthly,
        logoDataUrl,
      });
      doc.save(`Espelho_${selectedEmp!.name.replace(/\s+/g, "_")}_${MONTHS[month-1]}_${year}.pdf`);
    } catch (e) {
      toast.error("Erro ao gerar PDF");
      console.error(e);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportAllPdf = async () => {
    if (!employees.length) return;
    setExportingPdf(true);
    try {
      const logoDataUrl = await loadLogoDataUrl();
      const empDataList: PdfOptions[] = [];

      for (const emp of employees) {
        try {
          const res = await fetch(`/api/attendance/${emp.id}?year=${year}&month=${month}`);
          const d = await res.json();
          const recs: AttRecord[] = d.records || [];
          const expected = emp.schedules?.expected_work ?? 480;
          const lunch = emp.schedules?.lunch_minutes ?? 60;
          const rCalcs: Record<string, { net: number; ot: number; deficit: number }> = {};
          for (const r of recs) {
            const key = r.date.substring(0, 10);
            if (r.time_entries?.length) rCalcs[key] = calcHours(r.time_entries, expected, lunch);
          }
          const rByDate: Record<string, AttRecord> = {};
          for (const r of recs) rByDate[r.date.substring(0, 10)] = r;

          let work = 0, extra = 0, delay = 0, absences = 0, night = 0;
          for (const r of recs) {
            const c = rCalcs[r.date.substring(0, 10)] || { net: 0, ot: 0, deficit: 0 };
            work += c.net; extra += c.ot; delay += c.deficit;
            if (r.status === "ABSENCE") absences++;
            if (r.time_entries?.length) night += calcNightMinutes(r.time_entries);
          }
          const bankNet = extra - delay;

          const accBank = await computeAccumulatedBank(emp, year, month, recs);
          const expMonthly = (emp.schedules?.expected_work ?? 480) * allDays.filter(d => {
            const w = new Date(d + "T00:00:00").getDay(); return w !== 0 && w !== 6;
          }).length;

          empDataList.push({
            emp, year, month, allDays, recordsByDate: rByDate, recordCalcs: rCalcs,
            totals: { work, extra, delay, absences, bank: bankNet, night },
            totalAccumulatedBank: accBank,
            expectedMonthly: expMonthly,
            logoDataUrl,
          });
        } catch { /* skip employee on error */ }
      }

      if (empDataList.length === 0) { toast.error("Nenhum dado disponível"); return; }
      const doc = await buildAllEspelhosPdf(empDataList);
      doc.save(`Espelho_TODOS_${MONTHS[month - 1]}_${year}.pdf`);
      toast.success(`PDF único com ${empDataList.length} funcionários exportado com sucesso`);
    } catch (e) {
      toast.error("Erro ao gerar PDFs");
      console.error(e);
    } finally {
      setExportingPdf(false);
    }
  };


  const openEdit = (dateStr: string) => {
    const rec = recordsByDate[dateStr] || null;
    setEditDay(dateStr);
    setEditRecord(rec);
    setEditStatus((rec?.status as RecordStatus) || "NORMAL");
    setEditJust(rec?.justification || "");
    setNoLunch(false);
    const entries: TimeEntry[] = (rec?.time_entries || [])
      .sort((a: any, b: any) => a.time.localeCompare(b.time))
      .map((e: any) => ({ time: parseTime(e.time), type: e.type as "IN" | "OUT" }));
    setEditEntries(entries);
  };

  const addEntry = () =>
    setEditEntries(prev => [...prev, { time: "08:00", type: prev.length % 2 === 0 ? "IN" : "OUT" }]);

  const removeEntry = (i: number) =>
    setEditEntries(prev => prev.filter((_, idx) => idx !== i));

  const updateEntry = (i: number, field: keyof TimeEntry, val: string) =>
    setEditEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  const saveRecord = async () => {
    if (!editDay || !selectedEmpId) return;
    setSaving(true);
    try {
      const url = editRecord
        ? `/api/attendance/record/${editRecord.id}`
        : `/api/attendance/${selectedEmpId}/record`;
      const r = await fetch(url, {
        method: editRecord ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editRecord
          ? { status: editStatus, justification: editJust, entries: editEntries, no_lunch: noLunch }
          : { date: editDay, status: editStatus, justification: editJust, entries: editEntries, no_lunch: noLunch }
        ),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const updated: AttRecord = d.record;
      setRecords(prev => {
        const key = updated.date.substring(0, 10);
        const idx = prev.findIndex(x => x.date.substring(0, 10) === key);
        return idx >= 0 ? prev.map(x => x.date.substring(0, 10) === key ? updated : x) : [...prev, updated];
      });
      toast.success("Registro salvo!");
      setEditDay(null);
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const deleteRecord = async (recordId: string, label: string) => {
    if (!confirm(`Excluir registro do dia ${label}?`)) return;
    try {
      const r = await fetch(`/api/attendance/record/${recordId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro ao excluir");
      setRecords(prev => prev.filter(x => x.id !== recordId));
      toast.success("Registro excluído");
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleBulkDay = (dateStr: string) => {
    setBulkDays(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
      return next;
    });
  };

  const applyBulk = async () => {
    if (!selectedEmpId || bulkDays.size === 0) return;
    setBulkSaving(true);
    let ok = 0, fail = 0;
    for (const dateStr of bulkDays) {
      try {
        const existRec = recordsByDate[dateStr];
        const url = existRec
          ? `/api/attendance/record/${existRec.id}`
          : `/api/attendance/${selectedEmpId}/record`;
        const r = await fetch(url, {
          method: existRec ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(existRec
            ? { status: bulkStatus, justification: bulkJust, entries: [] }
            : { date: dateStr, status: bulkStatus, justification: bulkJust, entries: [] }
          ),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        const updated: AttRecord = d.record;
        setRecords(prev => {
          const key = updated.date.substring(0, 10);
          const idx = prev.findIndex(x => x.date.substring(0, 10) === key);
          return idx >= 0 ? prev.map(x => x.date.substring(0, 10) === key ? updated : x) : [...prev, updated];
        });
        ok++;
      } catch { fail++; }
    }
    if (ok > 0) toast.success(`${ok} dia(s) atualizados com sucesso`);
    if (fail > 0) toast.error(`${fail} dia(s) com erro`);
    setBulkDays(new Set());
    setBulkMode(false);
    setBulkJust("");
    setBulkSaving(false);
  };

  const deleteBulk = async () => {
    if (!selectedEmpId || bulkDays.size === 0) return;
    setBulkSaving(true);
    let ok = 0, fail = 0;
    for (const dateStr of bulkDays) {
      const existRec = recordsByDate[dateStr];
      if (!existRec) { ok++; continue; } // already no record
      try {
        const r = await fetch(`/api/attendance/record/${existRec.id}`, { method: "DELETE" });
        if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
        setRecords(prev => prev.filter(x => x.id !== existRec.id));
        ok++;
      } catch { fail++; }
    }
    if (ok > 0) toast.success(`${ok} apontamento(s) excluídos`);
    if (fail > 0) toast.error(`${fail} dia(s) com erro ao excluir`);
    setBulkDays(new Set());
    setBulkMode(false);
    setBulkSaving(false);
  };

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };
  const today = new Date().toISOString().split("T")[0];

  /* ─────────────────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Início</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">Espelho de Ponto</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-tight">
            Espelho de Ponto
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Central analítica de jornada — visualize, edite e aprove marcações
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Page view toggle */}
          <div className="flex bg-muted/60 rounded-xl p-1 gap-0.5 border border-border/50">
            <button
              onClick={() => setPageView("list")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                pageView === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-3 h-3" /> Lista
            </button>
            <button
              onClick={() => setPageView("detail")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                pageView === "detail" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="w-3 h-3" /> Espelho
            </button>
          </div>
          {/* Employee selector — searchable custom dropdown */}
          <div className="relative" ref={empSelectorRef}>
            <button
              onClick={() => setEmpDropOpen(v => !v)}
              className="flex items-center gap-1.5 w-[240px] rounded-xl h-10 border border-border/70 px-3 bg-background text-sm hover:border-border transition-colors"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left truncate font-medium">
                {selectedEmpId
                  ? employees.find(e => e.id === selectedEmpId)?.name?.toUpperCase() ?? "SELECIONAR..."
                  : <span className="text-muted-foreground font-normal">SELECIONAR FUNCIONÁRIO...</span>}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
            {empDropOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-[260px] rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    type="text"
                    placeholder="Buscar funcionário..."
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="max-h-[240px] overflow-y-auto">
                  {employees
                    .filter(e => e.name.toUpperCase().includes(empSearch.toUpperCase()))
                    .map(e => (
                      <button
                        key={e.id}
                        onClick={() => { setSelectedEmpId(e.id); setEmpDropOpen(false); setEmpSearch(""); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted transition-colors",
                          e.id === selectedEmpId && "bg-primary/10 text-primary font-bold"
                        )}
                      >
                        {e.name.toUpperCase()}
                      </button>
                    ))}
                  {employees.filter(e => e.name.toUpperCase().includes(empSearch.toUpperCase())).length === 0 && (
                    <p className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum funcionário encontrado</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Month nav */}
          <div className="flex items-center bg-card rounded-2xl border border-border/70 p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 text-sm font-bold min-w-[140px] text-center capitalize flex items-center justify-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              {MONTHS[month - 1]} {year}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* View toggle */}
          <div className="flex bg-muted/60 rounded-xl p-1 gap-0.5 border border-border/50">
            {(["timeline", "table"] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  viewMode === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "timeline" ? "Timeline" : "Tabela"}
              </button>
            ))}
          </div>

          {/* Export PDF — split button */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="outline" size="sm"
              className="rounded-l-xl rounded-r-none h-10 gap-2 border-border/70 text-muted-foreground hover:text-foreground pr-3"
              disabled={exportingPdf || !selectedEmpId}
              onClick={handleExportCurrentPdf}
            >
              <Download className="w-3.5 h-3.5" />
              {exportingPdf ? "Gerando…" : "Exportar PDF"}
            </Button>
            <div className="relative" ref={exportMenuRef}>
              <Button
                variant="outline" size="sm"
                className="rounded-l-none rounded-r-xl h-10 px-2 border-l-0 border-border/70 text-muted-foreground hover:text-foreground"
                disabled={exportingPdf}
                onClick={() => setExportMenuOpen(v => !v)}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[170px] rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left hover:bg-muted transition-colors disabled:opacity-50"
                    onClick={() => { handleExportCurrentPdf(); setExportMenuOpen(false); }}
                    disabled={!selectedEmpId}
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Funcionário atual
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left hover:bg-muted transition-colors"
                    onClick={() => { handleExportAllPdf(); setExportMenuOpen(false); }}
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    Todos os funcionários
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Employee list grid (list mode) ── */}
      {pageView === "list" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar funcionário..."
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select value={listSetor} onChange={e => setListSetor(e.target.value)}
              className="h-9 px-3 text-xs border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option value="all">Todos os setores</option>
              {allSetores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={listJornada} onChange={e => setListJornada(e.target.value)}
              className="h-9 px-3 text-xs border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option value="all">Qualquer jornada</option>
              <option value="8h">8h/dia</option>
              <option value="6h">6h/dia</option>
              <option value="other">Outros</option>
            </select>
            <select value={listProjeto} onChange={e => setListProjeto(e.target.value)}
              className="h-9 px-3 text-xs border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option value="all">Projeto PIN: todos</option>
              <option value="yes">Apenas PIN</option>
              <option value="no">Sem PIN</option>
            </select>
            {(listSearch || listSetor !== "all" || listJornada !== "all" || listProjeto !== "all") && (
              <button onClick={() => { setListSearch(""); setListSetor("all"); setListJornada("all"); setListProjeto("all"); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1">
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredForList.length} funcionário{filteredForList.length !== 1 ? "s" : ""}
            </span>
          </div>
          {/* Cards grid */}
          {employees.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum funcionário cadastrado</p>
            </div>
          ) : filteredForList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum resultado para os filtros aplicados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredForList.map(emp => {
                const w = emp.schedules?.expected_work ?? 0;
                const jornada = w >= 420 ? "8h/dia" : w >= 300 ? "6h/dia"
                  : w > 0 ? `${Math.floor(w / 60)}h${w % 60 > 0 ? String(w % 60).padStart(2, "0") + "m" : ""}` : "—";
                return (
                  <motion.div key={emp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-[20px] border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br shrink-0", avatarColor(emp.id))}>
                        {ini(emp.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight">{emp.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">#{emp.registration}</p>
                      </div>
                      {emp.pin_project && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">PIN</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {emp.departments?.name && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground">{emp.departments.name}</span>
                      )}
                      {emp.schedules && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {jornada}
                        </span>
                      )}
                    </div>
                    <button onClick={() => { setSelectedEmpId(emp.id); setPageView("detail"); }}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5 mt-auto">
                      <FileText className="w-3.5 h-3.5" /> Ver Espelho de Ponto
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Employee banner ─────────────────────────────────────────────── */}
      {pageView === "detail" && selectedEmp && (
        <motion.div
          key={selectedEmp.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white overflow-hidden relative shadow-xl"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-primary/20 to-transparent" />

          <div className="relative flex items-center justify-between gap-6 flex-wrap">
            {/* Employee info */}
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-3xl flex items-center justify-center text-white font-bold text-lg shadow-xl bg-gradient-to-br",
                avatarColor(selectedEmp.id)
              )}>
                {ini(selectedEmp.name)}
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">{selectedEmp.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-300 font-mono">#{selectedEmp.registration}</span>
                  {selectedEmp.departments && (
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-200">
                      {selectedEmp.departments.name}
                    </span>
                  )}
                  {selectedEmp.schedules && (
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedEmp.schedules.name}
                    </span>
                  )}
                  {selectedEmp.pin_project && (
                    <span className="text-xs bg-indigo-400/30 border border-indigo-300/40 px-2 py-0.5 rounded-full text-indigo-100 flex items-center gap-1 font-bold">
                      PIN
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Month summary mini-stats */}
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { label: "Horas Trabalhadas", value: toHHMM(totals.work), icon: Clock, color: "text-blue-300", compare: expectedMonthly > 0 ? Math.round((totals.work / expectedMonthly) * 100) : null },
                { label: "Horas Extras", value: toHHMM(totals.extra), icon: TrendingUp, color: "text-emerald-300", compare: null },
                { label: "Banco de Horas", value: (totalAccumulatedBank >= 0 ? "+" : "") + toHHMM(totalAccumulatedBank), icon: BarChart3, color: totalAccumulatedBank >= 0 ? "text-indigo-300" : "text-red-300", compare: null },
                { label: "Faltas", value: String(totals.absences), icon: AlertCircle, color: "text-red-300", compare: null },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className={cn("flex items-center justify-center gap-1 text-[11px] uppercase tracking-widest font-semibold mb-1", s.color)}>
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </div>
                  <div className="text-2xl font-bold font-mono">{s.value}</div>
                  {s.compare !== null && (
                    <div className={cn("text-[11px] mt-0.5", s.compare >= 90 ? "text-emerald-300" : "text-amber-300")}>
                      {s.compare}% do previsto
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      {pageView === "detail" && <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          {
            label: "Horas Trabalhadas", value: toHHMM(totals.work),
            icon: Clock, color: "text-blue-600", bg: "bg-blue-50 border-blue-100",
            sub: `de ${toHHMM(expectedMonthly)} previstas`, trend: "neutral" as const,
          },
          {
            label: "Horas Extras", value: toHHMM(totals.extra),
            icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100",
            sub: "acumuladas no mês", trend: totals.extra > 0 ? "up" as const : "neutral" as const,
          },
          {
            label: "Banco de Horas",
            value: (totalAccumulatedBank >= 0 ? "+" : "") + toHHMM(totalAccumulatedBank),
            icon: BarChart3,
            color: totalAccumulatedBank >= 0 ? "text-indigo-600" : "text-red-600",
            bg: totalAccumulatedBank >= 0 ? "bg-indigo-50 border-indigo-100" : "bg-red-50 border-red-100",
            sub: totalAccumulatedBank >= 0 ? "saldo acumulado" : "déficit a compensar",
            trend: totalAccumulatedBank >= 0 ? "up" as const : "down" as const,
          },
          {
            label: "Déficit", value: toHHMM(totals.delay),
            icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-100",
            sub: "horas a compensar", trend: totals.delay > 0 ? "down" as const : "neutral" as const,
          },
          {
            label: "Faltas", value: String(totals.absences),
            icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-100",
            sub: totals.absences === 1 ? "dia" : "dias no mês", trend: totals.absences > 0 ? "down" as const : "neutral" as const,
          },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="rounded-[20px] border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center", k.bg)}>
                    <k.icon className={cn("w-5 h-5", k.color)} />
                  </div>
                  {k.trend === "up" && <ArrowUpRight className="w-4 h-4 text-emerald-600" />}
                  {k.trend === "down" && k.value !== "00:00" && k.value !== "0" && (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold tracking-tight font-mono">{k.value}</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">{k.label}</div>
                  <div className="text-xs text-muted-foreground">{k.sub}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>}

      {/* ── PIN project card ─────────────────────────────────────────────── */}
      {pageView === "detail" && selectedEmp?.pin_project && (() => {
        const PIN_GOAL = 40 * 60; // 40 horas em minutos
        const achieved = totals.extra;
        const pct = Math.min(100, Math.round((achieved / PIN_GOAL) * 100));
        const met = achieved >= PIN_GOAL;
        return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className={cn("rounded-[20px] border-2 shadow-sm", met ? "border-indigo-200 bg-indigo-50" : "border-amber-200 bg-amber-50")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm", met ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700")}>P</div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Projeto PIN</p>
                      <p className="text-[11px] text-muted-foreground">Meta mensal de 40h extras</p>
                    </div>
                  </div>
                  <div className={cn("text-right")}>
                    <p className={cn("text-xl font-bold font-mono", met ? "text-indigo-700" : "text-amber-700")}>{toHHMM(achieved)}</p>
                    <p className="text-[11px] text-muted-foreground">de 40:00 meta</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full bg-white/60 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", met ? "bg-indigo-500" : "bg-amber-400")}
                    style={{ width: pct + "%" }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-muted-foreground">{pct}% da meta atingida</span>
                  {met
                    ? <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1"><CheckCheck className="w-3 h-3" /> Meta cumprida!</span>
                    : <span className="text-[11px] text-amber-600">Faltam {toHHMM(PIN_GOAL - achieved)}</span>
                  }
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {/* ── Timeline / Table ─────────────────────────────────────────────── */}
      {pageView === "detail" && <Card className="rounded-[24px] border-border shadow-lg shadow-black/5 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold text-sm text-foreground capitalize">
              {MONTHS[month - 1]} {year}
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg border border-border/50">
              {displayDays.length !== allDays.length
                ? `${displayDays.length} de ${allDays.length} dias`
                : `${records.length} registros`}
            </span>
          </div>
          {viewMode === "timeline" && (
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-primary/80" /><span>Jornada</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-amber-300/60" /><span>Intervalo</span></div>
              <div className="flex items-center gap-1.5"><div className="w-0.5 h-3 bg-slate-300" /><span>Previsto</span></div>
            </div>
          )}
        </div>
        {/* Filter bar */}
        <div className="px-6 py-2.5 border-b border-border/50 bg-[#F8FAFC] flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Filtrar:</span>
          <button
            onClick={() => setFilterStatus("all")}
            className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all",
              filterStatus === "all" ? "bg-primary text-white border-primary" : "bg-background border-border/60 text-muted-foreground hover:border-primary/40"
            )}
          >Todos</button>
          {(Object.entries(STATUS_META) as [RecordStatus, typeof STATUS_META[RecordStatus]][]).map(([k, m]) => (
            <button
              key={k}
              onClick={() => setFilterStatus(filterStatus === k ? "all" : k)}
              className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1",
                filterStatus === k
                  ? cn(m.bg, m.color, "border-transparent")
                  : "bg-background border-border/60 text-muted-foreground hover:border-primary/40"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
              {m.label}
            </button>
          ))}
          <div className="w-px h-3.5 bg-border mx-0.5" />
          <button
            onClick={() => setFilterHideWeekends(!filterHideWeekends)}
            className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all",
              filterHideWeekends ? "bg-slate-700 text-white border-slate-700" : "bg-background border-border/60 text-muted-foreground hover:border-primary/40"
            )}
          >Ocultar fins de semana</button>
          <div className="w-px h-3.5 bg-border mx-0.5" />
          {/* Bulk selection toggle */}
          <button
            onClick={() => { setBulkMode(v => !v); setBulkDays(new Set()); }}
            className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1",
              bulkMode ? "bg-indigo-600 text-white border-indigo-600" : "bg-background border-border/60 text-muted-foreground hover:border-indigo-400"
            )}
          >
            <CheckSquare className="w-3 h-3" /> Seleção múltipla
          </button>
          {(filterStatus !== "all" || filterHideWeekends) && (
            <button
              onClick={() => { setFilterStatus("all"); setFilterHideWeekends(false); }}
              className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-20 bg-muted rounded-full animate-pulse" />
                <div className="h-5 flex-1 bg-muted rounded-full animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !selectedEmpId && (
          <div className="py-20 text-center">
            <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Selecione um funcionário</p>
            <p className="text-sm text-muted-foreground mt-1">Escolha um colaborador para visualizar o espelho de ponto</p>
          </div>
        )}

        {/* Timeline view */}
        {!loading && selectedEmpId && viewMode === "timeline" && (
          <div className="divide-y divide-border/50">
            {/* Time axis header */}
            <div className="px-6 py-2 bg-muted/30 grid grid-cols-[80px_80px_1fr_90px_90px_90px_48px] gap-4 items-center">
              {["Data","Dia","Linha do Tempo","Trabalhado","Extras","Status",""].map((h, i) => (
                <div key={i} className={cn("text-[10px] uppercase tracking-[0.08em] font-bold text-slate-400", i >= 5 ? "text-right" : "")}>
                  {h}
                </div>
              ))}
            </div>

            {displayDays.map(dateStr => {
              const rec = recordsByDate[dateStr];
              const d = new Date(dateStr + "T00:00:00");
              const wd = d.getDay();
              const isWeekend = wd === 0 || wd === 6;
              const status = (rec?.status as RecordStatus) || (isWeekend ? "OFF_DAY" : null);
              const isToday = dateStr === today;
              const entries = (rec?.time_entries || []).sort((a: any, b: any) => a.time.localeCompare(b.time));
              const meta = status ? STATUS_META[status] : null;
              const calc = recordCalcs[dateStr] || { net: 0, ot: 0, deficit: 0 };
              const hasDelay = calc.deficit > 0;
              const hasExtra = calc.ot > 0;
              const expected = selectedEmp?.schedules?.expected_work ?? 480;

              return (
                <motion.div
                  key={dateStr}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={bulkMode ? () => toggleBulkDay(dateStr) : undefined}
                  className={cn(
                    "px-6 py-3 grid grid-cols-[80px_80px_1fr_90px_90px_90px_48px] gap-4 items-center group transition-colors",
                    bulkMode ? "cursor-pointer select-none" : "",
                    bulkMode && bulkDays.has(dateStr) ? "bg-indigo-50 border-l-4 border-l-indigo-500" : "",
                    !bulkMode && (isWeekend && !rec ? "bg-slate-50/60 text-muted-foreground" : "hover:bg-[#F8FAFC]"),
                    !bulkMode && isToday ? "bg-primary/5 hover:bg-primary/5" : "",
                  )}
                >
                  {/* Date */}
                  <div className="flex items-center gap-2">
                    {bulkMode ? (
                      bulkDays.has(dateStr)
                        ? <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        : <Square className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    ) : isToday ? (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    ) : null}
                    <span className={cn("font-mono text-xs font-bold",
                      bulkDays.has(dateStr) ? "text-indigo-700" :
                      isToday ? "text-primary" : isWeekend ? "text-muted-foreground/50" : "text-foreground"
                    )}>
                      {dateStr.split("-").reverse().join("/")}
                    </span>
                  </div>

                  {/* Weekday */}
                  <span className={cn("text-[11px] font-bold uppercase tracking-wide", isWeekend ? "text-slate-400" : "text-muted-foreground")}>
                    {WEEKDAYS_SHORT[wd]}
                  </span>

                  {/* Timeline bar or status strip */}
                  <div className="flex items-center gap-2">
                    {entries.length > 0 ? (
                      <div className="w-full">
                        <TimelineBar entries={entries} expected={expected} />
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {entries.map((e: any, i: number) => (
                            <span key={i} className={cn(
                              "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md",
                              e.type === "IN" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-600 border border-slate-100"
                            )}>
                              {e.type === "IN" ? "↓" : "↑"}{parseTime(e.time)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : status === "OFF_DAY" ? (
                      <div className="h-5 w-full rounded-full bg-slate-100/60 flex items-center px-2">
                        <span className="text-[10px] text-slate-400 font-medium">Fim de semana / Folga</span>
                      </div>
                    ) : status && status !== "NORMAL" ? (
                      <div className={cn("h-5 flex-1 rounded-full flex items-center px-3 border text-[11px] font-bold", meta?.bg, meta?.color)}>
                        {meta?.label}
                      </div>
                    ) : (
                      <div className="h-5 w-full rounded-full bg-muted/40 flex items-center px-2">
                        <span className="text-[10px] text-muted-foreground/60 font-medium italic">Sem marcações</span>
                      </div>
                    )}
                  </div>

                  {/* Worked */}
                  <div className="text-right">
                    {rec ? (
                      <span className={cn("font-mono text-xs font-bold", hasDelay ? "text-red-600" : "text-foreground")}>
                        {toHHMM(calc.net)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Extras */}
                  <div className="text-right">
                    {rec && calc.ot > 0 ? (
                      <span className="font-mono text-xs font-bold text-emerald-600">+{toHHMM(calc.ot)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex justify-end">
                    {meta && status !== "NORMAL" ? (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        meta.bg, meta.color
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                        {meta.short}
                      </span>
                    ) : rec ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        OK
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!bulkMode && (
                      <>
                        <button
                          onClick={() => openEdit(dateStr)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {rec && (
                          <button
                            onClick={() => deleteRecord(rec.id, dateStr.split("-").reverse().join("/"))}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Table view */}
        {!loading && selectedEmpId && viewMode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-border">
                  {["Data","Dia","Marcações","Trabalhado","Extras","Atraso","Status","Justificativa",""].map((h, i) => (
                    <th key={i} className={cn(
                      "py-3.5 text-xs uppercase tracking-[0.06em] font-bold text-slate-500 whitespace-nowrap",
                      i === 0 ? "pl-6 text-left" : i === 8 ? "pr-4 w-10" : "text-left px-3"
                    )}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {displayDays.map(dateStr => {
                  const rec = recordsByDate[dateStr];
                  const d = new Date(dateStr + "T00:00:00");
                  const wd = d.getDay();
                  const isWeekend = wd === 0 || wd === 6;
                  const status = (rec?.status as RecordStatus) || (isWeekend ? "OFF_DAY" : null);
                  const isToday = dateStr === today;
                  const entries = (rec?.time_entries || []).sort((a: any, b: any) => a.time.localeCompare(b.time));
                  const meta = status ? STATUS_META[status] : null;
                  const calc = recordCalcs[dateStr] || { net: 0, ot: 0, deficit: 0 };

                  return (
                    <tr
                      key={dateStr}
                      onClick={bulkMode ? () => toggleBulkDay(dateStr) : undefined}
                      className={cn(
                        "group transition-colors",
                        bulkMode ? "cursor-pointer select-none" : "",
                        bulkMode && bulkDays.has(dateStr) ? "bg-indigo-50" : "",
                        !bulkMode && (isWeekend && !rec ? "bg-slate-50/60" : "hover:bg-[#F8FAFC]"),
                        !bulkMode && isToday && "bg-primary/5"
                      )}
                    >
                      <td className="pl-6 py-3.5 font-mono text-sm font-bold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {bulkMode ? (
                            bulkDays.has(dateStr)
                              ? <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                              : <Square className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                          ) : isToday ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          ) : null}
                          <span className={bulkDays.has(dateStr) ? "text-indigo-700" : ""}>
                            {dateStr.split("-").reverse().join("/")}
                          </span>
                        </div>
                      </td>
                      <td className={cn("px-3 py-3.5 text-xs font-bold uppercase tracking-wide", isWeekend ? "text-slate-300" : "text-muted-foreground")}>
                        {WEEKDAYS_SHORT[wd]}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {entries.map((e: any, i: number) => (
                            <span key={i} className={cn(
                              "font-mono text-xs font-bold px-2 py-1 rounded-md border",
                              e.type === "IN" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-100"
                            )}>
                              {e.type === "IN" ? "↓" : "↑"}{parseTime(e.time)}
                            </span>
                          ))}
                          {!entries.length && <span className="text-sm text-muted-foreground/40 italic">—</span>}
                        </div>
                      </td>
                      <td className={cn("px-3 py-3.5 font-mono text-sm font-bold", calc.deficit > 0 ? "text-red-600" : "")}>
                        {rec ? toHHMM(calc.net) : "—"}
                      </td>
                      <td className={cn("px-3 py-3.5 font-mono text-sm font-bold", calc.ot > 0 ? "text-emerald-600" : "text-muted-foreground/40")}>
                        {rec && calc.ot > 0 ? "+" + toHHMM(calc.ot) : "—"}
                      </td>
                      <td className={cn("px-3 py-3.5 font-mono text-sm font-bold", calc.deficit > 0 ? "text-amber-600" : "text-muted-foreground/40")}>
                        {rec && calc.deficit > 0 ? toHHMM(calc.deficit) : "—"}
                      </td>
                      <td className="px-3 py-3.5">
                        {meta ? (
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border", meta.bg, meta.color)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                            {meta.label}
                          </span>
                        ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-muted-foreground max-w-[180px] truncate">
                        {rec?.justification ?? "—"}
                      </td>
                      <td className="pr-4 py-3.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          {!bulkMode && (
                            <>
                              <button
                                onClick={() => openEdit(dateStr)}
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {rec && (
                                <button
                                  onClick={() => deleteRecord(rec.id, dateStr.split("-").reverse().join("/"))}
                                  className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>}

      {pageView === "detail" && <div className="flex items-center gap-4 flex-wrap px-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Legenda:</span>
        {Object.entries(STATUS_META).map(([k, m]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", m.dot)} />
            <span className="text-[11px] text-muted-foreground">{m.label}</span>
          </div>
        ))}
      </div>}

      {/* ══════════════════════════════════════════════════════════════════════
          Edit Side Drawer
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editDay && (
          <>
            {/* Backdrop */}
            <motion.div
              key="edit-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setEditDay(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />

            {/* Side panel */}
            <motion.div
              key="edit-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[620px] flex flex-col bg-[#F5F7FB] shadow-2xl"
            >
              {/* ── Header ───────────────────────────────────────────── */}
              <div className="bg-white border-b border-[#E2E8F0] px-6 py-5 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 flex items-center justify-center shrink-0">
                    <span className="text-[#2563EB] font-bold text-lg">
                      {selectedEmp?.name?.charAt(0) ?? "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#0F172A] text-base leading-tight truncate">{selectedEmp?.name}</p>
                    <p className="text-xs text-[#64748B] truncate">
                      {selectedEmp?.registration && <span className="mr-2">#{selectedEmp.registration}</span>}
                      {selectedEmp?.role_title && <span>{selectedEmp.role_title}</span>}
                      {selectedEmp?.departments?.name && <span className="ml-2 text-[#94A3B8]">· {selectedEmp.departments.name}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Date badge */}
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Editando</p>
                    <p className="text-sm font-bold text-[#0F172A]">
                      {editDay ? editDay.split("-").reverse().join("/") : ""}
                    </p>
                  </div>
                  {/* Status pill */}
                  {editStatus && (
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-bold border",
                      STATUS_META[editStatus].bg,
                      STATUS_META[editStatus].color
                    )}>
                      {STATUS_META[editStatus].label}
                    </span>
                  )}
                  {/* Close */}
                  <button
                    onClick={() => setEditDay(null)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── Scrollable body ───────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                {/* KPI mini cards */}
                {(() => {
                  const expected = LEAVE_STATUSES.includes(editStatus) ? 0 : (selectedEmp?.schedules?.expected_work ?? 480);
                  const lunch = noLunch ? 0 : (selectedEmp?.schedules?.lunch_minutes ?? 60);
                  const dayCalc = editEntries.length > 0
                    ? calcHours(editEntries, expected, lunch)
                    : { net: editRecord?.total_work ?? 0, ot: (editRecord?.overtime50 ?? 0), deficit: editRecord?.delay ?? 0 };
                  const bankRec = records.find(r => r.date.substring(0,10) === editDay);
                  return (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Horas do dia", value: toHHMM(dayCalc.net), icon: Clock, color: "text-[#2563EB]", bg: "bg-[#2563EB]/10" },
                        { label: "Extras", value: toHHMM(dayCalc.ot), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Atrasos", value: toHHMM(dayCalc.deficit), icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
                        { label: "Marcações", value: String(editEntries.length), icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
                      ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className="bg-white rounded-2xl border border-[#E2E8F0] px-3 py-3 flex flex-col gap-1.5 shadow-sm">
                          <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center", bg)}>
                            <Icon className={cn("w-3.5 h-3.5", color)} />
                          </div>
                          <p className={cn("text-base font-bold font-mono leading-none", color)}>{value}</p>
                          <p className="text-[10px] text-[#64748B] leading-none">{label}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Status select cards */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Status do Dia</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.entries(STATUS_META) as [RecordStatus, typeof STATUS_META[RecordStatus]][]).map(([k, m]) => (
                      <button
                        key={k}
                        onClick={() => setEditStatus(k)}
                        className={cn(
                          "py-3 px-2 text-[11px] font-bold rounded-xl border-2 transition-all flex flex-col items-center gap-1.5",
                          editStatus === k
                            ? `${m.bg} ${m.color} shadow-md scale-[1.03]`
                            : "border-[#E2E8F0] text-[#64748B] bg-[#F5F7FB] hover:bg-[#EEF2FF] hover:border-[#2563EB]/30"
                        )}
                      >
                        <span className={cn("w-2.5 h-2.5 rounded-full", m.dot)} />
                        {m.short}
                        <span className="text-[9px] font-medium opacity-70 leading-none">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time entries timeline */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Marcações de Ponto</p>
                    <button
                      onClick={addEntry}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition-colors shadow-sm shadow-[#2563EB]/30"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Marcação
                    </button>
                  </div>

                  {/* No-lunch toggle */}
                  <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F5F7FB] border border-[#E2E8F0] cursor-pointer group w-fit">
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                      noLunch ? "bg-[#2563EB] border-[#2563EB]" : "border-[#CBD5E1] bg-white"
                    )}>
                      {noLunch && <svg viewBox="0 0 12 10" className="w-2.5 h-2 text-white fill-none stroke-white stroke-[2]"><polyline points="1,5 4,8 11,1"/></svg>}
                    </div>
                    <input type="checkbox" className="sr-only" checked={noLunch} onChange={e => setNoLunch(e.target.checked)} />
                    <span className="text-xs font-semibold text-[#475569] group-hover:text-[#0F172A] transition-colors">
                      Não descontar intervalo de almoço
                    </span>
                    {noLunch && <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE]">ativo</span>}
                  </label>

                  {editEntries.length === 0 ? (
                    <div className="py-8 text-center rounded-2xl bg-[#F5F7FB] border border-dashed border-[#E2E8F0]">
                      <Clock className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-[#64748B]">Nenhuma marcação</p>
                      <p className="text-xs text-[#94A3B8]">Clique em "Adicionar Marcação" para inserir</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-5 top-5 bottom-5 w-px bg-[#E2E8F0]" />
                      <div className="space-y-3">
                        {editEntries.map((entry, i) => (
                          <div key={i} className="flex items-center gap-3 relative">
                            {/* Icon node */}
                            <div className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold border-2 shrink-0 z-10",
                              entry.type === "IN"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            )}>
                              {entry.type === "IN" ? "↓" : "↑"}
                            </div>
                            {/* Card */}
                            <div className="flex-1 flex items-center gap-3 bg-[#F5F7FB] border border-[#E2E8F0] rounded-2xl px-4 py-3">
                              <select
                                value={entry.type}
                                onChange={e => updateEntry(i, "type", e.target.value)}
                                className="text-xs font-bold border border-[#E2E8F0] rounded-xl px-2 py-1.5 bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                              >
                                <option value="IN">Entrada</option>
                                <option value="OUT">Saída</option>
                              </select>
                              <input
                                type="time"
                                value={entry.time}
                                onChange={e => updateEntry(i, "time", e.target.value)}
                                className="flex-1 border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-sm font-mono bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                              />
                              <button
                                onClick={() => removeEntry(i)}
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Leave-with-entries info */}
                {LEAVE_STATUSES.includes(editStatus) && editEntries.length > 0 && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white text-[9px] font-bold">i</span>
                    </div>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <strong>Apontamento em período de {STATUS_META[editStatus].label}:</strong> como a expectativa de trabalho é zero neste dia, todas as horas lançadas serão computadas como <strong>horas extras</strong>.
                    </p>
                  </div>
                )}

                {/* Observation */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Observação / Justificativa</p>
                  <div className="relative">
                    <textarea
                      value={editJust}
                      onChange={e => setEditJust(e.target.value)}
                      placeholder="Descreva o motivo da alteração ou observação do registro…"
                      rows={4}
                      maxLength={500}
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F5F7FB] px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 text-[#0F172A] placeholder:text-[#94A3B8]"
                    />
                    <p className="text-right text-[11px] text-[#94A3B8] mt-1">{editJust.length}/500</p>
                  </div>
                </div>

                {/* Audit history (static/mock) */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Histórico de Alterações</p>
                  {editRecord ? (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-7 h-7 rounded-xl bg-[#2563EB]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0F172A] text-xs">Registro existente</p>
                        <p className="text-[#64748B] text-xs">Status atual: <span className="font-bold">{STATUS_META[editRecord.status as RecordStatus]?.label ?? editRecord.status}</span></p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#94A3B8]">Nenhum histórico — este será um novo registro.</p>
                  )}
                </div>
              </div>

              {/* ── Sticky footer ─────────────────────────────────────── */}
              <div className="bg-white border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between gap-3 shrink-0">
                {/* Delete */}
                {editRecord ? (
                  <button
                    onClick={() => {
                      deleteRecord(editRecord.id, editDay!.split("-").reverse().join("/"));
                      setEditDay(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-500 text-sm font-semibold hover:bg-red-50 border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                ) : (
                  <div />
                )}
                {/* Right actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditDay(null)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#64748B] border border-[#E2E8F0] hover:bg-[#F5F7FB] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveRecord}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] transition-all shadow-md shadow-[#2563EB]/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Floating bulk apply panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {bulkDays.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-border rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 flex-wrap max-w-[700px] w-[calc(100vw-32px)]"
          >
            {/* Count badge */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-none">{bulkDays.size} dia{bulkDays.size !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">selecionado{bulkDays.size !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-border shrink-0" />
            {/* Status picker */}
            <Select value={bulkStatus} onValueChange={v => setBulkStatus(v as RecordStatus)}>
              <SelectTrigger className="w-44 h-9 text-xs rounded-xl border-border/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(STATUS_META) as [RecordStatus, typeof STATUS_META[RecordStatus]][]).map(([k, m]) => (
                  <SelectItem key={k} value={k}>
                    <span className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", m.dot)} />
                      {m.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Justification */}
            <Input
              value={bulkJust}
              onChange={e => setBulkJust(e.target.value)}
              placeholder="Justificativa (opcional)..."
              className="flex-1 min-w-[160px] h-9 text-xs rounded-xl border-border/70"
            />
            {/* Apply */}
            <Button
              size="sm"
              disabled={bulkSaving}
              onClick={applyBulk}
              className="rounded-xl h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
            >
              {bulkSaving ? "Aplicando..." : "Aplicar"}
            </Button>
            {/* Delete */}
            <Button
              size="sm"
              disabled={bulkSaving}
              onClick={deleteBulk}
              variant="outline"
              className="rounded-xl h-9 px-4 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {bulkSaving ? "..." : "Excluir"}
            </Button>
            {/* Close */}
            <button
              onClick={() => { setBulkDays(new Set()); setBulkMode(false); setBulkJust(""); }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
