/* ═══════════════════════════════════════════════════════════════════════════
   Saldos Acumulados — Projeto PIN 2026
   Controla as horas extras dedicadas ao Projeto PIN por cada funcionário.
   Fonte única de verdade: /api/pin-project/auto-balances (servidor), que
   resolve cada mês nessa ordem: override manual do admin > planilha oficial
   congelada (Jan–Jul/26) > cálculo automático do espelho de ponto (Ago/26+).
   Qualquer mês pode ser corrigido manualmente aqui — é o único lugar do
   sistema que edita banco de horas do Projeto PIN.
   Saldo POSITIVO = funcionário cumpriu e superou a meta → verde
   Saldo NEGATIVO = funcionário está devendo horas ao projeto → vermelho
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Target, TrendingUp, AlertTriangle, CheckCircle2,
  Pencil, Save, X, RotateCcw, RefreshCw, Search,
  ChevronDown, ChevronUp, Info, Users, Clock,
  AlertCircle, ChevronRight, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import BalanceProofDrawer from "@/src/components/BalanceProofDrawer";
import type { PinAutoMonths } from "@/src/lib/pinHistoricalData";

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const toHHMM = (min: number | null): string => {
  if (min === null || min === undefined) return "—";
  const a = Math.abs(min);
  return (min < 0 ? "-" : "+") + String(Math.floor(a / 60)).padStart(2, "0") + "h" + String(a % 60).padStart(2, "0") + "m";
};
const toHHMMRaw = (min: number | null): string => {
  if (min === null || min === undefined) return "—";
  const a = Math.abs(min);
  return (min < 0 ? "-" : "") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
};
const parseHHMM = (s: string): number | null => {
  const m = s.trim().match(/^(-?)(\d+)[h:](\d{0,2})m?$/);
  if (!m) return null;
  const sign = m[1] ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
};

/* ── Month key helpers ───────────────────────────────────────────────────── */
const MONTH_ABBR_NUM: Record<string, number> = {
  JAN:1, FEV:2, MAR:3, ABR:4, MAI:5, JUN:6, JUL:7, AGO:8, SET:9, OUT:10, NOV:11, DEZ:12,
};
const MONTH_ABBR_LABEL: Record<string, string> = {
  JAN:"Jan", FEV:"Fev", MAR:"Mar", ABR:"Abr", MAI:"Mai", JUN:"Jun",
  JUL:"Jul", AGO:"Ago", SET:"Set", OUT:"Out", NOV:"Nov", DEZ:"Dez",
};
function monthKeyToNum(k: string): number {
  return parseInt(k.slice(3), 10) * 100 + (MONTH_ABBR_NUM[k.slice(0, 3)] ?? 0);
}
function monthKeyLabel(k: string): string {
  return `${MONTH_ABBR_LABEL[k.slice(0, 3)] ?? k.slice(0, 3)}/${k.slice(5)}`;
}

/* ── Types (formato de /api/pin-project/auto-balances) ───────────────────── */
type PinMonth = {
  acum: number | null;
  goal: number;
  isCurrentMonth: boolean;
  isManualOverride?: boolean;
};
type PinEmployeeRow = {
  id: string;
  name: string;
  registration: string | null;
  department: string | null;
  pin_project: boolean;
  months: Record<string, PinMonth>;
};

