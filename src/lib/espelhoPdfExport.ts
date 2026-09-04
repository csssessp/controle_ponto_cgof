/* ═══════════════════════════════════════════════════════════════════════════
   Espelho de Ponto — geração de PDF (extraído de TimeCard.tsx)
   Único lugar que sabe montar o PDF do espelho — usado pela tela de
   Relatórios (Configurações). Nada de UI aqui, só dados + jsPDF.
   ═══════════════════════════════════════════════════════════════════════════ */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchPinAutoBalances, pinAccumFor } from "@/src/lib/pinHistoricalData";

/* ── Types ─────────────────────────────────────────────────────────────────── */
export type RecordStatus = "NORMAL" | "ABSENCE" | "VACATION" | "HOLIDAY" | "CERTIFICATE" | "OFF_DAY" | "COMPENSATION" | "DECLARATION" | "PREMIUM_LEAVE";

export type AttRecord = {
  id: string; date: string; status: RecordStatus; justification?: string;
  total_work: number; overtime50: number; delay: number;
  time_entries: Array<{ id: string; time: string; type: string; original?: string }>;
};
export type EspelhoEmployee = {
  id: string; name: string; registration: string;
  role_title?: string; admission_date?: string;
  departments?: { name: string };
  schedules?: { name: string; expected_work: number; lunch_minutes: number; start_time?: string; end_time?: string };
  pin_project?: boolean;
};

export const LEAVE_STATUSES: RecordStatus[] = ["VACATION", "PREMIUM_LEAVE", "HOLIDAY", "OFF_DAY"];

export const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
export const WEEKDAYS_SHORT = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

/* ── Helpers ───────────────────────────────────────────────────────────────── */
export function toHHMM(min: number) {
  const a = Math.abs(min);
  return (min < 0 ? "-" : "") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
}
export function parseTime(raw: string): string {
  return raw.includes("T") ? raw.split("T")[1].substring(0, 5) : raw.substring(0, 5);
}
export function buildDays(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) { days.push(d.toISOString().split("T")[0]); d.setDate(d.getDate() + 1); }
  return days;
}
export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* Client-side recalculation matching server logic */
export function calcHours(
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

/* Night hours: minutes between 22:00 and 05:00 from a set of IN/OUT entries */
export function calcNightMinutes(entries: Array<{ time: string; type: string }>): number {
  const sorted = [...entries]
    .map(e => ({ ...e, t: parseTime(e.time) }))
    .sort((a, b) => a.t.localeCompare(b.t));
  let night = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    if (sorted[i].type !== "IN" || sorted[i + 1].type !== "OUT") continue;
    const inM  = timeToMin(sorted[i].t);
    const outM = timeToMin(sorted[i + 1].t);
    const n1 = Math.min(outM, 24 * 60) - Math.max(inM, 22 * 60);
    if (n1 > 0) night += n1;
    const n2 = Math.min(outM, 5 * 60) - Math.max(inM, 0);
    if (n2 > 0) night += n2;
  }
  return Math.max(0, night);
}

