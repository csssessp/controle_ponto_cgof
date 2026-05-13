/* ═══════════════════════════════════════════════════════════════════════════
   ChronosAI — Central de Relatórios  |  Enterprise Analytics Dashboard
   ═══════════════════════════════════════════════════════════════════════════ */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  Users, TrendingUp, TrendingDown, AlertTriangle, Clock, FileDown,
  CalendarDays, ChevronLeft, ChevronRight, FileText, Activity,
  BarChart3, PieChart as PieIcon, Filter, Download, Share2,
  Star, StarOff, X, Search, ArrowUpRight, ArrowDownRight,
  Building2, Zap, Shield, RefreshCw, ChevronRight as ChevR,
  CheckCircle2, AlertCircle, Moon, Coffee, BookOpen,
  FileSpreadsheet, FileBarChart, Layers, Eye, Settings,
  Bell, Bookmark, Plus, Hash, SlidersHorizontal, Sparkles,
  Target, Award, Timer, CalendarCheck, UserMinus, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Summary = {
  totalEmployees: number; activeEmployees: number;
  absences: number; certificates: number;
  totalOvertimeMinutes: number; totalDelayMinutes: number;
};
type ChartPoint = { date: string; worked: number; overtime: number; absences: number };
type AbsenceRecord = {
  id: string; date: string; status: string; justification?: string;
  employee_id: string; employees?: { name: string; registration: string };
};

/* ── Constants ─────────────────────────────────────────────────────────────── */
const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const STATUS_META: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  ABSENCE:     { label: "Falta",       color: "text-red-700",    dot: "bg-red-500",    bg: "bg-red-50 border-red-200" },
  CERTIFICATE: { label: "Atestado",    color: "text-amber-700",  dot: "bg-amber-500",  bg: "bg-amber-50 border-amber-200" },
  VACATION:    { label: "Férias",      color: "text-blue-700",   dot: "bg-blue-500",   bg: "bg-blue-50 border-blue-200" },
  HOLIDAY:     { label: "Feriado",     color: "text-purple-700", dot: "bg-purple-500", bg: "bg-purple-50 border-purple-200" },
  OFF_DAY:     { label: "Folga",       color: "text-slate-600",  dot: "bg-slate-400",  bg: "bg-slate-50 border-slate-200" },
  COMPENSATION:{ label: "Compensação", color: "text-cyan-700",   dot: "bg-cyan-500",   bg: "bg-cyan-50 border-cyan-200" },
  NORMAL:      { label: "Regular",     color: "text-emerald-700",dot: "bg-emerald-500",bg: "bg-emerald-50 border-emerald-200" },
};

const CHART_COLORS = ["#2563EB","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316"];

