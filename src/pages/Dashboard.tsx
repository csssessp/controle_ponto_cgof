/* ═══════════════════════════════════════════════════════════════════════════
   ChronosAI — Dashboard  |  Real-time analytics & workforce overview
   ═══════════════════════════════════════════════════════════════════════════ */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Users, Clock, TrendingUp, CheckCircle2, XCircle,
  Building2, Briefcase, RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle, BarChart3, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Emp = {
  id: string; name: string; registration: string; status?: string;
  pin_project?: boolean;
  departments?: { name: string };
  schedules?: { name: string; expected_work: number; lunch_minutes?: number };
};
type AttRec = {
  id: string; date: string; status: string; total_work: number;
  employee_id: string;
  time_entries: Array<{ time: string; type: string }>;
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function toHHMM(min: number) {
  const a = Math.abs(min);
  return (min < 0 ? "-" : "") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
}
function parseTime(t: string) { return t.includes("T") ? t.split("T")[1].substring(0, 5) : t.substring(0, 5); }
function timeToMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

function calcNetMinutes(entries: Array<{ time: string; type: string }>, lunch: number): number {
  const sorted = [...entries].sort((a, b) => parseTime(a.time).localeCompare(parseTime(b.time)));
  let raw = 0, pairs = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    if (sorted[i]?.type === "IN" && sorted[i + 1]?.type === "OUT") {
      raw += timeToMin(parseTime(sorted[i + 1].time)) - timeToMin(parseTime(sorted[i].time));
      pairs++;
    }
  }
  return pairs === 1 && lunch > 0 ? Math.max(0, raw - lunch) : raw;
}

function workingDaysInMonth(year: number, month: number): number {
  let count = 0;
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) { if (d.getDay() !== 0 && d.getDay() !== 6) count++; d.setDate(d.getDate() + 1); }
  return count;
}
function workingDaysSoFar(year: number, month: number): number {
  const today = new Date();
  const limit = (today.getFullYear() === year && today.getMonth() + 1 === month) ? today.getDate() : new Date(year, month, 0).getDate();
  let count = 0;
  const d = new Date(year, month - 1, 1);
  while (d.getDate() <= limit && d.getMonth() === month - 1) { if (d.getDay() !== 0 && d.getDay() !== 6) count++; d.setDate(d.getDate() + 1); }
  return count;
}
function calendarDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
function calendarDaysSoFar(year: number, month: number): number {
  const today = new Date();
  if (today.getFullYear() === year && today.getMonth() + 1 === month) return today.getDate();
  return new Date(year, month, 0).getDate();
}

const ini = (n: string) => n.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
const AVATAR_COLORS = [
  "from-blue-500 to-blue-600","from-indigo-500 to-indigo-600","from-purple-500 to-purple-600",
  "from-emerald-500 to-emerald-600","from-amber-500 to-amber-600","from-pink-500 to-pink-600",
  "from-sky-500 to-sky-600","from-teal-500 to-teal-600",
];
const avatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

const STATUS_COLORS: Record<string, string> = {
  NORMAL:"#10b981", ABSENCE:"#ef4444", VACATION:"#3b82f6",
  HOLIDAY:"#8b5cf6", CERTIFICATE:"#f59e0b", OFF_DAY:"#94a3b8", COMPENSATION:"#06b6d4",
};
const STATUS_LABELS: Record<string, string> = {
  NORMAL:"Normal", ABSENCE:"Falta", VACATION:"Férias",
  HOLIDAY:"Feriado", CERTIFICATE:"Atestado", OFF_DAY:"Folga", COMPENSATION:"Compensação",
};