/* ══════════════════════════════════════════════════════════════════════════════
   PDF Export — Premium Enterprise Document
══════════════════════════════════════════════════════════════════════════════ */
type PdfOptions = {
  emp: EspelhoEmployee;
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
const ORG_CNPJ  = "47.097.042/0001-84";
void ORG_CNPJ; // reservado para uso futuro no rodapé do documento

export async function loadLogoDataUrl(): Promise<string | undefined> {
  try {
    const res = await fetch("/img/BRASAO-3-texto-branco.png");
    if (!res.ok) return undefined;
    const blob = await res.blob();
    // O arquivo original tem o brasão à esquerda e um texto em branco à
    // direita (pensado pra fundo escuro) — em uma folha branca esse texto
    // fica invisível. Recorta só o emblema colorido antes de gerar o PDF.
    const bitmap = await createImageBitmap(blob);
    const cropW = Math.min(420, bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(bitmap, 0, 0, cropW, bitmap.height, 0, 0, cropW, bitmap.height);
    return canvas.toDataURL("image/png");
  } catch { return undefined; }
}

async function buildEspelhoPdf(opts: PdfOptions): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  renderEmpToDoc(doc, opts);
  return doc;
}

async function buildAllEspelhosPdf(empDataList: PdfOptions[]): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
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

  // Landscape A4: 297 × 210 mm — todo o mês cabe em uma única folha, com mais
  // espaço horizontal pras colunas (marcações, justificativa) do que em retrato.
  const W = 297, H = 210, ML = 10, MR = 287, CW = MR - ML; // CW = 277mm
  const HEADER_H = 11; // cabeçalho enxuto — libera altura pra tabela caber numa folha só

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

    // Logo — brasão recortado (só o emblema, sem a área de texto branco que
    // ficaria invisível em fundo branco), proporção ~0.855:1
    if (logoDataUrl) {
      try {
        const lH = HEADER_H - 2, lW = lH * 0.855;
        doc.addImage(logoDataUrl, "PNG", ML + 1, (HEADER_H - lH) / 2, lW, lH);
      } catch { /* skip */ }
    }

    // Vertical dividers
    sd(C.grayLine); doc.setLineWidth(0.2);
    doc.line(ML + 16, 2, ML + 16, HEADER_H - 2);
    doc.line(MR - 38, 2, MR - 38, HEADER_H - 2);

    // Center zone
    const cx = (ML + 16 + MR - 38) / 2;
    doc.setFont("helvetica", "normal"); doc.setFontSize(3.3); st(C.grayText);
    doc.text("ESPELHO DE PONTO — CONTROLE DE FREQUÊNCIA", cx, 3.8, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); st(C.black);
    doc.text(ORG_NAME, cx, 8, { align: "center" });

    // Right zone
    const rx = MR - 1;
    doc.setFont("helvetica", "normal"); doc.setFontSize(3); st(C.grayLight);
    doc.text("COMPETÊNCIA", rx, 3.3, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); st(C.navy);
    doc.text(monthLabel.toUpperCase(), rx, 7.8, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(2.7); st(C.grayLight);
    doc.text(`Pág. ${localPage}/${total}  ·  Emitido: ${emitDate}`, rx, 10.3, { align: "right" });
  }

  drawPageHeader(1, 1);
  let curY = HEADER_H + 1;

  // ── Employee info bar (flat, professional, no avatar) ─────────────────────
  const empCardH = 9;
  sf(C.white); doc.rect(ML, curY, CW, empCardH, "F");
  sd(C.grayLine); doc.setLineWidth(0.2); doc.rect(ML, curY, CW, empCardH, "S");
  sf(C.navy); doc.rect(ML, curY, 3, empCardH, "F");

  const nameStr = (emp.name.length > 44 ? emp.name.substring(0, 42) + "…" : emp.name).toUpperCase();
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); st(C.black);
  doc.text(nameStr, ML + 5.5, curY + 3.8);

  sf([220, 252, 231] as RGB); doc.rect(MR - 18, curY + 1, 16, 4, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(3.8); st([21, 128, 61] as RGB);
  doc.text("ATIVO", MR - 10, curY + 3.6, { align: "center" });

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
    if (i > 0) { sd(C.grayLine); doc.setLineWidth(0.1); doc.line(ML + i * fColW, curY + 5, ML + i * fColW, curY + empCardH - 0.4); }
    doc.setFont("helvetica", "normal"); doc.setFontSize(2.8); st(C.grayLight);
    doc.text(f.lbl, fx, curY + 6.2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(3.8); st(C.black);
    doc.text(f.val, fx, curY + 8.4);
  });

  curY += empCardH + 0.8;

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

  // Déficit exibido já líquido: horas extras do período compensam faltas/jornada
  // incompleta antes de mostrar "quanto ainda falta compensar" (Banco Atual continua
  // usando o valor bruto — já faz essa mesma conta internamente).
  const netDeficit = Math.max(0, totals.delay - totals.extra);

  const kpiH = 7;
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
    { lbl: "Déficit",      val: netDeficit > 0 ? "-" + toHHMM(netDeficit) : "—",                                 valC: netDeficit > 0 ? C.red   : C.grayLight },
    { lbl: "Banco Atual",  val: (totalAccumulatedBank >= 0 ? "+" : "") + toHHMM(Math.abs(totalAccumulatedBank)),  valC: totalAccumulatedBank >= 0 ? C.green : C.red },
    { lbl: "Presença",     val: prsPct + "%",                                                                      valC: prsPct >= 90 ? C.green : prsPct >= 75 ? C.amber : C.red },
  ];

  const kW = CW / kpiCards.length;
  kpiCards.forEach((k, i) => {
    const kx = ML + i * kW;
    sf(C.white); doc.roundedRect(kx + 0.3, curY, kW - 0.6, kpiH, 1, 1, "F");
    sd(C.grayLine); doc.setLineWidth(0.15);
    doc.roundedRect(kx + 0.3, curY, kW - 0.6, kpiH, 1, 1, "S");
    doc.setFont("helvetica", "bold"); doc.setFontSize(4.5); st(k.valC);
    doc.text(k.val, kx + kW / 2, curY + 4.2, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(2.5); st(C.grayLight);
    doc.text(k.lbl, kx + kW / 2, curY + kpiH - 0.7, { align: "center" });
  });
  curY += kpiH + 0.8;

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

  const BOTTOM_RESERVE = 32;
  const SAFETY_MM      = 5;
  const tableBoundary  = H - BOTTOM_RESERVE;          // 178mm — table must stop here
  const tableAvailH    = tableBoundary - curY;         // available for header+body
  const headerRowH     = 5;
  const rowH           = Math.max(3.2, Math.min(6.5, (tableAvailH - headerRowH - SAFETY_MM) / Math.max(allDays.length, 1)));
  const cellPadV       = Math.max(0.25, (rowH - 4.5 * 0.352) / 2 - 0.1);

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
    const isLeaveDay = LEAVE_STATUSES.includes(rec.status);
    const dayBank  = net - (isLeaveDay ? 0 : (emp.schedules?.expected_work ?? 480));
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
    head: [["DATA", "DIA", "JORNADA", "MARCAÇÕES", "TRAB.", "H.E.", "A.NOT.", "DÉF.", "BCO/DIA", "STATUS", "JUSTIFICATIVA"]],
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
      0:  { cellWidth: 16,  halign: "center" }, // DATA
      1:  { cellWidth:  9,  halign: "center" }, // DIA
      2:  { cellWidth: 20,  halign: "center" }, // JORNADA
      3:  { cellWidth: 75,  halign: "left"   }, // MARCAÇÕES
      4:  { cellWidth: 16,  halign: "center" }, // TRAB
      5:  { cellWidth: 14,  halign: "center" }, // H.E.
      6:  { cellWidth: 14,  halign: "center" }, // A.NOT.
      7:  { cellWidth: 14,  halign: "center" }, // DÉF.
      8:  { cellWidth: 16,  halign: "center" }, // BCO/DIA
      9:  { cellWidth: 22,  halign: "center" }, // STATUS
      10: { cellWidth: 61,  halign: "left"   }, // JUSTIFICATIVA → total 277
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

  // ── Signature section (compacto, cabe na mesma folha da tabela) ───────────
  const sigAreaY = H - BOTTOM_RESERVE + 0.5;
  sd(C.grayLine); doc.setLineWidth(0.2);
  doc.line(ML, sigAreaY, MR, sigAreaY);
  sf(C.navy); doc.rect(ML, sigAreaY, 10, 0.35, "F");

  doc.setFont("helvetica", "italic"); doc.setFontSize(3.2); st(C.grayText);
  doc.text(
    `Declaro que as informações de frequência referentes à competência ${MONTHS[month - 1]}/${year} conferem com os registros do sistema.`,
    ML, sigAreaY + 2.4
  );
  doc.setFont("helvetica", "normal"); doc.setFontSize(3.2); st(C.black);
  doc.text(`São Paulo, _____ de ${MONTHS[month - 1]} de ${year}.`, MR, sigAreaY + 2.4, { align: "right" });

  const sigH    = 20;
  const sbW     = (CW - 6) / 2;   // 2 boxes with 6mm gap
  const sigBoxY = sigAreaY + 3.6;
  const sigBoxes = [
    { title: "FUNCIONÁRIO",     name: emp.name, sub: emp.role_title || "Colaborador" },
    { title: "CHEFIA IMEDIATA", name: "",        sub: "Responsável Direto"            },
  ];

  sigBoxes.forEach((box, i) => {
    const bx = ML + i * (sbW + 6);
    sf(C.white); doc.rect(bx, sigBoxY, sbW, sigH, "F");
    sd(C.grayLine); doc.setLineWidth(0.2); doc.rect(bx, sigBoxY, sbW, sigH, "S");
    sf(C.navy); doc.rect(bx, sigBoxY, sbW, 4.2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(3.8); st(C.white);
    doc.text(box.title, bx + sbW / 2, sigBoxY + 3, { align: "center" });
    sd([190, 198, 212] as RGB); doc.setLineWidth(0.35);
    doc.line(bx + 4, sigBoxY + sigH - 8, bx + sbW - 4, sigBoxY + sigH - 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(2.8); st(C.grayLight);
    doc.text("Assinatura / Carimbo", bx + sbW / 2, sigBoxY + sigH - 6.3, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(3.8); st(C.black);
    const n = box.name ? (box.name.length > 34 ? box.name.substring(0, 32) + "…" : box.name) : "";
    doc.text(n, bx + sbW / 2, sigBoxY + sigH - 3.2, { align: "center" });
    if (box.sub) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(3); st(C.grayText);
      doc.text(box.sub.substring(0, 42), bx + sbW / 2, sigBoxY + sigH - 1, { align: "center" });
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
   Data fetching + high-level export API
══════════════════════════════════════════════════════════════════════════════ */

/**
 * Compute the correct accumulated bank for an employee in a given year/month.
 * Fetches seed + ALL records, accumulates per-month bank, applies PIN deductions.
 */
async function computeAccumulatedBank(
  emp: EspelhoEmployee,
  targetYear: number,
  targetMonth: number,
  currentMonthRecs: AttRecord[],
): Promise<number> {
  // Projeto PIN: sempre a mesma fonte de verdade usada em "Saldos Acumulados" —
  // dados congelados Jan–Jul/2026 ou auto-balances Ago/2026+ (nunca a fórmula
  // per-attendance-record abaixo, que não se aplica a funcionários PIN).
  if (emp.pin_project) {
    const autoBalances = await fetchPinAutoBalances();
    return pinAccumFor(emp.id, targetYear, targetMonth, autoBalances) ?? 0;
  }

  const expected = emp.schedules?.expected_work ?? 480;
  const lunch    = emp.schedules?.lunch_minutes  ?? 60;

  let seed = 0;
  let cutoffYM: number | null = null;
  try {
    const bd = await fetch(`/api/time-bank/${emp.id}`).then(r => r.json());
    seed = bd.totalMinutes ?? 0;
    const entries: Array<{ date: string }> = bd.entries || [];
    if (entries.length) {
      const latest = entries.map((e: any) => e.date.substring(0, 10)).sort().at(-1)!;
      const [ly, lm] = latest.split("-").map(Number);
      cutoffYM = ly * 12 + lm;
    }
  } catch { /* no seed */ }

  const viewedYM = targetYear * 12 + targetMonth;
  if (cutoffYM !== null && viewedYM < cutoffYM) return seed;

  let allRecs: AttRecord[] = [];
  try {
    const d = await fetch(`/api/attendance/${emp.id}`).then(r => r.json());
    allRecs = d.records || [];
  } catch { /* empty */ }

  const currentMonthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const historical = allRecs.filter(r => !r.date.startsWith(currentMonthPrefix));
  const allMerged  = [...historical, ...currentMonthRecs];

  let accumulated = seed;

  for (const rec of allMerged) {
    const dateStr = rec.date.substring(0, 10);
    const [ry, rm] = dateStr.split("-").map(Number);
    const recYM = ry * 12 + rm;
    if (cutoffYM !== null && recYM <= cutoffYM) continue;
    if (recYM > viewedYM) continue;

    const calc = rec.time_entries?.length
      ? calcHours(rec.time_entries, expected, lunch)
      : { net: rec.total_work || 0, ot: rec.overtime50 || 0, deficit: rec.delay || 0 };

    accumulated += calc.ot - calc.deficit;
  }

  return accumulated;
}

/** Fetches everything needed to render one employee's espelho PDF for a given month. */
export async function fetchEspelhoPdfData(
  emp: EspelhoEmployee,
  year: number,
  month: number,
  logoDataUrl?: string,
): Promise<any> {
  const allDays = buildDays(year, month);
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
  const expMonthly = expected * allDays.filter(dd => {
    const w = new Date(dd + "T00:00:00").getDay(); return w !== 0 && w !== 6;
  }).length;

  const logo = logoDataUrl !== undefined ? logoDataUrl : await loadLogoDataUrl();

  return {
    emp, year, month, allDays, recordsByDate: rByDate, recordCalcs: rCalcs,
    totals: { work, extra, delay, absences, bank: bankNet, night },
    totalAccumulatedBank: accBank,
    expectedMonthly: expMonthly,
    logoDataUrl: logo,
  };
}

/** Exports (downloads) a single employee's espelho PDF for a given month. */
export async function exportSingleEspelhoPdf(emp: EspelhoEmployee, year: number, month: number): Promise<void> {
  const data = await fetchEspelhoPdfData(emp, year, month);
  const doc = await buildEspelhoPdf(data);
  doc.save(`Espelho_${emp.name.replace(/\s+/g, "_")}_${MONTHS[month - 1]}_${year}.pdf`);
}

/** Exports (downloads) a single multi-page PDF with every employee's espelho for a given month. */
export async function exportAllEspelhosPdf(
  employees: EspelhoEmployee[],
  year: number,
  month: number,
  opts: { pinOnly?: boolean; department?: string } = {},
  onProgress?: (current: number, total: number, label: string) => void,
): Promise<number> {
  const target = opts.pinOnly
    ? employees.filter(e => e.pin_project)
    : opts.department
      ? employees.filter(e => e.departments?.name === opts.department)
      : employees;
  if (!target.length) {
    throw new Error(
      opts.pinOnly ? "Nenhum funcionário com Projeto PIN"
      : opts.department ? `Nenhum funcionário no setor "${opts.department}"`
      : "Nenhum funcionário cadastrado"
    );
  }

  const logoDataUrl = await loadLogoDataUrl();
  const empDataList: any[] = [];

  for (let i = 0; i < target.length; i++) {
    const emp = target[i];
    onProgress?.(i + 1, target.length, emp.name);
    try {
      const data = await fetchEspelhoPdfData(emp, year, month, logoDataUrl);
      empDataList.push(data);
    } catch { /* skip employee on error */ }
  }

  if (!empDataList.length) throw new Error("Nenhum dado disponível");

  const doc = await buildAllEspelhosPdf(empDataList);
  const suffix = opts.pinOnly ? "PIN" : opts.department ? opts.department.replace(/[^a-zA-Z0-9]+/g, "_") : "TODOS";
  doc.save(`Espelho_${suffix}_${MONTHS[month - 1]}_${year}.pdf`);
  return empDataList.length;
}