type EmpReport = {
  id: string; name: string; registration: string;
  role_title?: string; departments?: { name: string };
  totalWork: number; overtime: number; delays: number; absences: number;
  accBank?: number; pin_project?: boolean;
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const toHHMM = (min: number) => {
  const a = Math.abs(min);
  return (min < 0 ? "-" : "") + String(Math.floor(a / 60)).padStart(2,"0") + ":" + String(a % 60).padStart(2,"0");
};
const fmtDate = (d: string) => d?.substring(0,10).split("-").reverse().join("/") || d;

/* ── Sparkline mini chart ─────────────────────────────────────────────────── */
function Sparkline({ data, color = "#2563EB", height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80; const pts = data.map((v, i) => [
    (i / Math.max(data.length - 1, 1)) * w,
    height - (v / max) * (height - 4) - 2,
  ]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  return (
    <svg width={w} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      {pts.length > 0 && (
        <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={color} />
      )}
    </svg>
  );
}

/* ── Custom recharts tooltip ──────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-xl text-sm">
      <p className="font-bold text-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}{p.unit || ""}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Report card definition ───────────────────────────────────────────────── */
type ReportDef = {
  id: string; category: string; categoryColor: string;
  title: string; description: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
  status: "available" | "processing" | "soon";
  records?: number; updated?: string;
};

const REPORT_CATALOG: ReportDef[] = [
  // RH
  { id: "rh-absenteeism", category: "RH", categoryColor: "text-red-600 bg-red-50 border-red-100", title: "Absenteísmo", description: "Faltas, atestados e afastamentos no período", icon: UserMinus, iconColor: "text-red-600", iconBg: "bg-red-50 border-red-100", status: "available", updated: "Hoje" },
  { id: "rh-vacation",    category: "RH", categoryColor: "text-blue-600 bg-blue-50 border-blue-100", title: "Férias Programadas", description: "Escala de férias e períodos aquisitivos", icon: CalendarCheck, iconColor: "text-blue-600", iconBg: "bg-blue-50 border-blue-100", status: "available", updated: "Hoje" },
  { id: "rh-productivity",category: "RH", categoryColor: "text-emerald-600 bg-emerald-50 border-emerald-100", title: "Produtividade", description: "Indicadores de desempenho por funcionário", icon: Target, iconColor: "text-emerald-600", iconBg: "bg-emerald-50 border-emerald-100", status: "available", updated: "Hoje" },
  { id: "rh-turnover",    category: "RH", categoryColor: "text-orange-600 bg-orange-50 border-orange-100", title: "Turnover", description: "Admissões, demissões e rotatividade", icon: Users, iconColor: "text-orange-600", iconBg: "bg-orange-50 border-orange-100", status: "soon" },
  // Ponto
  { id: "ponto-espelho",  category: "Ponto", categoryColor: "text-indigo-600 bg-indigo-50 border-indigo-100", title: "Espelho de Ponto", description: "Registro completo de entradas e saídas", icon: Clock, iconColor: "text-indigo-600", iconBg: "bg-indigo-50 border-indigo-100", status: "available", updated: "Hoje" },
  { id: "ponto-banco",    category: "Ponto", categoryColor: "text-purple-600 bg-purple-50 border-purple-100", title: "Banco de Horas", description: "Créditos e débitos acumulados por colaborador", icon: Timer, iconColor: "text-purple-600", iconBg: "bg-purple-50 border-purple-100", status: "available", updated: "Hoje" },
  { id: "ponto-atrasos",  category: "Ponto", categoryColor: "text-amber-600 bg-amber-50 border-amber-100", title: "Relatório de Atrasos", description: "Frequência e total de atrasos por pessoa", icon: AlertTriangle, iconColor: "text-amber-600", iconBg: "bg-amber-50 border-amber-100", status: "available", updated: "Hoje" },
  { id: "ponto-extras",   category: "Ponto", categoryColor: "text-emerald-600 bg-emerald-50 border-emerald-100", title: "Horas Extras", description: "HE 50%, 100% e noturnas consolidadas", icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50 border-emerald-100", status: "available", updated: "Hoje" },
  { id: "ponto-incons",   category: "Ponto", categoryColor: "text-red-600 bg-red-50 border-red-100", title: "Inconsistências", description: "Marcações inválidas ou suspeitas", icon: AlertCircle, iconColor: "text-red-600", iconBg: "bg-red-50 border-red-100", status: "soon" },
  // Gestão
  { id: "gest-ranking",   category: "Gestão", categoryColor: "text-amber-600 bg-amber-50 border-amber-100", title: "Ranking de Produtividade", description: "Top colaboradores por horas e desempenho", icon: Award, iconColor: "text-amber-600", iconBg: "bg-amber-50 border-amber-100", status: "available", updated: "Hoje" },
  { id: "gest-setor",     category: "Gestão", categoryColor: "text-indigo-600 bg-indigo-50 border-indigo-100", title: "Horas por Setor", description: "Distribuição de jornada entre departamentos", icon: Building2, iconColor: "text-indigo-600", iconBg: "bg-indigo-50 border-indigo-100", status: "available", updated: "Hoje" },
  { id: "gest-mensal",    category: "Gestão", categoryColor: "text-blue-600 bg-blue-50 border-blue-100", title: "Indicadores Mensais", description: "KPIs executivos consolidados do mês", icon: BarChart3, iconColor: "text-blue-600", iconBg: "bg-blue-50 border-blue-100", status: "available", updated: "Hoje" },
  // Auditoria
  { id: "aud-alteracoes", category: "Auditoria", categoryColor: "text-slate-600 bg-slate-50 border-slate-100", title: "Log de Alterações", description: "Histórico de edições nos registros de ponto", icon: Shield, iconColor: "text-slate-600", iconBg: "bg-slate-50 border-slate-100", status: "soon" },
  { id: "aud-aprovacoes", category: "Auditoria", categoryColor: "text-slate-600 bg-slate-50 border-slate-100", title: "Aprovações Pendentes", description: "Registros aguardando validação do gestor", icon: CheckCircle2, iconColor: "text-slate-600", iconBg: "bg-slate-50 border-slate-100", status: "soon" },
];

const CATEGORIES = ["Todos", "RH", "Ponto", "Gestão", "Auditoria"];

/* ══════════════════════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════════════════════ */
export default function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [catFilter, setCatFilter] = useState("Todos");
  const [reportSearch, setReportSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [drawerReport, setDrawerReport] = useState<ReportDef | null>(null);
  const [absenceSearch, setAbsenceSearch] = useState("");

  // Per-technician report state
  const [techReports, setTechReports] = useState<EmpReport[]>([]);
  const [techLoading, setTechLoading] = useState(false);
  const [techSearch, setTechSearch] = useState("");
  const [techOnlyProject, setTechOnlyProject] = useState(true); // default: show only PIN project employees

  /* ── API ─────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, absRes] = await Promise.all([
        fetch(`/api/reports/summary?year=${year}&month=${month}`).then(r => r.json()),
        fetch(`/api/reports/absences?year=${year}&month=${month}`).then(r => r.json()),
      ]);
      setSummary(sumRes.summary || null);
      setChartData(sumRes.chartData || []);
      setAbsences(absRes.records || []);
    } catch { toast.error("Erro ao carregar relatórios"); }
    finally { setLoading(false); }
  }, [year, month]);
  useEffect(() => { load(); }, [load]);

  const loadTechData = useCallback(async () => {
    setTechLoading(true);
    try {
      const [empRes, absRes] = await Promise.all([
        fetch("/api/employees"),
        fetch(`/api/reports/absences?year=${year}&month=${month}`),
      ]);
      const { employees } = await empRes.json();
      const { records: absRecords } = await absRes.json();
      const absByEmp: Record<string, number> = {};
      for (const r of (absRecords ?? [])) {
        absByEmp[r.employee_id] = (absByEmp[r.employee_id] ?? 0) + 1;
      }
      const reports: EmpReport[] = await Promise.all(
        (employees ?? []).map(async (emp: any) => {
          try {
            const [attRes, bankRes] = await Promise.all([
              fetch(`/api/attendance/${emp.id}?year=${year}&month=${month}`),
              fetch(`/api/time-bank/${emp.id}`),
            ]);
            const attData = await attRes.json();
            const bankData = await bankRes.json();
            const records: any[] = attData.records ?? [];
            const totalWork = records.reduce((s: number, r: any) => s + (r.total_work ?? 0), 0);
            const overtime = records.reduce((s: number, r: any) => s + (r.overtime50 ?? 0) + (r.overtime100 ?? 0), 0);
            const delays = records.reduce((s: number, r: any) => s + (r.delay ?? 0), 0);
            const seedTotal: number = bankData.totalMinutes ?? 0;
            const bankEntries: any[] = bankData.entries ?? [];
            let bankCutoff: { year: number; month: number } | null = null;
            if (bankEntries.length) {
              const latest = bankEntries.map((e: any) => (e.date ?? "").substring(0, 10)).filter(Boolean).sort().at(-1);
              if (latest) { const [by, bm] = latest.split("-").map(Number); bankCutoff = { year: by, month: bm }; }
            }
            const bankNet = overtime - delays;
            const afterCutoff = !bankCutoff || (year > bankCutoff.year || (year === bankCutoff.year && month >= bankCutoff.month));
            const accBank = (afterCutoff ? seedTotal + bankNet : seedTotal) - (emp.pin_project ? 2400 : 0);
            return {
              id: emp.id, name: emp.name, registration: emp.registration ?? "—",
              role_title: emp.role_title, departments: emp.departments,
              totalWork, overtime, delays, absences: absByEmp[emp.id] ?? 0,
              accBank, pin_project: emp.pin_project,
            };
          } catch {
            return {
              id: emp.id, name: emp.name, registration: emp.registration ?? "—",
              role_title: emp.role_title, departments: emp.departments,
              totalWork: 0, overtime: 0, delays: 0, absences: absByEmp[emp.id] ?? 0,
            };
          }
        })
      );
      setTechReports(reports);
    } catch (e: any) {
      toast.error("Erro ao carregar: " + e.message);
    } finally {
      setTechLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (activeTab === "bytechnician" && techReports.length === 0 && !techLoading) {
      loadTechData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const formattedChart = useMemo(() => chartData.map(p => ({
    ...p,
    day: p.date?.substring(8) || p.date,
    label: p.date ? new Date(p.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : p.date,
    workedH: +(p.worked / 60).toFixed(1),
    overtimeH: +(p.overtime / 60).toFixed(1),
    absencesN: p.absences,
  })), [chartData]);

  const sparkOT  = useMemo(() => formattedChart.map(p => p.overtimeH), [formattedChart]);
  const sparkAbs = useMemo(() => absences.length > 0 ? [absences.length, ...Array(6).fill(0)] : [], [absences]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of absences) counts[a.status] = (counts[a.status] || 0) + 1;
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_META[status]?.label || status, value, status,
    }));
  }, [absences]);

  const filteredReports = useMemo(() =>
    REPORT_CATALOG.filter(r => {
      const matchCat = catFilter === "Todos" || r.category === catFilter;
      const term = reportSearch.trim().toLowerCase();
      const matchSearch = !term || r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term);
      return matchCat && matchSearch;
    }), [catFilter, reportSearch]);

  const filteredAbsences = useMemo(() =>
    absences.filter(a => {
      const term = absenceSearch.trim().toLowerCase();
      return !term || a.employees?.name?.toLowerCase().includes(term) || a.employees?.registration?.toLowerCase().includes(term);
    }), [absences, absenceSearch]);

  /* ── Actions ──────────────────────────────────────────────────────────── */
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y+1); } else setMonth(m => m+1); };
  const toggleFav = (id: string) => setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCSV = () => {
    if (!absences.length) { toast.info("Nenhum dado para exportar"); return; }
    const rows = absences.map(r =>
      `"${r.employees?.name||""}","${r.employees?.registration||""}","${fmtDate(r.date)}","${STATUS_META[r.status]?.label||r.status}","${r.justification||""}"`
    );
    const csv = ["Funcionário,Matrícula,Data,Status,Justificativa", ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-${year}-${String(month).padStart(2,"0")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  /* ── KPI data ─────────────────────────────────────────────────────────── */
  const kpis = summary ? [
    {
      label: "Funcionários Ativos", value: summary.activeEmployees, icon: Users,
      color: "text-blue-600", bg: "bg-blue-50 border-blue-100",
      sub: `de ${summary.totalEmployees} cadastrados`, trend: "neutral" as const,
      spark: [summary.activeEmployees, summary.activeEmployees, summary.activeEmployees],
    },
    {
      label: "Horas Extras", value: toHHMM(summary.totalOvertimeMinutes), icon: TrendingUp,
      color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100",
      sub: "acumulado no mês", trend: summary.totalOvertimeMinutes > 0 ? "up" as const : "neutral" as const,
      spark: sparkOT,
    },
    {
      label: "Total de Faltas", value: summary.absences, icon: AlertTriangle,
      color: "text-red-600", bg: "bg-red-50 border-red-100",
      sub: `${summary.certificates} atestados`, trend: summary.absences > 0 ? "down" as const : "neutral" as const,
      spark: sparkAbs,
    },
    {
      label: "Atrasos Acum.", value: toHHMM(summary.totalDelayMinutes), icon: Clock,
      color: "text-amber-600", bg: "bg-amber-50 border-amber-100",
      sub: "total no mês", trend: summary.totalDelayMinutes > 0 ? "down" as const : "neutral" as const,
      spark: [],
    },
    {
      label: "Produtividade", value: summary.activeEmployees > 0
        ? Math.round(((summary.activeEmployees - summary.absences) / summary.activeEmployees) * 100) + "%"
        : "—",
      icon: Target, color: "text-purple-600", bg: "bg-purple-50 border-purple-100",
      sub: "presença no período", trend: "neutral" as const,
      spark: [],
    },
    {
      label: "Banco de Horas", value: toHHMM(summary.totalOvertimeMinutes - summary.totalDelayMinutes),
      icon: Timer, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100",
      sub: "saldo líquido", trend: "neutral" as const,
      spark: [],
    },
  ] : [];

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex gap-6">
      {/* ── Main pane ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("flex-1 min-w-0 space-y-6 transition-all duration-300", drawerReport && "opacity-40 pointer-events-none")}
      >

        {/* ── Executive header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Início</span><ChevR className="w-3 h-3" /><span className="text-foreground font-medium">Relatórios</span>
            </div>
            <h1 className="text-[28px] font-bold tracking-tight leading-tight">Central de Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Indicadores, exportações e análises inteligentes de jornada
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period selector */}
            <div className="flex items-center bg-card rounded-2xl border border-border/70 p-1 shadow-sm">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <div className="px-3 text-sm font-bold min-w-[150px] text-center flex items-center justify-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span className="capitalize">{MONTHS[month-1]} {year}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="rounded-xl h-10 gap-2 border-border/70 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="rounded-xl h-10 gap-2 border-border/70 text-muted-foreground hover:text-foreground"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!summary}
              className="rounded-xl h-10 gap-2 border-border/70 text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (!summary) return;
                const monthLabel = MONTHS[month - 1];
                const genDate = new Date().toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const absRows = absences.map((r, i) => `
                  <tr class="${i % 2 === 1 ? 'alt' : ''}">
                    <td class="num">${i + 1}</td>
                    <td class="name">${r.employees?.name ?? '—'}</td>
                    <td>${r.employees?.registration ?? '—'}</td>
                    <td>${fmtDate(r.date)}</td>
                    <td><span class="badge badge-${r.status}">${STATUS_META[r.status]?.label ?? r.status}</span></td>
                    <td>${r.justification ?? '—'}</td>
                  </tr>`).join('');
                const win = window.open('', '_blank');
                if (!win) { toast.error('Popup bloqueado. Libere popups para imprimir.'); return; }
                win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Relatório de Faltas — ${monthLabel} ${year}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;color:#111827;background:#fff;font-size:11px;padding:28mm 18mm 20mm}
  .lh{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #0f2044;margin-bottom:16px}
  .lh img{height:64px;object-fit:contain}
  .lh .org h1{font-size:14px;font-weight:800;color:#0f2044}
  .lh .org p{font-size:10px;color:#6b7280;margin-top:2px}
  .lh .ref{text-align:right;font-size:10px;color:#6b7280}
  .lh .ref strong{display:block;font-size:12px;color:#0f2044;font-weight:800}
  .title-row{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:14px}
  .title-row h2{font-size:20px;font-weight:800;color:#0f2044}
  .title-row .period{background:#0f2044;color:#fff;font-size:10px;font-weight:700;padding:5px 14px;border-radius:20px;text-transform:capitalize}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
  .card{border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 14px}
  .card .cl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af}
  .card .cv{font-size:18px;font-weight:800;color:#111827;margin-top:2px}
  .card.blue{border-color:#bfdbfe;background:#eff6ff} .card.blue .cv{color:#1d4ed8}
  .card.red{border-color:#fecaca;background:#fef2f2}  .card.red .cv{color:#dc2626}
  .card.green{border-color:#bbf7d0;background:#f0fdf4}.card.green .cv{color:#15803d}
  .card.amber{border-color:#fde68a;background:#fffbeb}.card.amber .cv{color:#b45309}
  .sec{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
  table{width:100%;border-collapse:collapse;font-size:10.5px}
  thead tr{background:#0f2044}
  thead th{color:#fff;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap}
  tbody tr{border-bottom:1px solid #f3f4f6}
  tbody tr.alt td{background:#f9fafb}
  td{padding:7px 10px;vertical-align:middle}
  td.num{color:#9ca3af;font-size:9px;width:24px}
  td.name{font-weight:600;color:#111827}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
  .badge-ABSENT,.badge-ABSENCE{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
  .badge-CERTIFICATE,.badge-MEDICAL{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
  .badge-JUSTIFIED{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .sig{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig .sl{font-size:9px;color:#9ca3af;margin-bottom:28px}
  .sig .sline{border-top:1.5px solid #374151;margin-bottom:5px}
  .sig .sn{font-size:10px;font-weight:700;color:#111827}
  .sig .sr{font-size:9px;color:#6b7280}
  .footer{margin-top:20px;display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af}
  @media print{@page{size:A4 portrait;margin:14mm 12mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead{display:table-header-group}tr{page-break-inside:avoid}}
</style></head><body>
  <div class="lh">
    <div style="display:flex;align-items:center;gap:16px">
      <img src="/img/logo.png" alt="Logo"/>
      <div class="org"><h1>Coordenadoria de Gestão Orçamentária e Financeira</h1><p>Secretaria de Estado da Saúde de São Paulo — CGOF</p><p>Relatório de Controle de Frequência</p></div>
    </div>
    <div class="ref"><strong>REL-FALTAS-${year}${String(month).padStart(2,'0')}</strong><div>Gerado: ${genDate}</div></div>
  </div>
  <div class="title-row"><h2>Relatório de Faltas e Ocorrências</h2><div class="period">${monthLabel} ${year}</div></div>
  <div class="cards">
    <div class="card blue"><div class="cl">Funcionários</div><div class="cv">${summary.activeEmployees}</div></div>
    <div class="card red"><div class="cl">Total Faltas</div><div class="cv">${summary.absences}</div></div>
    <div class="card blue"><div class="cl">Atestados</div><div class="cv">${summary.certificates}</div></div>
    <div class="card amber"><div class="cl">Atrasos</div><div class="cv">${toHHMM(summary.totalDelayMinutes)}</div></div>
  </div>
  <div class="sec">Detalhamento de Ocorrências</div>
  <table><thead><tr><th>#</th><th>Funcionário</th><th>Matrícula</th><th>Data</th><th>Tipo</th><th>Justificativa</th></tr></thead>
  <tbody>${absRows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">Nenhuma ocorrência no período</td></tr>'}</tbody></table>
  <div class="sig">
    <div><div class="sl">Responsável pela elaboração</div><div class="sline"></div><div class="sn">_______________________________</div><div class="sr">Nome / Matrícula — CGOF</div></div>
    <div><div class="sl">Visto da Chefia Imediata</div><div class="sline"></div><div class="sn">_______________________________</div><div class="sr">Coordenador(a) CGOF</div></div>
  </div>
  <div class="footer"><span>CGOF — Coordenadoria de Gestão Orçamentária e Financeira</span><span>Período: ${monthLabel} ${year} | ${absences.length} ocorrência(s)</span></div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
                win.document.close();
              }}
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button size="sm" className="rounded-xl h-10 gap-2 shadow-md shadow-primary/20">
              <Plus className="w-3.5 h-3.5" /> Novo Relatório
            </Button>
          </div>
        </div>

        {/* ── AI Insight banner ─────────────────────────────────────────── */}
        {!loading && summary && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] border border-indigo-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50 p-4 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-indigo-900">
                Resumo Inteligente — {MONTHS[month-1]} {year}
              </p>
              <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                {summary.activeEmployees} funcionários ativos·{" "}
                {summary.absences} falta{summary.absences !== 1 ? "s" : ""} registrada{summary.absences !== 1 ? "s" : ""}·{" "}
                {toHHMM(summary.totalOvertimeMinutes)} de horas extras acumuladas·{" "}
                Presença estimada em{" "}
                <strong>
                  {summary.activeEmployees > 0
                    ? Math.round(((summary.activeEmployees - summary.absences) / summary.activeEmployees) * 100)
                    : 100}%
                </strong>.{" "}
                {summary.totalDelayMinutes > 0 &&
                  `Total de atrasos: ${toHHMM(summary.totalDelayMinutes)}.`}
              </p>
            </div>
            <Badge className="shrink-0 bg-indigo-100 text-indigo-700 border-indigo-200 rounded-full text-[10px] px-2">
              IA
            </Badge>
          </motion.div>
        )}

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-[20px] bg-muted animate-pulse" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis.map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="rounded-[20px] border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group cursor-default">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", k.bg)}>
                        <k.icon className={cn("w-4 h-4", k.color)} />
                      </div>
                      {k.trend === "up" && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />}
                      {k.trend === "down" && <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <div className="text-xl font-bold tracking-tight font-mono leading-tight">{k.value}</div>
                    <div className="text-[11px] font-semibold text-foreground mt-0.5 leading-tight">{k.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</div>
                    {k.spark.length > 1 && (
                      <div className="mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Sparkline data={k.spark} color={k.color.replace("text-","#").replace("-600","")} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : null}

        {/* ── Main tab area ─────────────────────────────────────────────── */}
        <div>
          {/* Tab bar */}
          <div className="flex bg-muted/50 rounded-2xl p-1 gap-0.5 border border-border w-fit">
            {[
              { v: "dashboard", label: "Dashboard",    icon: BarChart3 },
              { v: "catalog",   label: "Catálogo",     icon: Layers },
              { v: "absences",  label: "Faltas",       icon: AlertTriangle },
              { v: "overtime",  label: "Horas Extras", icon: TrendingUp },
              { v: "bytechnician", label: "Projeto", icon: Users },
            ].map(t => (
              <button
                key={t.v}
                onClick={() => setActiveTab(t.v)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  activeTab === t.v
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── DASHBOARD TAB ─────────────────────────────────────────── */}
          {activeTab === "dashboard" && <div className="mt-6 space-y-6">
            {/* Row 1: Bar + Area charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Horas trabalhadas + extras */}
              <Card className="rounded-[24px] border-border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Horas Trabalhadas vs. Extras</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Acumulado diário — {MONTHS[month-1]} {year}</CardDescription>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />Trabalhadas</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />Extras</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {formattedChart.length === 0 ? (
                    <EmptyChart label="Nenhum registro no período" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={formattedChart} margin={{ left: 0, right: 4, top: 4, bottom: 0 }} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="transparent" />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit="h" stroke="transparent" width={28} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="workedH" name="Trabalhadas" fill="#2563EB" radius={[4,4,0,0]} maxBarSize={18} />
                        <Bar dataKey="overtimeH" name="Extras" fill="#10b981" radius={[4,4,0,0]} maxBarSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Tendência de extras (area) */}
              <Card className="rounded-[24px] border-border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Tendência de Horas Extras</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Evolução ao longo do mês</CardDescription>
                    </div>
                    {summary && summary.totalOvertimeMinutes > 0 && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full text-[10px] px-2">
                        ↑ {toHHMM(summary.totalOvertimeMinutes)} total
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {formattedChart.length === 0 ? (
                    <EmptyChart label="Nenhum dado disponível" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={formattedChart} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradOT" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="transparent" />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit="h" stroke="transparent" width={28} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="overtimeH" name="Extras" stroke="#10b981" fill="url(#gradOT)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "#10b981" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Donut + Line (absences trend) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Donut — status distribution */}
              <Card className="rounded-[24px] border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold">Distribuição por Status</CardTitle>
                  <CardDescription className="text-xs">Composição das ocorrências do mês</CardDescription>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <EmptyChart label="Nenhuma ocorrência registrada" />
                  ) : (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 flex-1">
                        {pieData.map((p, i) => (
                          <div key={p.status} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="text-xs text-muted-foreground">{p.name}</span>
                            </div>
                            <span className="text-xs font-bold text-foreground">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Absences line */}
              <Card className="rounded-[24px] border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold">Faltas por Dia</CardTitle>
                  <CardDescription className="text-xs">Volume diário de ausências registradas</CardDescription>
                </CardHeader>
                <CardContent>
                  {formattedChart.length === 0 ? (
                    <EmptyChart label="Nenhum dado disponível" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={formattedChart} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradAbs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="transparent" />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="transparent" width={24} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="absencesN" name="Faltas" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#ef4444" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>}

          {/* ── CATALOG TAB ────────────────────────────────────────────── */}
          {activeTab === "catalog" && <div className="mt-6 space-y-5">
            {/* Filter bar */}
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                  placeholder="Buscar relatório..."
                  className="pl-9 h-10 rounded-xl bg-card border-border/70"
                />
              </div>
              <div className="flex bg-muted/60 rounded-xl p-1 gap-0.5 border border-border/50">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCatFilter(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                      catFilter === c ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >{c}</button>
                ))}
              </div>
              {favorites.size > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  {favorites.size} favorito{favorites.size !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Report cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredReports.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    className={cn(
                      "rounded-[20px] border-border shadow-sm transition-all group cursor-pointer",
                      r.status === "soon" ? "opacity-60" : "hover:shadow-md hover:-translate-y-0.5"
                    )}
                    onClick={() => r.status !== "soon" && setDrawerReport(r)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn("w-11 h-11 rounded-2xl border flex items-center justify-center", r.iconBg)}>
                          <r.icon className={cn("w-5 h-5", r.iconColor)} />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); toggleFav(r.id); }}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-amber-500 transition-colors"
                          >
                            {favorites.has(r.id)
                              ? <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              : <StarOff className="w-3.5 h-3.5" />
                            }
                          </button>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", r.categoryColor)}>
                            {r.category}
                          </span>
                        </div>
                      </div>

                      <p className="font-bold text-sm text-foreground leading-tight">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.description}</p>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                        {r.status === "soon" ? (
                          <Badge className="bg-muted text-muted-foreground border-border rounded-full text-[10px] px-2">Em breve</Badge>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Atualizado {r.updated}
                          </div>
                        )}
                        {r.status !== "soon" && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => e.stopPropagation()} className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); exportCSV(); }} className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>}

          {/* ── ABSENCES TAB ────────────────────────────────────────────── */}
          {activeTab === "absences" && <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={absenceSearch}
                  onChange={e => setAbsenceSearch(e.target.value)}
                  placeholder="Buscar funcionário..."
                  className="pl-9 h-10 rounded-xl bg-card border-border/70"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border/50">
                  {filteredAbsences.length} registro{filteredAbsences.length !== 1 ? "s" : ""}
                </span>
                <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl h-10 gap-2 border-border/70 text-muted-foreground hover:text-foreground">
                  <FileDown className="w-3.5 h-3.5" /> Exportar CSV
                </Button>
              </div>
            </div>

            <Card className="rounded-[24px] border-border shadow-sm overflow-hidden">
              <div className="bg-[#F8FAFC] border-b border-border px-6 py-3 grid grid-cols-[1fr_120px_100px_100px_1fr] gap-4">
                {["Funcionário","Data","Status","Matrícula","Justificativa"].map(h => (
                  <span key={h} className="text-[10px] uppercase tracking-[0.08em] font-bold text-slate-400">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-border/50">
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 grid grid-cols-[1fr_120px_100px_100px_1fr] gap-4 items-center">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="h-3 rounded-full bg-muted animate-pulse" />
                    ))}
                  </div>
                ))}
                {!loading && filteredAbsences.length === 0 && (
                  <div className="py-16 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-foreground text-sm">Nenhuma falta registrada</p>
                    <p className="text-xs text-muted-foreground mt-1">Ótimo índice de presença neste período!</p>
                  </div>
                )}
                {!loading && filteredAbsences.map((a, i) => {
                  const meta = STATUS_META[a.status];
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-6 py-3.5 grid grid-cols-[1fr_120px_100px_100px_1fr] gap-4 items-center hover:bg-[#F8FAFC] transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                          {a.employees?.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "??"}
                        </div>
                        <span className="text-sm font-semibold text-foreground truncate">{a.employees?.name || "—"}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{fmtDate(a.date)}</span>
                      <div>
                        {meta ? (
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border", meta.bg, meta.color)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
                            {meta.label}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">{a.status}</span>}
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{a.employees?.registration || "—"}</span>
                      <span className="text-xs text-muted-foreground truncate">{a.justification || "—"}</span>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </div>}

          {/* ── OVERTIME TAB ────────────────────────────────────────────── */}
          {activeTab === "overtime" && <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="rounded-[24px] border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold">Horas Extras Diárias</CardTitle>
                  <CardDescription className="text-xs">Total de HE 50% + HE 100% por dia</CardDescription>
                </CardHeader>
                <CardContent>
                  {formattedChart.length === 0 ? (
                    <EmptyChart label="Nenhum dado disponível" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={formattedChart} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="transparent" />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit="h" stroke="transparent" width={28} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="overtimeH" name="Extras (h)" fill="#10b981" radius={[6,6,0,0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold">Acumulado de Extras</CardTitle>
                  <CardDescription className="text-xs">Soma acumulada ao longo do mês</CardDescription>
                </CardHeader>
                <CardContent>
                  {formattedChart.length === 0 ? (
                    <EmptyChart label="Nenhum dado disponível" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart
                        data={formattedChart.reduce((acc: any[], p, i) => {
                          const prev = acc[i - 1]?.cumul || 0;
                          return [...acc, { ...p, cumul: +(prev + p.overtimeH).toFixed(1) }];
                        }, [])}
                        margin={{ left: 0, right: 4, top: 4, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="gradCumul" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="transparent" />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit="h" stroke="transparent" width={28} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="cumul" name="Acumulado (h)" stroke="#2563EB" fill="url(#gradCumul)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#2563EB" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary table */}
            <Card className="rounded-[24px] border-border shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">Resumo Executivo</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl h-9 gap-2 border-border/70 text-xs">
                    <FileDown className="w-3.5 h-3.5" /> Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {summary ? (
                  <div className="divide-y divide-border/50">
                    {[
                      { label: "Total de funcionários", value: summary.totalEmployees, icon: Users, color: "text-blue-600" },
                      { label: "Funcionários ativos", value: summary.activeEmployees, icon: UserCheck, color: "text-emerald-600" },
                      { label: "Faltas no período", value: summary.absences, icon: UserMinus, color: "text-red-600" },
                      { label: "Atestados", value: summary.certificates, icon: FileText, color: "text-amber-600" },
                      { label: "Total horas extras (HH:MM)", value: toHHMM(summary.totalOvertimeMinutes), icon: TrendingUp, color: "text-emerald-600" },
                      { label: "Total atrasos (HH:MM)", value: toHHMM(summary.totalDelayMinutes), icon: AlertTriangle, color: "text-amber-600" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F8FAFC] transition-colors">
                        <div className="flex items-center gap-3">
                          <row.icon className={cn("w-4 h-4 shrink-0", row.color)} />
                          <span className="text-sm text-muted-foreground">{row.label}</span>
                        </div>
                        <span className="font-bold text-sm font-mono text-foreground">{row.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">Sem dados no período</div>
                )}
              </CardContent>
            </Card>
          </div>}

          {/* ── PROJETO TAB ───────────────────────────────────────── */}
          {activeTab === "bytechnician" && <div className="mt-6 space-y-5">
            <Card className="rounded-[20px] border-border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                        <CardTitle className="text-base font-bold">Relatório PIN Projeto</CardTitle>
                    <CardDescription className="capitalize mt-0.5">{MONTHS[month-1]} {year} — Funcionários do Projeto PIN</CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                      <input
                        type="text"
                        placeholder="Buscar funcionário..."
                        value={techSearch}
                        onChange={e => setTechSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-44"
                      />
                    </div>
                    {/* Project-only toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={techOnlyProject}
                        onChange={e => setTechOnlyProject(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary"
                      />
                      Apenas PIN Projeto
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2 text-xs"
                      disabled={techLoading}
                      onClick={loadTechData}
                    >
                      {techLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Atualizar
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl gap-2 text-xs"
                      disabled={techReports.length === 0}
                      onClick={() => {
                        const visible = techReports
                          .filter(r => (!techOnlyProject || r.pin_project) && (!techSearch || r.name.toLowerCase().includes(techSearch.toLowerCase())));
                        const monthLabel = MONTHS[month - 1];
                        const genDate = new Date().toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const totalHrs  = visible.reduce((s, r) => s + r.totalWork, 0);
                        const totalOt   = visible.reduce((s, r) => s + r.overtime, 0);
                        const totalAbs  = visible.reduce((s, r) => s + r.absences, 0);
                        const totalDef  = visible.reduce((s, r) => s + r.delays, 0);

                        const rows = visible.map((r, idx) => `
                          <tr class="${idx % 2 === 1 ? 'alt' : ''}">
                            <td class="num">${idx + 1}</td>
                            <td class="name">${r.name}${r.pin_project ? ' <span style="font-size:9px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:99px;padding:1px 6px;font-weight:700;vertical-align:middle;">PIN</span>' : ''}</td>
                            <td class="small">${r.role_title ?? "—"}</td>
                            <td>${r.departments?.name ?? "—"}</td>
                            <td class="mono">${toHHMM(r.totalWork)}</td>
                            <td class="mono ot">${r.overtime > 0 ? "+" + toHHMM(r.overtime) : "—"}</td>
                            <td class="mono ${r.accBank !== undefined && r.accBank >= 0 ? 'ot' : 'red'}">${r.accBank !== undefined ? ((r.accBank >= 0 ? "+" : "") + toHHMM(r.accBank)) : "—"}</td>
                            <td class="mono ${r.delays > 0 ? 'red' : 'ok-val'}">${r.delays > 0 ? toHHMM(r.delays) : "—"}</td>
                            <td class="center ${r.absences > 0 ? 'abs-val' : 'ok-val'}">${r.absences > 0 ? r.absences : "✓"}</td>
                          </tr>
                        `).join("");

                        const win = window.open("", "_blank");
                        if (!win) { toast.error("Popup bloqueado. Libere popups para imprimir."); return; }
                        win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Relatório PIN Projeto — ${monthLabel} ${year}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',Arial,sans-serif; color:#111827; background:#fff; font-size:11px; }

    /* ── Page layout ── */
    .page { padding: 28mm 18mm 20mm 18mm; min-height: 100vh; }

    /* ── Letterhead ── */
    .letterhead { display:flex; align-items:center; justify-content:space-between; padding-bottom:14px; border-bottom:3px solid #0f2044; margin-bottom:6px; }
    .letterhead-logo { display:flex; align-items:center; gap:16px; }
    .letterhead-logo img { height:72px; object-fit:contain; }
    .org-info h1 { font-size:14px; font-weight:800; color:#0f2044; letter-spacing:-.3px; }
    .org-info p  { font-size:10px; color:#6b7280; margin-top:2px; }
    .doc-ref { text-align:right; }
    .doc-ref .doc-num { font-size:11px; font-weight:700; color:#0f2044; }
    .doc-ref .doc-sub { font-size:9px; color:#9ca3af; margin-top:2px; }

    /* ── Title block ── */
    .title-block { margin:16px 0 14px; display:flex; align-items:flex-end; justify-content:space-between; }
    .report-title { font-size:18px; font-weight:800; color:#0f2044; letter-spacing:-.5px; }
    .report-subtitle { font-size:11px; color:#6b7280; margin-top:3px; }
    .period-badge { background:#1e40af; color:#fff; font-size:10px; font-weight:700; padding:5px 14px; border-radius:20px; text-transform:capitalize; letter-spacing:.03em; }

    /* ── Summary cards ── */
    .summary-row { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:18px; }
    .summary-card { border:1.5px solid #e5e7eb; border-radius:10px; padding:10px 14px; }
    .summary-card .s-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#9ca3af; }
    .summary-card .s-val   { font-size:16px; font-weight:800; color:#111827; margin-top:2px; font-variant-numeric:tabular-nums; }
    .summary-card .s-sub   { font-size:9px; color:#9ca3af; margin-top:1px; }
    .card-blue   { border-color:#bfdbfe; background:#eff6ff; } .card-blue   .s-val { color:#1d4ed8; }
    .card-green  { border-color:#bbf7d0; background:#f0fdf4; } .card-green  .s-val { color:#15803d; }
    .card-red    { border-color:#fecaca; background:#fef2f2; } .card-red    .s-val { color:#dc2626; }
    .card-amber  { border-color:#fde68a; background:#fffbeb; } .card-amber  .s-val { color:#b45309; }

    /* ── Table ── */
    table { width:100%; border-collapse:collapse; font-size:10.5px; }
    thead tr { background:#0f2044; }
    thead th { color:#fff; padding:8px 10px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; white-space:nowrap; }
    thead th.center { text-align:center; }
    tbody tr { border-bottom:1px solid #f3f4f6; }
    tbody tr.alt td { background:#f9fafb; }
    tbody td { padding:7px 10px; vertical-align:middle; }
    td.num   { color:#9ca3af; font-size:9px; font-weight:600; width:24px; }
    td.name  { font-weight:600; color:#111827; }
    td.small { color:#6b7280; font-size:10px; }
    td.mono  { font-family:'Courier New',monospace; font-size:10.5px; }
    td.ot    { color:#15803d; font-weight:600; }
    td.red   { color:#dc2626; font-weight:600; }
    td.center { text-align:center; }
    td.abs-val { color:#dc2626; font-weight:700; }
    td.ok-val  { color:#15803d; font-weight:700; }

    /* ── Section title ── */
    .section-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#6b7280; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #e5e7eb; }

    /* ── Signature block ── */
    .sig-section { margin-top:36px; display:grid; grid-template-columns:1fr 1fr; gap:40px; }
    .sig-line { border-top:1.5px solid #374151; margin-bottom:6px; }
    .sig-name { font-size:10px; font-weight:700; color:#111827; }
    .sig-role { font-size:9px; color:#6b7280; }
    .sig-label { font-size:9px; color:#9ca3af; margin-bottom:30px; }

    /* ── Footer ── */
    .doc-footer { margin-top:20px; display:flex; align-items:center; justify-content:space-between; padding-top:10px; border-top:1px solid #e5e7eb; }
    .doc-footer .fl { font-size:9px; color:#9ca3af; }
    .doc-footer .fr { font-size:9px; color:#9ca3af; text-align:right; }

    @media print {
      @page { size:A4 landscape; margin:14mm 12mm 14mm 12mm; }
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      thead { display:table-header-group; }
      tr { page-break-inside:avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Letterhead -->
  <div class="letterhead">
    <div class="letterhead-logo">
      <img src="/img/logo.png" alt="Logo CGOF" />
      <div class="org-info">
        <h1>Centro de Gestão de Operações e Finanças</h1>
        <p>Secretaria de Estado da Saúde de São Paulo — CGOF</p>
        <p>Controle de Frequência de Servidores — Projeto PIN</p>
      </div>
    </div>
    <div class="doc-ref">
      <div class="doc-num">REL-PIN-${year}${String(month).padStart(2,'0')}</div>
      <div class="doc-sub">Documento Oficial</div>
      <div class="doc-sub" style="margin-top:4px">Gerado: ${genDate}</div>
    </div>
  </div>

  <!-- Title -->
  <div class="title-block">
    <div>
      <div class="report-title">Relatório Mensal — Projeto PIN</div>
      <div class="report-subtitle">Horas Trabalhadas, Extras, Banco de Horas, Déficit e Faltas</div>
    </div>
    <div class="period-badge">${monthLabel} ${year}</div>
  </div>

  <!-- Summary cards -->
  <div class="summary-row">
    <div class="summary-card card-blue">
      <div class="s-label">Servidores PIN</div>
      <div class="s-val">${visible.length}</div>
      <div class="s-sub">no projeto</div>
    </div>
    <div class="summary-card card-green">
      <div class="s-label">H. Trabalhadas</div>
      <div class="s-val">${toHHMM(totalHrs)}</div>
      <div class="s-sub">total no mês</div>
    </div>
    <div class="summary-card card-green">
      <div class="s-label">H. Extras Acumuladas</div>
      <div class="s-val">${toHHMM(totalOt)}</div>
      <div class="s-sub">total no mês</div>
    </div>
    <div class="summary-card card-red">
      <div class="s-label">Déficit / A compensar</div>
      <div class="s-val">${toHHMM(totalDef)}</div>
      <div class="s-sub">total no mês</div>
    </div>
    <div class="summary-card card-amber">
      <div class="s-label">Faltas</div>
      <div class="s-val">${totalAbs}</div>
      <div class="s-sub">total no mês</div>
    </div>
  </div>

  <!-- Table -->
  <div class="section-title">Detalhamento por Servidor</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nome do Servidor</th>
        <th>Cargo</th>
        <th>Setor</th>
        <th>H. Trabalhadas</th>
        <th>H. Extras (mês)</th>
        <th>Banco Acumulado</th>
        <th>Déficit / A compensar</th>
        <th class="center">Faltas</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- Signature block -->
  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-label">Responsável pela elaboração</div>
      <div class="sig-line"></div>
      <div class="sig-name">_________________________________</div>
      <div class="sig-role">Nome / Matrícula</div>
      <div class="sig-role">Gestão de Frequência — CGOF</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Visto da Chefia Imediata</div>
      <div class="sig-line"></div>
      <div class="sig-name">_________________________________</div>
      <div class="sig-role">Nome / Matrícula</div>
      <div class="sig-role">Coordenador(a) CGOF</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    <div class="fl">CGOF — Centro de Gestão de Operações e Finanças &nbsp;|&nbsp; Secretaria de Estado da Saúde / SP</div>
    <div class="fr">Período de referência: <strong>${monthLabel} ${year}</strong> &nbsp;|&nbsp; ${visible.length} servidor(es)</div>
  </div>

</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
                        win.document.close();
                      }}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Imprimir Relatório
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {techLoading && (
                  <div className="py-16 flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Carregando dados...</p>
                  </div>
                )}
                {!techLoading && techReports.length === 0 && (
                  <div className="py-16 flex flex-col items-center gap-3 text-center">
                    <Users className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Aguarde enquanto os dados são carregados...</p>
                  </div>
                )}
                {!techLoading && techReports.length > 0 && (() => {
                  const visible = techReports
                    .filter(r => (!techOnlyProject || r.pin_project) && (!techSearch || r.name.toLowerCase().includes(techSearch.toLowerCase())));
                  return (
                    <div className="overflow-x-auto">
                      {/* Summary row */}
                      <div className="flex items-center gap-4 px-5 py-3 bg-muted/20 border-b border-border text-xs text-muted-foreground">
                        <span><strong className="text-foreground">{visible.length}</strong> servidor(es)</span>
                        <span>·</span>
                        <span>H. Trabalhadas: <strong className="text-foreground font-mono">{toHHMM(visible.reduce((s,r)=>s+r.totalWork,0))}</strong></span>
                        <span>·</span>
                        <span>H. Extras: <strong className="text-emerald-600 font-mono">{toHHMM(visible.reduce((s,r)=>s+r.overtime,0))}</strong></span>
                        <span>·</span>
                        <span>Atrasos: <strong className="text-amber-600 font-mono">{toHHMM(visible.reduce((s,r)=>s+r.delays,0))}</strong></span>
                        <span>·</span>
                        <span>Faltas: <strong className="text-red-600">{visible.reduce((s,r)=>s+r.absences,0)}</strong></span>
                        <span className="ml-auto">
                          <button
                            onClick={() => {
                              const header = ["Nome","Cargo","Setor","H.Trabalhadas","H.Extras (mês)","Banco Acumulado","Déficit/A compensar","Faltas","PIN Projeto"];
                              const csvRows = visible.map(r => [
                                r.name, r.role_title ?? "", r.departments?.name ?? "",
                                toHHMM(r.totalWork), toHHMM(r.overtime),
                                r.accBank !== undefined ? toHHMM(r.accBank) : "",
                                toHHMM(r.delays),
                                r.absences, r.pin_project ? "Sim" : "Não",
                              ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
                              const csv = [header.join(","), ...csvRows].join("\n");
                              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url; a.download = `relatorio-projeto-${year}${String(month).padStart(2,"0")}.csv`;
                              a.click(); URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                          >
                            <FileDown className="w-3 h-3" /> Exportar CSV
                          </button>
                        </span>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            {["#", "Nome", "Cargo", "Setor", "H. Trabalhadas", "H. Extras (mês)", "Banco Acumulado", "Déficit / A compensar", "Faltas"].map(h => (
                              <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((r, i) => (
                            <tr key={r.id} className={cn("hover:bg-muted/20 transition-colors", i > 0 && "border-t border-border/50")}>
                              <td className="px-5 py-3 text-[10px] font-semibold text-muted-foreground">{i + 1}</td>
                              <td className="px-5 py-3 font-semibold text-foreground whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {r.name}
                                  {r.pin_project && (
                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full leading-none">PIN</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-xs text-muted-foreground">{r.role_title ?? "—"}</td>
                              <td className="px-5 py-3 text-xs text-muted-foreground">{r.departments?.name ?? "—"}</td>
                              <td className="px-5 py-3 font-mono text-xs">{toHHMM(r.totalWork)}</td>
                              <td className="px-5 py-3 font-mono text-xs text-emerald-600">{r.overtime > 0 ? `+${toHHMM(r.overtime)}` : "—"}</td>
                              <td className={cn("px-5 py-3 font-mono text-xs font-semibold", r.accBank !== undefined ? (r.accBank >= 0 ? "text-emerald-600" : "text-red-600") : "text-muted-foreground")}>
                                {r.accBank !== undefined ? ((r.accBank >= 0 ? "+" : "") + toHHMM(r.accBank)) : "—"}
                              </td>
                              <td className="px-5 py-3 font-mono text-xs text-red-500">{r.delays > 0 ? toHHMM(r.delays) : "—"}</td>
                              <td className="px-5 py-3 text-center">
                                <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold", r.absences > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                                  {r.absences}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {visible.length === 0 && (
                            <tr>
                              <td colSpan={9} className="px-5 py-10 text-center text-sm text-muted-foreground">
                                Nenhum funcionário encontrado com os filtros aplicados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>}

        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          Report Detail Drawer
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {drawerReport && (
          <motion.div
            key="rpt-drawer"
            initial={{ x: 440, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 440, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="w-[400px] shrink-0 bg-card border border-border rounded-[28px] shadow-2xl shadow-black/10 flex flex-col sticky top-6 max-h-[calc(100vh-5rem)] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border bg-gradient-to-br from-slate-50 to-white flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={cn("w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0", drawerReport.iconBg)}>
                  <drawerReport.icon className={cn("w-5 h-5", drawerReport.iconColor)} />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm leading-tight">{drawerReport.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{drawerReport.description}</p>
                  <span className={cn("inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border", drawerReport.categoryColor)}>
                    {drawerReport.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDrawerReport(null)}
                className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Period info */}
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Período Selecionado</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">{MONTHS[month-1]} {year}</p>
                </div>
              </div>

              {/* Quick stats */}
              {summary && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Funcionários", value: summary.activeEmployees, icon: Users },
                    { label: "Faltas", value: summary.absences, icon: AlertTriangle },
                    { label: "H. Extras", value: toHHMM(summary.totalOvertimeMinutes), icon: TrendingUp },
                    { label: "Atrasos", value: toHHMM(summary.totalDelayMinutes), icon: Clock },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl border border-border p-3 flex items-center gap-2 bg-muted/20">
                      <s.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{s.label}</p>
                        <p className="text-sm font-bold text-foreground font-mono">{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* Export actions */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Exportar Relatório</p>
                <button
                  onClick={() => { exportCSV(); toast.success("Exportando CSV…"); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Exportar CSV</p>
                    <p className="text-[11px] text-muted-foreground">Compatível com Excel</p>
                  </div>
                  <ChevR className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground ml-auto transition-colors" />
                </button>
                <button
                  onClick={() => toast.info("Exportação PDF disponível em breve")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <FileBarChart className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Exportar PDF</p>
                    <p className="text-[11px] text-muted-foreground">Relatório formatado</p>
                  </div>
                  <Badge className="ml-auto bg-muted text-muted-foreground border-border rounded-full text-[9px] px-1.5 shrink-0">Em breve</Badge>
                </button>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ações</p>
                {[
                  { icon: Star, label: "Adicionar aos favoritos", action: () => toggleFav(drawerReport.id) },
                  { icon: Share2, label: "Compartilhar relatório", action: () => toast.info("Em breve") },
                  { icon: Bell, label: "Agendar envio automático", action: () => toast.info("Em breve") },
                ].map((a, i) => (
                  <button
                    key={i}
                    onClick={a.action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-muted/30 transition-colors text-left text-sm text-muted-foreground hover:text-foreground"
                  >
                    <a.icon className="w-4 h-4 shrink-0" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="p-5 border-t border-border bg-muted/20">
              <Button
                className="w-full rounded-2xl h-11 gap-2 shadow-md shadow-primary/20"
                onClick={() => { setActiveTab("absences"); setDrawerReport(null); }}
              >
                <Eye className="w-4 h-4" /> Visualizar Dados
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Empty chart placeholder ─────────────────────────────────────────────── */
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted/20 border border-dashed border-border">
      <BarChart3 className="w-8 h-8 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