/* ══════════════════════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [attendance, setAttendance] = useState<AttRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [er, ar] = await Promise.all([
        fetch("/api/employees").then(r => r.json()),
        fetch(`/api/attendance-bulk?year=${year}&month=${month}`).then(r => r.json()),
      ]);
      setEmployees(er.employees || []);
      setAttendance(ar.records || []);
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  /* ── Derived stats ─────────────────────────────────────────────────────── */
  const active   = useMemo(() => employees.filter(e => (e.status ?? "ATIVO") === "ATIVO"), [employees]);
  const inactive = employees.length - active.length;
  const projetos = active.filter(e => e.pin_project);
  const workers8h = active.filter(e => (e.schedules?.expected_work ?? 0) >= 420);
  const workers6h = active.filter(e => { const w = e.schedules?.expected_work ?? 0; return w >= 300 && w < 420; });
  const workersOther = active.filter(e => { const w = e.schedules?.expected_work ?? 0; return w < 300 || !e.schedules; });

  const byEmp = useMemo(() => {
    const map: Record<string, AttRec[]> = {};
    for (const r of attendance) { if (!map[r.employee_id]) map[r.employee_id] = []; map[r.employee_id].push(r); }
    return map;
  }, [attendance]);

  const daysSoFar      = workingDaysSoFar(year, month);
  const daysInMonth     = workingDaysInMonth(year, month);
  const calDaysSoFar    = calendarDaysSoFar(year, month);
  const calDaysInMonth  = calendarDaysInMonth(year, month);

  const empStats = useMemo(() => active.map(emp => {
    const recs = byEmp[emp.id] || [];
    const expected = emp.schedules?.expected_work ?? 480;
    const lunch    = emp.schedules?.lunch_minutes  ?? 60;
    let workedMin = 0, absences = 0, vacations = 0, certs = 0;
    for (const r of recs) {
      if (r.status === "NORMAL" || r.status === "COMPENSATION") workedMin += calcNetMinutes(r.time_entries, lunch);
      else if (r.status === "ABSENCE")     absences++;
      else if (r.status === "VACATION")    vacations++;
      else if (r.status === "CERTIFICATE") certs++;
    }
    const expectedSoFar = daysSoFar * expected;
    const delta = workedMin - expectedSoFar;
    const pct   = expectedSoFar > 0 ? Math.round((workedMin / expectedSoFar) * 100) : 100;
    return { emp, workedMin, expectedSoFar, delta, pct, absences, vacations, certs };
  }), [active, byEmp, daysSoFar]);

  const positiveCount = empStats.filter(s => s.delta >= 0).length;
  const negativeCount = empStats.filter(s => s.delta  < 0).length;

  const complianceByDept = useMemo(() => {
    const depts: Record<string, { name: string; positive: number; negative: number }> = {};
    for (const { emp, delta } of empStats) {
      const d = emp.departments?.name || "Sem setor";
      if (!depts[d]) depts[d] = { name: d, positive: 0, negative: 0 };
      if (delta >= 0) depts[d].positive++; else depts[d].negative++;
    }
    return Object.values(depts).sort((a, b) => (b.positive + b.negative) - (a.positive + a.negative));
  }, [empStats]);

  const scheduleDistData = [
    { name: "8h/dia", value: workers8h.length, color: "#3b82f6" },
    { name: "6h/dia", value: workers6h.length, color: "#8b5cf6" },
    { name: "Outros", value: workersOther.length, color: "#94a3b8" },
  ].filter(d => d.value > 0);

  const statusCounts = useMemo(() => {
    const cnt: Record<string, number> = {};
    for (const r of attendance) cnt[r.status] = (cnt[r.status] || 0) + 1;
    return Object.entries(cnt).map(([status, value]) => ({
      status, value, name: STATUS_LABELS[status] || status, color: STATUS_COLORS[status] || "#94a3b8",
    })).sort((a, b) => b.value - a.value);
  }, [attendance]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Início</span><span>›</span>
            <span className="text-foreground font-medium">Dashboard</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral operacional · {MONTHS[month - 1]} de {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <button onClick={prevMonth} className="px-3 py-2 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-sm font-semibold min-w-[140px] text-center border-x border-border">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} disabled={isCurrentMonth} className="px-3 py-2 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl gap-2">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Atualizar
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total",   value: employees.length, sub: `${inactive} inativo${inactive !== 1 ? "s" : ""}`, icon: Users,       color: "text-blue-600",   bg: "bg-blue-50 border-blue-100" },
          { label: "Ativos",  value: active.length,    sub: `${Math.round((active.length / Math.max(employees.length, 1)) * 100)}% do quadro`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Projeto", value: projetos.length,  sub: "PIN – horas extras", icon: Briefcase, color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
          { label: "8h/dia",  value: workers8h.length, sub: `${Math.round((workers8h.length / Math.max(active.length, 1)) * 100)}% dos ativos`, icon: Clock,   color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
          { label: "6h/dia",  value: workers6h.length, sub: `${Math.round((workers6h.length / Math.max(active.length, 1)) * 100)}% dos ativos`, icon: Clock,   color: "text-amber-600",  bg: "bg-amber-50 border-amber-100" },
          { label: "Setores", value: new Set(active.map(e => e.departments?.name).filter(Boolean)).size, sub: "departamentos", icon: Building2, color: "text-sky-600", bg: "bg-sky-50 border-sky-100" },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="rounded-[20px] border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-4">
                <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center mb-3", k.bg)}>
                  <k.icon className={cn("w-4 h-4", k.color)} />
                </div>
                <div className="text-2xl font-bold tracking-tight">{loading ? "—" : k.value}</div>
                <div className="text-xs font-semibold text-foreground mt-0.5">{k.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{k.sub}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Compliance summary banner ─────────────────────────────────────── */}
      {!loading && empStats.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{positiveCount}</p>
              <p className="text-xs font-semibold text-emerald-600">Cumpriram o previsto</p>
              <p className="text-[10px] text-emerald-500 mt-0.5">horas ≥ esperadas no período</p>
            </div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{negativeCount}</p>
              <p className="text-xs font-semibold text-red-600">Com débito de horas</p>
              <p className="text-[10px] text-red-500 mt-0.5">horas trabalhadas abaixo do esperado</p>
            </div>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">
                {empStats.filter(s => s.emp.pin_project && s.delta >= 0).length}/{projetos.length}
              </p>
              <p className="text-xs font-semibold text-purple-600">Projeto em dia</p>
              <p className="text-[10px] text-purple-500 mt-0.5">PIN — cumpriram horas no mês</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-[20px] border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conformidade por Setor — {MONTHS[month - 1]}/{year}</CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
            ) : complianceByDept.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados de frequência</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complianceByDept} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background:"white", border:"1px solid #e2e8f0", borderRadius:12, fontSize:12 }}
                    formatter={(v: number, name: string) => [v, name === "positive" ? "Em dia" : "Com débito"]} />
                  <Bar dataKey="positive" name="Em dia"     fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="negative" name="Com débito" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição de Jornada</CardTitle>
          </CardHeader>
          <CardContent className="h-52 flex flex-col justify-between">
            {scheduleDistData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={scheduleDistData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                      {scheduleDistData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:"white", border:"1px solid #e2e8f0", borderRadius:12, fontSize:12 }}
                      formatter={(v: number, n: string) => [v + " func.", n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center">
                  {scheduleDistData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-bold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Attendance type pills ─────────────────────────────────────────── */}
      {statusCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statusCounts.map(s => (
            <div key={s.status} className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-card shadow-sm">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-muted-foreground">{s.name}</span>
              <span className="text-xs font-bold">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Employee compliance table ─────────────────────────────────────── */}
      <Card className="rounded-[20px] border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
            <p className="font-semibold text-sm">
              {loading ? "Carregando..." : `Desempenho Individual — ${MONTHS[month - 1]} ${year}`}
            </p>
            <span className="text-xs text-muted-foreground">{calDaysSoFar} dias corridos / {calDaysInMonth} no mês</span>
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              placeholder="Filtrar funcionário ou setor…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
        </div>
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-muted/40 animate-pulse" />)}
          </div>
        ) : empStats.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum dado de frequência para o período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  {["Funcionário","Setor","Jornada","Faltas","H.Esperadas","H.Trabalhadas","Δ Saldo","Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...empStats]
                  .filter(s => !tableSearch || s.emp.name.toLowerCase().includes(tableSearch.toLowerCase()) || (s.emp.departments?.name ?? "").toLowerCase().includes(tableSearch.toLowerCase()))
                  .sort((a, b) => a.emp.name.localeCompare(b.emp.name, "pt-BR"))
                  .map(({ emp, workedMin, expectedSoFar, delta, pct, absences }, idx) => {
                  const isOk = delta >= 0;
                  return (
                    <tr key={emp.id} className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", idx % 2 === 1 && "bg-muted/10")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-7 h-7 rounded-xl text-white text-[10px] font-bold flex items-center justify-center bg-gradient-to-br shrink-0", avatarColor(emp.id))}>
                            {ini(emp.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-xs leading-tight">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">#{emp.registration}</p>
                          </div>
                          {emp.pin_project && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">PIN</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{emp.departments?.name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium">{emp.schedules ? toHHMM(emp.schedules.expected_work) + "/dia" : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {absences > 0 ? <span className="text-xs font-bold text-red-600">{absences}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{toHHMM(expectedSoFar)}</td>
                      <td className="px-4 py-3 text-xs font-mono">{toHHMM(workedMin)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-mono font-bold", isOk ? "text-emerald-600" : "text-red-600")}>
                          {isOk ? "+" : ""}{toHHMM(delta)}
                        </span>
                        <div className="mt-1 h-1 w-16 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full", isOk ? "bg-emerald-500" : "bg-red-500")} style={{ width: Math.min(100, Math.abs(pct)) + "%" }} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isOk ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            <AlertCircle className="w-3 h-3" /> Débito
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Top performers / Worst absences ─────────────────────────────── */}
      {!loading && empStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-[20px] border-border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <CardTitle className="text-sm font-semibold">Maior saldo positivo</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[...empStats].sort((a, b) => b.delta - a.delta).slice(0, 5).map(({ emp, delta }, i) => (
                <div key={emp.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                    <div className={cn("w-6 h-6 rounded-lg text-white text-[9px] font-bold flex items-center justify-center bg-gradient-to-br", avatarColor(emp.id))}>
                      {ini(emp.name)}
                    </div>
                    <span className="text-xs font-medium truncate max-w-[160px]">{emp.name}</span>
                  </div>
                  <span className={cn("text-xs font-mono font-bold", delta >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {delta >= 0 ? "+" : ""}{toHHMM(delta)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[20px] border-border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                </div>
                <CardTitle className="text-sm font-semibold">Maior número de faltas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[...empStats].sort((a, b) => b.absences - a.absences).filter(s => s.absences > 0).slice(0, 5).map(({ emp, absences }, i) => (
                <div key={emp.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                    <div className={cn("w-6 h-6 rounded-lg text-white text-[9px] font-bold flex items-center justify-center bg-gradient-to-br", avatarColor(emp.id))}>
                      {ini(emp.name)}
                    </div>
                    <span className="text-xs font-medium truncate max-w-[160px]">{emp.name}</span>
                  </div>
                  <span className="text-xs font-bold text-red-600">{absences} falta{absences !== 1 ? "s" : ""}</span>
                </div>
              ))}
              {empStats.every(s => s.absences === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma falta registrada no período 🎉</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}

