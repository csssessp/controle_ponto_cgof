/* ═══════════════════════════════════════════════════════════════════════════
   Projeto/Etapa — acompanhamento dos funcionários do setor "Projeto/Etapa"
   (carga horária diferenciada, 2h/4h/6h/dia, fora do Projeto PIN). Diferença
   do PERÍODO (trabalhado − esperado do mês exibido), sem banco acumulado
   entre meses.
   ═══════════════════════════════════════════════════════════════════════════ */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  FolderKanban, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* Nome exato do setor cadastrado em Configurações → Setores. Só funcionários
   desse departamento aparecem nesta tela. */
const DEPARTMENT_NAME = "Projeto/Etapa";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Emp = {
  id: string; name: string; registration: string; status?: string;
  departments?: { name: string };
  schedules?: { name: string; expected_work: number };
};
type AttRec = {
  id: string; date: string; status: string;
  total_work: number; overtime50: number; overtime100: number; delay: number;
  employee_id: string;
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

const ini = (n: string) => n.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
const AVATAR_COLORS = [
  "from-blue-500 to-blue-600","from-indigo-500 to-indigo-600","from-purple-500 to-purple-600",
  "from-emerald-500 to-emerald-600","from-amber-500 to-amber-600","from-pink-500 to-pink-600",
];
const avatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

/* ══════════════════════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════════════════════ */
export default function ProjetoEtapa() {
  const now = new Date();
  // Ao contrário do Dashboard (que ancora no último mês IMPORTADO), aqui o
  // padrão é o mês corrente: esse grupo não vem de import em lote — o dado
  // nasce dia a dia pela extensão de bater ponto.
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [attendance, setAttendance] = useState<AttRec[]>([]);
  const [loading, setLoading] = useState(true);

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
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const filteredEmployees = useMemo(
    () => employees.filter(e => (e.status ?? "ATIVO") === "ATIVO" && e.departments?.name === DEPARTMENT_NAME),
    [employees]
  );

  const byEmp = useMemo(() => {
    const map: Record<string, AttRec[]> = {};
    for (const r of attendance) { if (!map[r.employee_id]) map[r.employee_id] = []; map[r.employee_id].push(r); }
    return map;
  }, [attendance]);

  // Diferença do PERÍODO — extras menos déficit já calculados e persistidos
  // pelo servidor por dia (server.ts: calculateWorkHours/upsertAttendanceDay),
  // somados só dentro do mês exibido. Nunca acumula de um mês pro outro (isso
  // é o banco de horas estilo PIN, que não se aplica a este grupo).
  const empStats = useMemo(() => filteredEmployees.map(emp => {
    const recs = byEmp[emp.id] || [];
    const expected = emp.schedules?.expected_work ?? 0;
    let workedMin = 0, extraMin = 0, deficitMin = 0, diasTrabalhados = 0;
    for (const r of recs) {
      if (r.status === "NORMAL" || r.status === "COMPENSATION") {
        workedMin += r.total_work || 0;
        extraMin += (r.overtime50 || 0) + (r.overtime100 || 0);
        deficitMin += r.delay || 0;
        diasTrabalhados++;
      }
    }
    const expectedMin = diasTrabalhados * expected;
    const saldoPeriodo = diasTrabalhados > 0 ? (extraMin - deficitMin) : null;
    return { emp, workedMin, expectedMin, diasTrabalhados, saldoPeriodo };
  }), [filteredEmployees, byEmp]);

  const positiveCount = empStats.filter(s => s.saldoPeriodo !== null && s.saldoPeriodo >= 0).length;
  const negativeCount = empStats.filter(s => s.saldoPeriodo !== null && s.saldoPeriodo  < 0).length;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Início</span><span>›</span>
            <span className="text-foreground font-medium">Projeto/Etapa</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight">Projeto/Etapa</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Setor Projeto/Etapa · carga horária diferenciada (2h/4h/6h) · {MONTHS[month - 1]} de {year}
          </p>
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

      {/* ── Cards de resumo ──────────────────────────────────────────────── */}
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
              <p className="text-xs font-semibold text-red-600">Com débito no período</p>
              <p className="text-[10px] text-red-500 mt-0.5">horas trabalhadas abaixo do esperado</p>
            </div>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <FolderKanban className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-700">{filteredEmployees.length}</p>
              <p className="text-xs font-semibold text-violet-600">Funcionários no setor</p>
              <p className="text-[10px] text-violet-500 mt-0.5">Projeto/Etapa</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabela ───────────────────────────────────────────────────────── */}
      <Card className="rounded-[20px] border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="font-semibold text-sm">
            {loading ? "Carregando..." : `Apontamentos — ${MONTHS[month - 1]} ${year}`}
          </p>
        </div>
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-muted/40 animate-pulse" />)}
          </div>
        ) : empStats.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum funcionário no setor "{DEPARTMENT_NAME}"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  {["Funcionário","Jornada","Dias Trabalhados","H.Esperadas","H.Trabalhadas","Diferença do Período","Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...empStats]
                  .sort((a, b) => a.emp.name.localeCompare(b.emp.name, "pt-BR"))
                  .map(({ emp, workedMin, expectedMin, diasTrabalhados, saldoPeriodo }, idx) => {
                  const isOk = saldoPeriodo !== null && saldoPeriodo >= 0;
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
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{emp.schedules ? toHHMM(emp.schedules.expected_work) + "/dia" : "—"}</td>
                      <td className="px-4 py-3 text-center text-xs font-mono">{diasTrabalhados || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono">{toHHMM(expectedMin)}</td>
                      <td className="px-4 py-3 text-xs font-mono">{toHHMM(workedMin)}</td>
                      <td className="px-4 py-3">
                        {saldoPeriodo === null ? (
                          <span className="text-xs font-mono text-muted-foreground">—</span>
                        ) : (
                          <span className={cn("text-xs font-mono font-bold", isOk ? "text-emerald-600" : "text-red-600")}>
                            {saldoPeriodo >= 0 ? "+" : ""}{toHHMM(saldoPeriodo)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {saldoPeriodo === null ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            Sem dados
                          </span>
                        ) : isOk ? (
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
    </motion.div>
  );
}