/* ── Component ────────────────────────────────────────────────────────────── */
export default function PinProject() {
  const [rows, setRows]       = useState<PinEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]         = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "ok" | "deficit" | "sem_dados">("all");
  const [sortKey, setSortKey]       = useState<"nome" | "area" | "saldo">("area");
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("asc");
  const [showInfo, setShowInfo]     = useState(false);

  // Modal de detalhe/edição por funcionário — único lugar do sistema onde o
  // banco de horas do Projeto PIN é corrigido, mês a mês.
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [editingMk, setEditingMk]         = useState<string | null>(null);
  const [editValue, setEditValue]         = useState("");
  const [savingMk, setSavingMk]           = useState<string | null>(null);

  // Detalhamento completo (extras/goal/days) por funcionário — o `months` de
  // PinEmployeeRow acima só guarda os campos usados na tabela/modal de edição;
  // a comprovação de saldo precisa do objeto cru retornado pelo servidor.
  const [rawAutoMonths, setRawAutoMonths] = useState<Record<string, PinAutoMonths>>({});
  const [proofEmpId, setProofEmpId]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pin-project/auto-balances");
      const j = await r.json();
      if (!j.success || !Array.isArray(j.employees)) {
        toast.error(j.error ?? "Erro ao carregar saldos acumulados PIN");
        return;
      }
      const list: PinEmployeeRow[] = j.employees
        .filter((e: any) => e.autoMonths && Object.keys(e.autoMonths).length > 0)
        .map((e: any) => ({
          id: e.id,
          name: e.name,
          registration: e.registration ?? null,
          department: e.department ?? null,
          pin_project: !!e.pin_project,
          months: e.autoMonths as Record<string, PinMonth>,
        }));
      setRows(list);
      const rawMap: Record<string, PinAutoMonths> = {};
      for (const e of j.employees) rawMap[e.id] = e.autoMonths ?? {};
      setRawAutoMonths(rawMap);
    } catch {
      toast.error("Erro ao carregar saldos acumulados PIN");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Todas as colunas de mês em uso, em ordem cronológica */
  const monthKeys = useMemo(() => {
    const s = new Set<string>();
    for (const row of rows) for (const mk of Object.keys(row.months)) s.add(mk);
    return Array.from(s).sort((a, b) => monthKeyToNum(a) - monthKeyToNum(b));
  }, [rows]);

  /* Mês mais recente com dado para cada funcionário = "Saldo Atual" */
  const latestMonthOf = useCallback((row: PinEmployeeRow) => {
    const keys = Object.keys(row.months).sort((a, b) => monthKeyToNum(b) - monthKeyToNum(a));
    return keys[0] ? { mk: keys[0], data: row.months[keys[0]] } : null;
  }, []);

  const areas = useMemo(
    () => ["all", ...Array.from(new Set(rows.map(r => r.department ?? "Sem departamento"))).sort()],
    [rows]
  );

  const visible = useMemo(() => {
    let list = rows;
    if (search) list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (filterArea !== "all") list = list.filter(r => (r.department ?? "Sem departamento") === filterArea);
    if (filterStatus !== "all") {
      list = list.filter(r => {
        const latest = latestMonthOf(r);
        const acum = latest?.data.acum ?? null;
        if (filterStatus === "sem_dados") return acum === null;
        if (filterStatus === "ok") return acum !== null && acum >= 0;
        return acum !== null && acum < 0; // deficit
      });
    }
    return [...list].sort((a, b) => {
      let v: number;
      if (sortKey === "nome") v = a.name.localeCompare(b.name, "pt-BR");
      else if (sortKey === "area") {
        v = (a.department ?? "").localeCompare(b.department ?? "", "pt-BR") || a.name.localeCompare(b.name, "pt-BR");
      } else {
        const av = latestMonthOf(a)?.data.acum ?? Infinity;
        const bv = latestMonthOf(b)?.data.acum ?? Infinity;
        v = av - bv;
      }
      return sortDir === "asc" ? v : -v;
    });
  }, [rows, search, filterArea, filterStatus, sortKey, sortDir, latestMonthOf]);

  const stats = useMemo(() => {
    const withData = rows.map(r => ({ r, acum: latestMonthOf(r)?.data.acum ?? null }));
    const deficits = withData.filter(x => x.acum !== null && x.acum < 0);
    const ok       = withData.filter(x => x.acum !== null && x.acum >= 0);
    const totalDef = deficits.reduce((s, x) => s + (x.acum ?? 0), 0);
    return { total: rows.length, deficits: deficits.length, ok: ok.length, totalDef };
  }, [rows, latestMonthOf]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k
      ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />)
      : <ChevronDown className="w-3 h-3 inline ml-0.5 opacity-30" />;

  /* ── Editar/reverter um mês do funcionário selecionado (modal) ──────────── */
  const selectedEmp = selectedEmpId ? rows.find(r => r.id === selectedEmpId) ?? null : null;

  const openMonthEdit = (mk: string, currentVal: number | null) => {
    setEditingMk(mk);
    setEditValue(currentVal !== null ? toHHMMRaw(currentVal) : "");
  };

  const saveMonthEdit = async () => {
    if (!selectedEmpId || !editingMk) return;
    const min = parseHHMM(editValue);
    if (min === null) { toast.error("Formato inválido. Use ex: 39:18 ou -03:39"); return; }
    setSavingMk(editingMk);
    try {
      const r = await fetch(`/api/pin-project/balance/${selectedEmpId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey: editingMk, minutes: min }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(`Saldo de ${monthKeyLabel(editingMk)} corrigido — saldo atual recalculado`);
        setEditingMk(null);
        await load();
      } else {
        toast.error(j.error ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSavingMk(null);
    }
  };

  const revertMonth = async (mk: string) => {
    if (!selectedEmpId) return;
    setSavingMk(mk);
    try {
      const r = await fetch(`/api/pin-project/balance/${selectedEmpId}?monthKey=${mk}`, { method: "DELETE" });
      const j = await r.json();
      if (j.success) {
        toast.success(`${monthKeyLabel(mk)} revertido para o valor padrão`);
        await load();
      } else {
        toast.error(j.error ?? "Erro ao reverter");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSavingMk(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-foreground">Saldos Acumulados</h1>
            <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 text-xs">Projeto PIN 2026</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Jan–Jul/26 congelado pela planilha oficial · Ago/26 em diante calculado automaticamente do espelho de ponto importado
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clique no nome de um funcionário para corrigir qualquer mês — único lugar do sistema para ajustar banco de horas do Projeto PIN · Decreto nº 70.273/2025
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" onClick={() => setShowInfo(v => !v)}>
            <Info className="w-3.5 h-3.5" /> Como funciona
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Atualizar
          </Button>
        </div>
      </div>

      {/* ── Info panel ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="rounded-[20px] border-blue-200 bg-blue-50/60">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-bold text-blue-800 mb-1.5 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Prioridade por mês</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>Correção manual do admin (se existir)</li>
                      <li>Planilha oficial congelada (Jan–Jul/26)</li>
                      <li>Cálculo automático do espelho de ponto (Ago/26+)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold text-blue-800 mb-1.5 flex items-center gap-1.5"><Target className="w-4 h-4" /> Como calcular</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>Saldo do mês = horas trabalhadas − meta do mês (sempre 40h no banco de horas)</li>
                      <li>Saldo acumulado = saldo acumulado anterior + saldo do mês</li>
                      <li>Saldo <strong>positivo</strong> = cumpriu e superou a meta</li>
                      <li>Saldo <strong>negativo</strong> = deve horas ao projeto PIN</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold text-blue-800 mb-1.5 flex items-center gap-1.5"><Pencil className="w-4 h-4" /> Corrigir um mês</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>Clique no nome do funcionário na tabela</li>
                      <li>No painel, edite qualquer mês, passado ou atual</li>
                      <li>O saldo atual é recalculado na hora, propagando pros meses seguintes</li>
                      <li>Ícone <RotateCcw className="w-3 h-3 inline" /> reverte uma correção e volta ao valor padrão</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Summary cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total PIN", value: stats.total, sub: "funcionários rastreados", icon: Users, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "Em Dia",    value: stats.ok,    sub: "saldo ≥ 0h",              icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Déficit",   value: stats.deficits, sub: toHHMM(stats.totalDef) + " total", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        ].map((c, i) => (
          <Card key={i} className={cn("rounded-[20px] border shadow-sm", c.bg)}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", c.bg)}>
                <c.icon className={cn("w-5 h-5", c.color)} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-2xl font-bold", c.color)}>{c.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
                <p className="text-[10px] text-muted-foreground/70 truncate">{c.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card className="rounded-[20px] border-border shadow-sm bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar funcionário..."
                className="pl-8 text-xs rounded-xl h-9" />
            </div>
            <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
              className="text-xs rounded-xl border border-border bg-background px-3 py-2 h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
              {areas.map(a => <option key={a} value={a}>{a === "all" ? "Todas as áreas" : a}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="text-xs rounded-xl border border-border bg-background px-3 py-2 h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="all">Todos os status</option>
              <option value="ok">Em dia (saldo ≥ 0)</option>
              <option value="deficit">Com déficit (saldo negativo)</option>
              <option value="sem_dados">Sem dados</option>
            </select>
            <span className="text-xs text-muted-foreground ml-auto">{visible.length} de {rows.length} registros</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Main table ────────────────────────────────────────────────────────── */}
      <Card className="rounded-[20px] border-border shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-0 px-6 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Saldos Acumulados — {monthKeys.length > 0 ? `${monthKeyLabel(monthKeys[0])} a ${monthKeyLabel(monthKeys[monthKeys.length - 1])}` : "—"}
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Saldo negativo = funcionário em déficit com o Projeto PIN
              </CardDescription>
            </div>
            <div className="flex gap-1 text-xs text-muted-foreground items-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Em dia
              <div className="w-3 h-3 rounded-full bg-red-500 inline-block ml-2" /> Déficit
              <div className="w-3 h-3 rounded-full bg-gray-300 inline-block ml-2" /> Sem dados
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto mt-3">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-40" />
              Carregando...
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("nome")}>
                    Nome <SortIcon k="nome" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("area")}>
                    Área <SortIcon k="area" />
                  </th>
                  {monthKeys.map(mk => (
                    <th key={mk} className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap">
                      {monthKeyLabel(mk)}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-semibold text-foreground bg-blue-50/60 whitespace-nowrap">
                    Saldo Atual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {visible.map((row, i) => {
                  const latest = latestMonthOf(row);
                  const latestAcum = latest?.data.acum ?? null;
                  const isNeg = (latestAcum ?? 0) < 0;

                  return (
                    <tr
                      key={row.id}
                      className={cn("hover:bg-muted/40 transition-colors cursor-pointer", i % 2 === 1 && "bg-muted/10")}
                      onClick={() => setSelectedEmpId(row.id)}
                    >
                      {/* Nome */}
                      <td className="px-4 py-2 font-medium text-foreground">
                        <button type="button" className="flex items-center gap-2 hover:text-blue-600 transition-colors group">
                          {latestAcum !== null ? (
                            isNeg
                              ? <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              : <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          ) : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />}
                          <span className="truncate max-w-[180px] underline decoration-transparent group-hover:decoration-current" title={row.name}>{row.name}</span>
                          {!row.pin_project && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted-foreground/30 text-muted-foreground shrink-0">histórico</Badge>
                          )}
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                        </button>
                      </td>
                      {/* Área */}
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-border text-muted-foreground font-medium">
                          {row.department ?? "Sem departamento"}
                        </Badge>
                      </td>
                      {/* Meses — somente leitura; edição acontece no modal (clique no nome) */}
                      {monthKeys.map(mk => {
                        const month = row.months[mk];
                        if (!month) {
                          return (
                            <td key={mk} className="px-3 py-2 text-center">
                              <span className="text-[10px] text-muted-foreground/30">—</span>
                            </td>
                          );
                        }
                        const acum = month.acum;
                        const neg = (acum ?? 0) < 0;
                        return (
                          <td key={mk} className={cn(
                            "px-3 py-2 text-center",
                            month.isCurrentMonth && "bg-amber-50/30",
                            month.isManualOverride && "bg-purple-50/30",
                          )}>
                            <div className="flex flex-col items-center gap-0.5">
                              {acum !== null ? (
                                <span className={cn("text-[11px] font-mono font-semibold", neg ? "text-red-600" : "text-emerald-600")}>
                                  {toHHMMRaw(acum)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/30">—</span>
                              )}
                              <div className="flex items-center gap-1 h-3">
                                {month.isCurrentMonth && <span className="text-[8px] text-amber-500 opacity-70">em curso</span>}
                                {month.isManualOverride && <span className="text-[8px] text-purple-500 opacity-70">ajustado</span>}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      {/* Saldo Atual */}
                      <td className="px-3 py-2 text-center bg-blue-50/40">
                        {latestAcum !== null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn("text-xs font-mono font-bold", isNeg ? "text-red-600" : "text-emerald-600")}>
                              {isNeg ? "▼ " : "▲ "}{toHHMMRaw(Math.abs(latestAcum))}
                            </span>
                            <span className="text-[8px] text-muted-foreground opacity-60">{latest ? monthKeyLabel(latest.mk) : ""}</span>
                          </div>
                        ) : <span className="text-muted-foreground/40 text-[10px]">Sem dados</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && visible.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado com os filtros selecionados.
            </div>
          )}
        </div>

        {/* Footer legend */}
        <div className="px-6 py-3 border-t border-border/40 bg-muted/20 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <span>Banco de horas do Projeto PIN sempre desconta 40h/mês (meta de bônus pode ser maior em meses de compensação de feriado)</span>
          <span>· <span className="text-purple-500 font-medium">ajustado</span> = correção manual do admin, sobrescreve o valor padrão</span>
        </div>
      </Card>

      {/* ── Deficit alert ─────────────────────────────────────────────────────── */}
      {stats.deficits > 0 && (
        <Card className="rounded-[20px] border-red-200 bg-red-50/50 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">
                  {stats.deficits} funcionário{stats.deficits > 1 ? "s" : ""} com déficit acumulado
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Total de déficit: <strong>{toHHMM(stats.totalDef)}</strong> — esses funcionários precisam compensar as horas faltantes nos próximos meses do Projeto PIN.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rows.filter(r => (latestMonthOf(r)?.data.acum ?? 0) < 0).map(r => (
                    <Badge key={r.id} className="text-[10px] bg-red-100 text-red-700 border border-red-200 hover:bg-red-200">
                      {r.name.split(" ")[0]} {r.name.split(" ").slice(-1)[0]} ({toHHMM(latestMonthOf(r)?.data.acum ?? null)})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Modal de detalhe/edição por funcionário ──────────────────────────── */}
      <AnimatePresence>
        {selectedEmp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) { setSelectedEmpId(null); setEditingMk(null); } }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-[24px] shadow-2xl border border-border w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between shrink-0">
                <div className="min-w-0">
                  <h2 className="text-base font-bold truncate">{selectedEmp.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground font-medium">
                      {selectedEmp.department ?? "Sem departamento"}
                    </Badge>
                    {!selectedEmp.pin_project && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted-foreground/30 text-muted-foreground">histórico</Badge>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedEmp.pin_project && (
                    <Button
                      variant="outline" size="sm"
                      className="rounded-xl gap-1.5 text-[11px] h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      title="Ver comprovação detalhada do cálculo do saldo"
                      onClick={() => setProofEmpId(selectedEmp.id)}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Comprovar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="rounded-xl shrink-0" onClick={() => { setSelectedEmpId(null); setEditingMk(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
                {Object.keys(selectedEmp.months)
                  .sort((a, b) => monthKeyToNum(a) - monthKeyToNum(b))
                  .map(mk => {
                    const month = selectedEmp.months[mk];
                    const isEditing = editingMk === mk;
                    const isSaving = savingMk === mk;
                    const neg = (month.acum ?? 0) < 0;

                    return (
                      <div key={mk} className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                        month.isCurrentMonth && "bg-amber-50/50",
                        month.isManualOverride && "bg-purple-50/50",
                        !month.isCurrentMonth && !month.isManualOverride && "hover:bg-muted/30",
                      )}>
                        <div className="w-16 shrink-0">
                          <span className="text-sm font-semibold">{monthKeyLabel(mk)}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          {month.isCurrentMonth && <span className="text-[9px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">em curso</span>}
                          {month.isManualOverride && <span className="text-[9px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">ajustado</span>}
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              autoFocus
                              type="text"
                              value={editValue}
                              onChange={ev => setEditValue(ev.target.value)}
                              placeholder="00:00"
                              className="w-24 px-2 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 font-mono text-center"
                              onKeyDown={ev => { if (ev.key === "Enter") saveMonthEdit(); if (ev.key === "Escape") setEditingMk(null); }}
                            />
                            <Button size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={saveMonthEdit} disabled={isSaving}>
                              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => setEditingMk(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={cn("text-sm font-mono font-bold w-20 text-right", month.acum === null ? "text-muted-foreground/40" : neg ? "text-red-600" : "text-emerald-600")}>
                              {toHHMMRaw(month.acum)}
                            </span>
                            {month.isManualOverride && (
                              <Button
                                size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg"
                                title="Reverter para valor padrão"
                                onClick={() => revertMonth(mk)}
                                disabled={isSaving}
                              >
                                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-purple-500" />}
                              </Button>
                            )}
                            <Button
                              size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg"
                              title="Corrigir este mês"
                              onClick={() => openMonthEdit(mk, month.acum)}
                              disabled={isSaving}
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="px-6 py-3 border-t border-border/40 shrink-0">
                <p className="text-[10px] text-muted-foreground">
                  Corrigir um mês recalcula automaticamente o saldo atual e todos os meses seguintes.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {proofEmpId && (() => {
        const emp = rows.find(r => r.id === proofEmpId);
        if (!emp) return null;
        return (
          <BalanceProofDrawer
            employee={{ id: emp.id, name: emp.name, registration: emp.registration ?? "—", departments: emp.department ? { name: emp.department } : undefined }}
            autoMonths={rawAutoMonths[emp.id] ?? {}}
            onClose={() => setProofEmpId(null)}
          />
        );
      })()}
    </motion.div>
  );
}
