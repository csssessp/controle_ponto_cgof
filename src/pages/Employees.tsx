/* ═══════════════════════════════════════════════════════════════════════════
   ChronosAI — Funcionários  |  Enterprise SaaS Grade UI
   ═══════════════════════════════════════════════════════════════════════════ */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, UserPlus, MoreHorizontal, Mail, Phone, Building2,
  Pencil, Trash2, UserCheck, UserX, Plus, Save, TrendingUp, TrendingDown,
  ChevronRight, Filter, X, SlidersHorizontal, Users, Briefcase, Clock,
  BarChart3, ArrowUpRight, Activity, Eye, EyeOff, Download, Upload,
  Hash, MapPin, CalendarDays, AlertCircle, CheckCircle2, Circle,
  User, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/src/lib/supabase";
import { useAuthStore } from "@/src/lib/store";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Employee = {
  id: string; name: string; registration: string;
  cpf?: string; email?: string; phone?: string;
  role_title?: string; admission_date?: string;
  department_id?: string; schedule_id?: string; status?: string;
  pin_project?: boolean;
  departments?: { name: string };
  schedules?: { name: string; expected_work: number; lunch_minutes?: number };
};
type Dept = { id: string; name: string };
type Schedule = { id: string; name: string; expected_work: number };
type BankEntry = { id: string; date: string; minutes: number; description?: string };

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const ini = (n: string) => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const hhmm = (m: number) => {
  const a = Math.abs(m);
  return (m < 0 ? "-" : "") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
};
const hhmmBank = (m: number) => {
  const a = Math.abs(m);
  return (m < 0 ? "-" : "") + String(Math.floor(a / 60)).padStart(3, "0") + ":" + String(a % 60).padStart(2, "0") + ":00";
};
const fmtDate = (d?: string) => d ? d.substring(0, 10).split("-").reverse().join("/") : "—";

/* Client-side net bank minutes calculation (mirrors TimeCard logic) */
function calcNetForBank(
  entries: Array<{ time: string; type: string }>,
  expected: number,
  lunch: number,
): number {
  const pt = (t: string) => t.includes("T") ? t.split("T")[1].substring(0, 5) : t.substring(0, 5);
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const sorted = [...entries].sort((a, b) => pt(a.time).localeCompare(pt(b.time)));
  let raw = 0, pairs = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    if (sorted[i].type === "IN" && sorted[i + 1].type === "OUT") {
      raw += toMin(pt(sorted[i + 1].time)) - toMin(pt(sorted[i].time));
      pairs++;
    }
  }
  const net = pairs === 1 && lunch > 0 ? Math.max(0, raw - lunch) : raw;
  return net - expected;
}

const AVATAR_COLORS = [
  "from-blue-500 to-blue-600","from-indigo-500 to-indigo-600","from-purple-500 to-purple-600",
  "from-emerald-500 to-emerald-600","from-amber-500 to-amber-600","from-pink-500 to-pink-600",
  "from-sky-500 to-sky-600","from-teal-500 to-teal-600",
];
const avatarColor = (id: string) =>
  AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

/* ══════════════════════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════════════════════ */
export default function Employees() {
  /* ── State ─────────────────────────────────────────────────────────────── */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ATIVO" | "INATIVO">("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Side drawer
  const [drawerEmp, setDrawerEmp] = useState<Employee | null>(null);
  const [drawerTab, setDrawerTab] = useState("geral");

  // Edit / Delete
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [editTab, setEditTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteShowPass, setDeleteShowPass] = useState(false);

  const { profile } = useAuthStore();

  // Bank of hours
  const [bankEntries, setBankEntries] = useState<BankEntry[]>([]);
  const [bankTotal, setBankTotal] = useState(0);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankComputedTotal, setBankComputedTotal] = useState<number | null>(null);
  const [bMin, setBMin] = useState("");
  const [bDesc, setBDesc] = useState("");
  const [bDate, setBDate] = useState("");
  const [bType, setBType] = useState<"credit" | "debit">("credit");
  const [bSaving, setBSaving] = useState(false);
  const [zeroingBank, setZeroingBank] = useState(false);
  const [confirmZero, setConfirmZero] = useState(false);
  // Bank entry editing
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryForm, setEditEntryForm] = useState<{ bMin: string; bDesc: string; bDate: string; bType: "credit" | "debit" }>({ bMin: "", bDesc: "", bDate: "", bType: "credit" });
  const [editEntrySaving, setEditEntrySaving] = useState(false);

  // Batch registration
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchParsed, setBatchParsed] = useState<Array<{ name: string; registration: string; email?: string; phone?: string; role_title?: string; department_id?: string; schedule_id?: string }>>([]);
  const [batchSaving, setBatchSaving] = useState(false);

  /* ── Data loading ──────────────────────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [er, dr, sr] = await Promise.all([
        fetch("/api/employees").then(r => r.json()),
        fetch("/api/departments").then(r => r.json()),
        fetch("/api/schedules").then(r => r.json()),
      ]);
      setEmployees(er.employees || []);
      setDepartments(dr.departments || []);
      setSchedules(sr.schedules || []);
    } catch { toast.error("Erro ao carregar dados"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Actions ────────────────────────────────────────────────────────────── */
  const openEdit = async (emp: Employee, tab = "personal") => {
    setEditTarget(emp);
    setEditForm({ ...emp, admission_date: emp.admission_date?.substring(0, 10) ?? "" });
    setEditTab(tab);
    setBankEntries([]); setBankTotal(0); setBankLoading(true); setBankComputedTotal(null);
    try {
      const now = new Date();
      const [bankRes, attRes] = await Promise.all([
        fetch("/api/time-bank/" + emp.id).then(x => x.json()),
        fetch(`/api/attendance/${emp.id}?year=${now.getFullYear()}&month=${now.getMonth() + 1}`).then(x => x.json()),
      ]);

      const entries: any[] = bankRes.entries || [];
      const seedTotal: number = bankRes.totalMinutes || 0;
      setBankEntries(entries);
      setBankTotal(seedTotal);

      // Determine cutoff from latest entry date
      let cutoff: { year: number; month: number } | null = null;
      if (entries.length) {
        const latest = entries.map((e: any) => (e.date ?? "").substring(0, 10)).filter(Boolean).sort().at(-1);
        if (latest) {
          const [y, m] = latest.split("-").map(Number);
          cutoff = { year: y, month: m };
        }
      }

      // Compute current month bank from attendance records
      const records: any[] = attRes.records || [];
      const expectedWork = emp.schedules?.expected_work ?? 480;
      const lunchMin = emp.schedules?.lunch_minutes ?? 60;
      let monthBank = 0;
      for (const rec of records) {
        const te = rec.time_entries || [];
        if (["NORMAL", "COMPENSATION"].includes(rec.status) && te.length >= 2) {
          monthBank += calcNetForBank(te, expectedWork, lunchMin);
        } else if (rec.status === "ABSENCE") {
          monthBank -= expectedWork;
        }
      }

      // Apply cutoff logic (same as TimeCard)
      const cy = now.getFullYear(), cm = now.getMonth() + 1;
      const afterCutoff = !cutoff || (cy > cutoff.year || (cy === cutoff.year && cm >= cutoff.month));
      const rawTotal = afterCutoff ? seedTotal + monthBank : seedTotal;
      const realTotal = rawTotal - (emp.pin_project ? 2400 : 0);
      setBankComputedTotal(realTotal);
    } catch {
      setBankComputedTotal(null);
    } finally { setBankLoading(false); }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const isNew = !editTarget.id;
      const url = isNew ? "/api/employees" : "/api/employees/" + editTarget.id;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name, registration: editForm.registration,
          cpf: editForm.cpf || null, email: editForm.email || null,
          phone: editForm.phone || null, role_title: editForm.role_title || null,
          admission_date: editForm.admission_date || null,
          department_id: editForm.department_id || null,
          schedule_id: editForm.schedule_id || null,
          pin_project: editForm.pin_project ?? false,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (isNew) {
        setEmployees(prev => [d.employee, ...prev]);
        toast.success("Funcionário cadastrado!");
      } else {
        setEmployees(prev => prev.map(e => e.id === editTarget.id ? { ...e, ...d.employee } : e));
        if (drawerEmp?.id === editTarget.id) setDrawerEmp(p => p ? { ...p, ...d.employee } : null);
        toast.success("Funcionário atualizado!");
      }
      setEditTarget(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (emp: Employee) => {
    const next = (emp.status ?? "ATIVO") === "ATIVO" ? "INATIVO" : "ATIVO";
    const r = await fetch("/api/employees/" + emp.id + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!r.ok) { toast.error("Erro ao alterar status"); return; }
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: next } : e));
    if (drawerEmp?.id === emp.id) setDrawerEmp(p => p ? { ...p, status: next } : null);
    toast.success(next === "ATIVO" ? "Funcionário ativado" : "Funcionário desativado");
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    if (!deletePassword.trim()) { toast.error("Informe sua senha para confirmar"); return; }
    setDeleting(true);
    try {
      // Verify password before deleting
      const email = profile?.email ?? "";
      if (!email) throw new Error("Usuário não autenticado");
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: deletePassword });
      if (authError) { toast.error("Senha incorreta"); setDeleting(false); return; }

      const r = await fetch("/api/employees/" + deleteTarget.id, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro ao excluir");
      setEmployees(prev => prev.filter(e => e.id !== deleteTarget.id));
      if (drawerEmp?.id === deleteTarget.id) setDrawerEmp(null);
      setDeleteTarget(null);
      setDeletePassword("");
      toast.success("Funcionário excluído");
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  const addBankEntry = async () => {
    if (!editTarget || !bMin) { toast.error("Informe as horas (HHH:MM:SS)"); return; }
    const [hh, mm] = bMin.split(":").map(Number);
    const minutes = ((hh || 0) * 60) + (mm || 0);
    if (isNaN(minutes) || minutes <= 0) { toast.error("Valor inválido"); return; }
    setBSaving(true);
    try {
      const r = await fetch("/api/time-bank/" + editTarget.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes, type: bType,
          date: bDate || new Date().toISOString().substring(0, 10),
          description: bDesc,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setBankEntries(prev => [d.entry, ...prev]);
      setBankTotal(prev => prev + d.entry.minutes);
      setBankComputedTotal(prev => prev !== null ? prev + d.entry.minutes : null);
      setBMin(""); setBDesc(""); setBDate("");
      toast.success("Lançamento adicionado");
    } catch (e: any) { toast.error("Banco de horas: " + (e.message || "Erro desconhecido")); }
    finally { setBSaving(false); }
  };

  const deleteBankEntry = async (entryId: string, entryMinutes: number) => {
    try {
      const r = await fetch("/api/time-bank/entry/" + entryId, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setBankEntries(prev => prev.filter(e => e.id !== entryId));
      setBankTotal(prev => prev - entryMinutes);
      setBankComputedTotal(prev => prev !== null ? prev - entryMinutes : null);
      toast.success("Lançamento excluído");
    } catch (e: any) { toast.error("Erro ao excluir: " + e.message); }
  };

  const startEditEntry = (entry: BankEntry) => {
    const absMin = Math.abs(entry.minutes);
    const hh = String(Math.floor(absMin / 60)).padStart(3, "0");
    const mm = String(absMin % 60).padStart(2, "0");
    setEditingEntryId(entry.id);
    setEditEntryForm({
      bMin: `${hh}:${mm}:00`,
      bDesc: entry.description ?? "",
      bDate: entry.date,
      bType: entry.minutes >= 0 ? "credit" : "debit",
    });
  };

  const saveEditEntry = async (entry: BankEntry) => {
    setEditEntrySaving(true);
    try {
      const [hh, mm] = editEntryForm.bMin.split(":").map(Number);
      const minutes = ((hh || 0) * 60) + (mm || 0);
      if (isNaN(minutes) || minutes <= 0) { toast.error("Valor inválido"); return; }
      const r = await fetch("/api/time-bank/entry/" + entry.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes, type: editEntryForm.bType, date: editEntryForm.bDate, description: editEntryForm.bDesc }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setBankEntries(prev => prev.map(e => e.id === entry.id ? d.entry : e));
      setBankTotal(prev => prev - entry.minutes + d.entry.minutes);
      setBankComputedTotal(prev => prev !== null ? prev - entry.minutes + d.entry.minutes : null);
      setEditingEntryId(null);
      toast.success("Lançamento atualizado");
    } catch (e: any) { toast.error("Erro ao salvar: " + e.message); }
    finally { setEditEntrySaving(false); }
  };

  const zeroBankBalance = async () => {
    if (!editTarget || bankComputedTotal === null) return;
    if (bankComputedTotal === 0) { toast.success("Saldo já está em 00:00"); setConfirmZero(false); return; }
    setZeroingBank(true);
    try {
      // Insert a correction entry that brings real total to exactly 0
      const correctionMinutes = -bankComputedTotal;
      const r = await fetch("/api/time-bank/" + editTarget.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes: correctionMinutes,
          type: correctionMinutes >= 0 ? "credit" : "debit",
          date: new Date().toISOString().substring(0, 10),
          description: "Correção/Zeragem de saldo",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setBankEntries(prev => [d.entry, ...prev]);
      setBankTotal(prev => prev + d.entry.minutes);
      setBankComputedTotal(0);
      setConfirmZero(false);
      toast.success("Saldo zerado com sucesso");
    } catch (e: any) { toast.error("Erro ao zerar saldo: " + e.message); }
    finally { setZeroingBank(false); }
  };

  const sf = (k: keyof Employee, v: string) => setEditForm(p => ({ ...p, [k]: v }));

  const parseBatch = () => {
    const lines = batchText.trim().split("\n").filter(l => l.trim());
    const parsed = lines.map(line => {
      const parts = line.split(",").map(p => p.trim());
      return {
        name: parts[0] ?? "",
        registration: parts[1] ?? "",
        email: parts[2] || undefined,
        phone: parts[3] || undefined,
        role_title: parts[4] || undefined,
        department_id: departments.find(d => d.name.toLowerCase() === (parts[5] ?? "").toLowerCase())?.id || undefined,
        schedule_id: schedules.find(s => s.name.toLowerCase() === (parts[6] ?? "").toLowerCase())?.id || undefined,
      };
    }).filter(e => e.name && e.registration);
    setBatchParsed(parsed);
  };

  const saveBatch = async () => {
    setBatchSaving(true);
    let ok = 0, errCount = 0;
    for (const emp of batchParsed) {
      try {
        const r = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emp),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        ok++;
      } catch { errCount++; }
    }
    await loadAll();
    setBatchOpen(false); setBatchText(""); setBatchParsed([]);
    setBatchSaving(false);
    if (ok > 0) toast.success(`${ok} funcionário${ok > 1 ? "s" : ""} cadastrado${ok > 1 ? "s" : ""}!`);
    if (errCount > 0) toast.error(`${errCount} erro${errCount > 1 ? "s" : ""} ao salvar (matrículas já existentes?)`);
  };

  /* ── Derived data ────────────────────────────────────────────────────────── */
  const filtered = useMemo(() =>
    employees.filter(e => {
      if (statusFilter !== "all" && (e.status ?? "ATIVO") !== statusFilter) return false;
      if (deptFilter !== "all" && e.department_id !== deptFilter) return false;
      const term = search.trim().toLowerCase();
      return !term || [e.name, e.registration, e.email, e.role_title, e.departments?.name]
        .some(x => x?.toLowerCase().includes(term));
    }), [employees, search, statusFilter, deptFilter]);

  const activeCount = employees.filter(e => (e.status ?? "ATIVO") === "ATIVO").length;
  const inactiveCount = employees.length - activeCount;

  const kpis = [
    { label: "Total", value: employees.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50 border-blue-100", trend: "+3%" },
    { label: "Ativos", value: activeCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", trend: "" },
    { label: "Inativos", value: inactiveCount, icon: Circle, color: "text-slate-500", bg: "bg-slate-50 border-slate-100", trend: "" },
    { label: "Setores", value: departments.length, icon: Building2, color: "text-purple-600", bg: "bg-purple-50 border-purple-100", trend: "" },
  ];

  /* ─────────────────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-full gap-6">
      {/* Main pane */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("flex-1 min-w-0 space-y-6 transition-all duration-300", drawerEmp && "opacity-50 pointer-events-none")}
      >

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Início</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">Funcionários</span>
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-tight">
              Funcionários
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie colaboradores, jornadas e banco de horas
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="rounded-xl h-9 gap-2 border-border text-muted-foreground hover:text-foreground">
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-9 gap-2 border-border text-muted-foreground hover:text-foreground"
              onClick={() => setBatchOpen(true)}
            >
              <Upload className="w-3.5 h-3.5" /> Cadastrar em Lote
            </Button>
            <Button
              size="sm"
              className="rounded-xl h-9 gap-2 shadow-md shadow-primary/20"
              onClick={() => {
                setEditTarget({ id: "", name: "", registration: "", status: "ATIVO" } as Employee);
                setEditForm({ name: "", registration: "", status: "ATIVO" });
                setEditTab("personal");
              }}
            >
              <UserPlus className="w-3.5 h-3.5" /> Novo Funcionário
            </Button>
          </div>
        </div>

        {/* ── KPI cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="rounded-[20px] border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center", k.bg)}>
                      <k.icon className={cn("w-5 h-5", k.color)} />
                    </div>
                    {k.trend && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <ArrowUpRight className="w-3 h-3" />{k.trend}
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold tracking-tight">{k.value}</div>
                    <div className="text-sm text-muted-foreground mt-0.5 font-medium">{k.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Filter bar ────────────────────────────────────────────────── */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, matrícula, e-mail, setor..."
              className="pl-9 h-10 rounded-xl bg-card border-border/70 focus-visible:ring-primary/30"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status pills */}
          <div className="flex bg-muted/60 rounded-xl p-1 gap-0.5 border border-border/50">
            {(["all", "ATIVO", "INATIVO"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  statusFilter === s
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "all" ? "Todos" : s === "ATIVO" ? "Ativos" : "Inativos"}
              </button>
            ))}
          </div>

          {/* Dept filter */}
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[180px] rounded-xl h-10 border-border/70">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left truncate text-sm">
                {deptFilter === "all"
                  ? <span className="text-muted-foreground">Todos os setores</span>
                  : (departments.find(d => d.id === deptFilter)?.name ?? "Setor")
                }
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos os setores</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(v => !v)}
            className={cn("rounded-xl h-10 gap-2 border-border/70", showFilters && "border-primary text-primary bg-primary/5")}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
          </Button>

          {(search || statusFilter !== "all" || deptFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); }}
              className="rounded-xl h-10 text-muted-foreground hover:text-foreground gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Limpar
            </Button>
          )}

          <div className="ml-auto">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border/50">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── Enterprise data grid ───────────────────────────────────────── */}
        <Card className="rounded-[24px] border-border shadow-lg shadow-black/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC] border-border/70">
                <TableHead className="pl-6 py-3.5 text-[11px] uppercase tracking-[0.08em] font-bold text-slate-400 w-[280px]">
                  Funcionário
                </TableHead>
                <TableHead className="py-3.5 text-[11px] uppercase tracking-[0.08em] font-bold text-slate-400">
                  Setor / Cargo
                </TableHead>
                <TableHead className="py-3.5 text-[11px] uppercase tracking-[0.08em] font-bold text-slate-400">
                  Jornada
                </TableHead>
                <TableHead className="py-3.5 text-[11px] uppercase tracking-[0.08em] font-bold text-slate-400">
                  Contato
                </TableHead>
                <TableHead className="py-3.5 text-[11px] uppercase tracking-[0.08em] font-bold text-slate-400">
                  Admissão
                </TableHead>
                <TableHead className="py-3.5 text-[11px] uppercase tracking-[0.08em] font-bold text-slate-400 w-[100px]">
                  Status
                </TableHead>
                <TableHead className="py-3.5 pr-4 w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j} className="py-4">
                      <div className={cn(
                        "h-3 rounded-full bg-muted animate-pulse",
                        j === 0 ? "w-40" : j === 6 ? "w-8" : "w-24"
                      )} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-3xl bg-muted/60 flex items-center justify-center">
                        <Users className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="font-semibold text-foreground">Nenhum resultado</p>
                      <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!loading && filtered.map(emp => {
                const isActive = (emp.status ?? "ATIVO") === "ATIVO";
                return (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group border-border/50 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    onClick={() => setDrawerEmp(emp)}
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-xs shadow-sm bg-gradient-to-br",
                            avatarColor(emp.id)
                          )}>
                            {ini(emp.name)}
                          </div>
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                            isActive ? "bg-emerald-500" : "bg-slate-300"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground leading-tight truncate">{emp.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono tracking-wider uppercase mt-0.5">
                            #{emp.registration}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="text-xs font-semibold text-foreground">
                            {emp.departments?.name ?? "—"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 pl-5">{emp.role_title ?? "—"}</p>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {emp.schedules?.name ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="text-xs text-muted-foreground">{emp.schedules.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{emp.email ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                          <Phone className="w-3 h-3 shrink-0" />
                          {emp.phone ?? "—"}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CalendarDays className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                        {fmtDate(emp.admission_date)}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-300")} />
                        {isActive ? "Ativo" : "Inativo"}
                      </div>
                    </TableCell>

                    <TableCell className="pr-4 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          title={isActive ? "Desativar" : "Ativar"}
                          onClick={() => toggleStatus(emp)}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                            isActive
                              ? "text-amber-500 hover:bg-amber-50"
                              : "text-emerald-500 hover:bg-emerald-50"
                          )}
                        >
                          {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          title="Editar"
                          onClick={() => openEdit(emp)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Excluir"
                          onClick={() => setDeleteTarget(emp)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          Right Drawer — Employee Detail Panel
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {drawerEmp && (
          <motion.div
            key="drawer"
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="w-[380px] shrink-0 bg-card border border-border rounded-[28px] shadow-2xl shadow-black/10 flex flex-col h-fit sticky top-6 max-h-[calc(100vh-5rem)] overflow-hidden"
          >
            {/* Drawer header */}
            <div className="relative p-6 border-b border-border bg-gradient-to-br from-slate-50 to-white">
              <button
                onClick={() => setDrawerEmp(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-3xl flex items-center justify-center text-white font-bold text-lg shadow-lg bg-gradient-to-br",
                  avatarColor(drawerEmp.id)
                )}>
                  {ini(drawerEmp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-base leading-tight">{drawerEmp.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {drawerEmp.role_title ?? "Colaborador"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                      (drawerEmp.status ?? "ATIVO") === "ATIVO"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", (drawerEmp.status ?? "ATIVO") === "ATIVO" ? "bg-emerald-500" : "bg-slate-300")} />
                      {(drawerEmp.status ?? "ATIVO") === "ATIVO" ? "Ativo" : "Inativo"}
                    </div>
                    {drawerEmp.departments && (
                      <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                        {drawerEmp.departments.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="flex-1 rounded-xl h-9 gap-2 shadow-sm shadow-primary/20 text-xs"
                  onClick={() => openEdit(drawerEmp)}
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-9 gap-2 border-border text-xs"
                  onClick={() => toggleStatus(drawerEmp)}
                >
                  {(drawerEmp.status ?? "ATIVO") === "ATIVO"
                    ? <><UserX className="w-3.5 h-3.5 text-amber-500" /> Desativar</>
                    : <><UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Ativar</>
                  }
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-9 w-9 border-border text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(drawerEmp)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Drawer tabs */}
            <Tabs value={drawerTab} onValueChange={setDrawerTab} className="flex flex-col flex-1 min-h-0">
              <div className="px-4 pt-3 border-b border-border">
                <TabsList className="bg-transparent p-0 h-auto gap-1 w-full justify-start">
                  {[["geral", "Geral"], ["jornada", "Jornada"], ["contato", "Contato"]].map(([v, l]) => (
                    <TabsTrigger
                      key={v}
                      value={v}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-xs px-3 pb-2.5 h-auto font-semibold text-muted-foreground"
                    >
                      {l}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="geral" className="m-0 p-5 space-y-4">
                  {[
                    { icon: Hash, label: "Matrícula", val: drawerEmp.registration },
                    { icon: Hash, label: "CPF", val: drawerEmp.cpf || "—" },
                    { icon: Building2, label: "Setor", val: drawerEmp.departments?.name || "—" },
                    { icon: Briefcase, label: "Cargo", val: drawerEmp.role_title || "—" },
                    { icon: Clock, label: "Jornada", val: drawerEmp.schedules?.name || "—" },
                    { icon: CalendarDays, label: "Admissão", val: fmtDate(drawerEmp.admission_date) },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                        <row.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">{row.label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{row.val}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="jornada" className="m-0 p-5 space-y-3">
                  {drawerEmp.schedules ? (
                    <div className="rounded-2xl border border-border p-4 bg-muted/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-purple-600" />
                        </div>
                        <p className="font-bold text-sm text-foreground">{drawerEmp.schedules.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Carga diária: <strong className="text-foreground">{Math.floor(drawerEmp.schedules.expected_work / 60)}h {drawerEmp.schedules.expected_work % 60 > 0 ? (drawerEmp.schedules.expected_work % 60) + "min" : ""}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Sem jornada vinculada</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl h-9 border-border gap-2 text-xs"
                    onClick={() => openEdit(drawerEmp, "work")}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Alterar jornada
                  </Button>
                </TabsContent>

                <TabsContent value="contato" className="m-0 p-5 space-y-3">
                  {[
                    { icon: Mail, label: "E-mail", val: drawerEmp.email || "—" },
                    { icon: Phone, label: "Telefone", val: drawerEmp.phone || "—" },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                        <row.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">{row.label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{row.val}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          Edit Dialog — Enterprise Redesign
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent
          showCloseButton={false}
          className="
            w-[min(1100px,95vw)] sm:max-w-[min(1100px,95vw)]
            max-h-[90vh] h-[90vh]
            p-0 gap-0 rounded-2xl
            overflow-hidden flex flex-col
            shadow-2xl shadow-black/25
            border border-border/60
          "
        >
          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <div className="shrink-0 flex items-center gap-5 px-10 py-5 bg-white border-b border-border/70">
            {/* Avatar */}
            {editTarget && (
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md bg-gradient-to-br shrink-0 select-none",
                avatarColor(editTarget.id)
              )}>
                {ini(editTarget.name)}
              </div>
            )}
            {/* Name + meta */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {editTarget?.id ? editTarget?.name : "Novo Funcionário"}
              </p>
              <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                {editTarget?.id && (
                  <span className="shrink-0 text-xs text-muted-foreground font-mono bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                    Mat. {editTarget?.registration}
                  </span>
                )}
                {editTarget && (
                  <span className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                    (editTarget.status ?? "ATIVO") === "ATIVO"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      (editTarget.status ?? "ATIVO") === "ATIVO" ? "bg-emerald-500" : "bg-slate-300"
                    )} />
                    {(editTarget.status ?? "ATIVO") === "ATIVO" ? "Ativo" : "Inativo"}
                  </span>
                )}
              </div>
            </div>
            {/* Close */}
            <button
              onClick={() => setEditTarget(null)}
              className="shrink-0 w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── TAB BAR ────────────────────────────────────────────────────── */}
          <div className="shrink-0 flex border-b border-border/60 bg-white px-10 overflow-x-auto">
            {([
              { v: "personal", label: "Dados Pessoais",          icon: User },
              { v: "work",     label: "Setor / Cargo / Jornada", icon: Building2 },
              ...(editTarget?.id ? [{ v: "bank", label: "Banco de Horas", icon: Clock }] : []),
            ] as const).map(t => (
              <button
                key={t.v}
                onClick={() => setEditTab(t.v)}
                className={cn(
                  "flex items-center gap-2.5 px-6 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap shrink-0",
                  editTab === t.v
                    ? "border-primary text-primary bg-primary/[0.03]"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-[#FAFBFC]">
            <div className="px-10 py-8 max-w-full">

              {/* ── PERSONAL TAB ──────────────────────────────────────────── */}
              {editTab === "personal" && (
                <div className="space-y-8">
                  {/* Section: Identificação */}
                  <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">
                      Identificação
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FI
                        label="Nome Completo"
                        value={editForm.name ?? ""}
                        onChange={v => sf("name", v)}
                        cls="sm:col-span-2"
                      />
                      <FI label="Matrícula"  value={editForm.registration ?? ""} onChange={v => sf("registration", v)} />
                      <FI label="CPF"        value={editForm.cpf ?? ""}          onChange={v => sf("cpf", v)} />
                    </div>
                  </section>

                  {/* Section: Contato */}
                  <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">
                      Contato
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FI label="E-mail"   value={editForm.email ?? ""}  onChange={v => sf("email", v)}  type="email" />
                      <FI label="Telefone" value={editForm.phone ?? ""}  onChange={v => sf("phone", v)} />
                    </div>
                  </section>

                  {/* Section: Contratação */}
                  <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">
                      Contratação
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FI
                        label="Data de Admissão"
                        value={editForm.admission_date ?? ""}
                        onChange={v => sf("admission_date", v)}
                        type="date"
                      />
                    </div>
                  </section>
                </div>
              )}

              {/* ── WORK TAB ──────────────────────────────────────────────── */}
              {editTab === "work" && (
                <div className="space-y-8">
                  <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">
                      Cargo e Função
                    </h3>
                    <div className="grid grid-cols-1 gap-5">
                      <FI
                        label="Cargo / Função"
                        value={editForm.role_title ?? ""}
                        onChange={v => sf("role_title", v)}
                      />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">
                      Lotação e Jornada
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Setor */}
                      <div className="space-y-2 min-w-0">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">
                          Setor
                        </Label>
                        <Select
                          value={editForm.department_id ?? "__none"}
                          onValueChange={v => sf("department_id", v === "__none" ? "" : v)}
                        >
                          <SelectTrigger className="rounded-xl h-12 border-border/80 bg-white w-full min-w-0 overflow-hidden">
                            <span className="flex-1 min-w-0 text-left text-sm truncate">
                              {editForm.department_id && editForm.department_id !== "__none"
                                ? (departments.find(d => d.id === editForm.department_id)?.name ?? editForm.department_id)
                                : <span className="text-muted-foreground">Selecionar setor...</span>
                              }
                            </span>
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl max-w-[min(420px,90vw)]">
                            <SelectItem value="__none">Sem setor</SelectItem>
                            {departments.map(d => (
                              <SelectItem key={d.id} value={d.id}>
                                <span className="truncate block max-w-[360px]">{d.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Jornada */}
                      <div className="space-y-2 min-w-0">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">
                          Jornada
                        </Label>
                        <Select
                          value={editForm.schedule_id ?? "__none"}
                          onValueChange={v => sf("schedule_id", v === "__none" ? "" : v)}
                        >
                          <SelectTrigger className="rounded-xl h-12 border-border/80 bg-white w-full min-w-0 overflow-hidden">
                            <span className="flex-1 min-w-0 text-left text-sm truncate">
                              {editForm.schedule_id && editForm.schedule_id !== "__none"
                                ? (schedules.find(s => s.id === editForm.schedule_id)?.name ?? editForm.schedule_id)
                                : <span className="text-muted-foreground">Selecionar jornada...</span>
                              }
                            </span>
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl max-w-[min(420px,90vw)]">
                            <SelectItem value="__none">Sem jornada</SelectItem>
                            {schedules.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                <span className="truncate block max-w-[360px]">{s.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">
                      Projeto PIN
                    </h3>
                    <div className={cn(
                      "flex items-center justify-between px-4 py-4 rounded-2xl border-2 transition-colors",
                      editForm.pin_project
                        ? "bg-indigo-50 border-indigo-200"
                        : "bg-muted/20 border-border"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center",
                          editForm.pin_project ? "bg-indigo-100" : "bg-muted"
                        )}>
                          <span className={cn("text-base font-black", editForm.pin_project ? "text-indigo-600" : "text-muted-foreground")}>P</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Participa do Projeto PIN</p>
                          <p className="text-[11px] text-muted-foreground">
                            {editForm.pin_project
                              ? "Meta de +40h extras mensais ativas"
                              : "Cumpre jornada padrão sem meta extra"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={!!editForm.pin_project}
                        onCheckedChange={v => sf("pin_project", v as any)}
                      />
                    </div>
                  </section>
                </div>
              )}

              {/* ── BANK TAB ──────────────────────────────────────────────── */}
              {editTab === "bank" && (
                <div className="space-y-5">
                  {/* Real accumulated balance card */}
                  <div className={cn(
                    "p-5 rounded-2xl border-2",
                    bankComputedTotal !== null && bankComputedTotal >= 0
                      ? "bg-emerald-50 border-emerald-200"
                      : bankComputedTotal !== null && bankComputedTotal < 0
                      ? "bg-red-50 border-red-200"
                      : "bg-muted/20 border-border"
                  )}>
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                        bankComputedTotal !== null && bankComputedTotal >= 0 ? "bg-emerald-100" : "bg-red-100"
                      )}>
                        {bankComputedTotal === null
                          ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
                          : bankComputedTotal >= 0
                          ? <TrendingUp className="w-6 h-6 text-emerald-700" />
                          : <TrendingDown className="w-6 h-6 text-red-700" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">
                          Saldo Real Acumulado
                        </p>
                        {bankComputedTotal !== null ? (
                          <p className={cn(
                            "text-3xl font-bold font-mono leading-none",
                            bankComputedTotal >= 0 ? "text-emerald-700" : "text-red-700"
                          )}>
                            {bankComputedTotal >= 0 ? "+" : ""}{hhmmBank(bankComputedTotal)}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">Calculando...</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Saldo base + competência atual{editTarget?.pin_project ? " − 40h (Projeto PIN)" : ""}
                        </p>
                      </div>
                    </div>
                    {/* Breakdown row */}
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-current/10">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Saldo Base</p>
                        <p className="text-sm font-mono font-bold">{hhmm(bankTotal)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Lançamentos</p>
                        <p className="text-sm font-bold">{bankEntries.length}</p>
                      </div>
                      {editTarget?.pin_project && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Dedução PIN</p>
                          <p className="text-sm font-mono font-bold text-amber-600">−40:00</p>
                        </div>
                      )}
                    </div>

                    {/* Zerar Saldo */}
                    {bankComputedTotal !== null && bankComputedTotal !== 0 && (
                      <div className="mt-4 pt-4 border-t border-current/10">
                        {!confirmZero ? (
                          <button
                            type="button"
                            onClick={() => setConfirmZero(true)}
                            className="text-[11px] font-semibold text-red-600 hover:text-red-700 underline underline-offset-2"
                          >
                            Zerar saldo acumulado
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-[11px] text-red-700 font-semibold">
                              Confirmar zeragem de {hhmmBank(Math.abs(bankComputedTotal))}? Isso insere um lançamento de correção.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs px-3"
                                onClick={zeroBankBalance}
                                disabled={zeroingBank}
                              >
                                {zeroingBank ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-3"
                                onClick={() => setConfirmZero(false)}
                                disabled={zeroingBank}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* New entry form */}
                  <div className="rounded-2xl border border-border bg-white p-6 space-y-5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                      Novo Lançamento
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tipo</Label>
                        <Select value={bType} onValueChange={v => setBType(v as "credit" | "debit")}>
                          <SelectTrigger className="rounded-xl h-11 bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="credit">Crédito (+)</SelectItem>
                            <SelectItem value="debit">Débito (−)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Horas (HHH:MM:SS)</Label>
                        <Input
                          type="text"
                          placeholder="000:00:00"
                          value={bMin}
                          onChange={e => setBMin(e.target.value)}
                          className="rounded-xl h-11 bg-white font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Data</Label>
                        <Input
                          type="date"
                          value={bDate}
                          onChange={e => setBDate(e.target.value)}
                          className="rounded-xl h-11 bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Descrição</Label>
                        <Input
                          placeholder="Motivo..."
                          value={bDesc}
                          onChange={e => setBDesc(e.target.value)}
                          className="rounded-xl h-11 bg-white"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={addBankEntry}
                      disabled={bSaving}
                      className="w-full rounded-xl h-11 gap-2 shadow-sm shadow-primary/20 font-semibold"
                    >
                      {bSaving
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Adicionando...</>
                        : <><Plus className="w-4 h-4" /> Adicionar Lançamento</>
                      }
                    </Button>
                  </div>

                  {/* History */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Histórico</p>
                    {bankLoading && (
                      <div className="py-12 flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                      </div>
                    )}
                    {!bankLoading && bankEntries.length === 0 && (
                      <div className="py-14 flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                          <Clock className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm text-muted-foreground">Nenhum lançamento registrado</p>
                      </div>
                    )}
                    {!bankLoading && bankEntries.length > 0 && (
                      <div className="rounded-2xl border border-border overflow-hidden bg-white">
                        {bankEntries.map((e, i) => (
                          <div key={e.id}>
                            {editingEntryId === e.id ? (
                              /* ── Inline edit row ── */
                              <div className={cn("px-4 py-3 bg-primary/5 border-b border-border/50 space-y-3", i === 0 && "")}>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tipo</Label>
                                    <Select value={editEntryForm.bType} onValueChange={v => setEditEntryForm(p => ({ ...p, bType: v as "credit" | "debit" }))}>
                                      <SelectTrigger className="rounded-lg h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent className="rounded-xl">
                                        <SelectItem value="credit">Crédito (+)</SelectItem>
                                        <SelectItem value="debit">Débito (−)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">HH:MM</Label>
                                    <Input type="text" placeholder="000:00:00" value={editEntryForm.bMin} onChange={ev => setEditEntryForm(p => ({ ...p, bMin: ev.target.value }))} className="rounded-lg h-9 bg-white text-xs font-mono" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data</Label>
                                    <Input type="date" value={editEntryForm.bDate} onChange={ev => setEditEntryForm(p => ({ ...p, bDate: ev.target.value }))} className="rounded-lg h-9 bg-white text-xs" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Descrição</Label>
                                    <Input placeholder="Motivo..." value={editEntryForm.bDesc} onChange={ev => setEditEntryForm(p => ({ ...p, bDesc: ev.target.value }))} className="rounded-lg h-9 bg-white text-xs" />
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button variant="outline" size="sm" onClick={() => setEditingEntryId(null)} className="rounded-lg h-8 text-xs px-3">Cancelar</Button>
                                  <Button size="sm" onClick={() => saveEditEntry(e)} disabled={editEntrySaving} className="rounded-lg h-8 text-xs px-3 gap-1.5">
                                    {editEntrySaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Salvar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* ── Normal row ── */
                              <div className={cn(
                                "flex items-center gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-slate-50 group",
                                i > 0 && "border-t border-border/50"
                              )}>
                                <div className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                  e.minutes >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                )}>
                                  {e.minutes >= 0
                                    ? <TrendingUp className="w-3.5 h-3.5" />
                                    : <TrendingDown className="w-3.5 h-3.5" />
                                  }
                                </div>
                                <span className="font-mono text-xs text-muted-foreground shrink-0 w-24">
                                  {e.date}
                                </span>
                                <span className="flex-1 text-muted-foreground text-xs min-w-0 truncate">
                                  {e.description ?? "—"}
                                </span>
                                <span className={cn(
                                  "font-mono font-bold shrink-0 text-sm",
                                  e.minutes >= 0 ? "text-emerald-600" : "text-red-600"
                                )}>
                                  {e.minutes > 0 ? "+" : ""}{hhmm(e.minutes)}
                                </span>
                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                  <button
                                    title="Editar"
                                    onClick={() => startEditEntry(e)}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    title="Excluir"
                                    onClick={() => deleteBankEntry(e.id, e.minutes)}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── FOOTER FIXO ─────────────────────────────────────────────────── */}
          <div className="shrink-0 flex items-center gap-4 px-10 py-5 bg-white border-t border-border/70">
            <p className="flex-1 text-xs text-muted-foreground hidden md:block">
              Apenas os campos alterados serão salvos
            </p>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              className="rounded-xl h-12 px-7 border-border text-muted-foreground hover:text-foreground font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveEdit}
              disabled={saving}
              className="rounded-xl h-12 px-9 gap-2.5 font-bold text-sm text-white bg-[#0f2044] hover:bg-[#1a3a6b] shadow-lg shadow-black/20 disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-4 h-4" /> {editTarget?.id ? "Salvar Alterações" : "Cadastrar Funcionário"}</>
              )}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) { setDeleteTarget(null); setDeletePassword(""); setDeleteShowPass(false); } }}>
        <DialogContent className="max-w-sm rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Excluir Funcionário
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Deseja excluir permanentemente <strong className="text-foreground">{deleteTarget?.name}</strong>?
            Os registros de ponto vinculados serão mantidos.
          </p>
          <div className="space-y-1.5 mt-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Confirme sua senha de acesso
            </Label>
            <div className="relative">
              <Input
                type={deleteShowPass ? "text" : "password"}
                placeholder="••••••••"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doDelete()}
                className="rounded-xl h-10 pr-10"
                disabled={deleting}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setDeleteShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {deleteShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeletePassword(""); setDeleteShowPass(false); }} className="rounded-xl h-10">Cancelar</Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting || !deletePassword.trim()} className="rounded-xl h-10 px-6">
              {deleting ? "Verificando..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Batch Registration Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={batchOpen} onOpenChange={open => !open && (setBatchOpen(false), setBatchText(""), setBatchParsed([]))}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(860px,95vw)] sm:max-w-[min(860px,95vw)] max-h-[90vh] p-0 gap-0 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center gap-4 px-8 py-5 bg-white border-b border-border/70">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground">Cadastro em Lote</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cole os dados no formato CSV: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono">Nome, Matrícula, E-mail, Telefone, Cargo, Setor, Jornada</code>
              </p>
            </div>
            <button
              onClick={() => { setBatchOpen(false); setBatchText(""); setBatchParsed([]); }}
              className="shrink-0 w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-[#FAFBFC]">
            <div className="px-8 py-6 space-y-5">
              {/* Textarea */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">Dados (um funcionário por linha)</Label>
                <textarea
                  className="w-full h-52 rounded-xl border border-border/80 bg-white p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                  placeholder={`João Silva, 1001, joao@empresa.com, 11999999999, Analista, TI, Comercial 44h\nMaria Souza, 1002, maria@empresa.com, , Supervisora\nCarlos Santos, 1003`}
                  value={batchText}
                  onChange={e => { setBatchText(e.target.value); setBatchParsed([]); }}
                />
              </div>

              <Button
                variant="outline"
                onClick={parseBatch}
                disabled={!batchText.trim()}
                className="rounded-xl h-10 gap-2 border-primary/30 text-primary hover:bg-primary/5 font-semibold w-full"
              >
                <CheckCircle2 className="w-4 h-4" />
                Validar {batchText.trim().split("\n").filter(l => l.trim()).length} linha{batchText.trim().split("\n").filter(l => l.trim()).length !== 1 ? "s" : ""}
              </Button>

              {/* Preview */}
              {batchParsed.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                    Prévia — {batchParsed.length} funcionário{batchParsed.length !== 1 ? "s" : ""}
                  </p>
                  <div className="rounded-2xl border border-border overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-border">
                          {["Nome", "Matrícula", "E-mail", "Cargo", "Setor", "Jornada"].map(h => (
                            <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-slate-400 text-left whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {batchParsed.map((e, i) => (
                          <tr key={i} className={cn("hover:bg-slate-50", !e.name || !e.registration ? "bg-red-50" : "")}>
                            <td className="px-4 py-2.5 font-medium text-foreground">{e.name || <span className="text-red-500 italic">vazio</span>}</td>
                            <td className="px-4 py-2.5 font-mono text-muted-foreground">{e.registration || <span className="text-red-500 italic">vazio</span>}</td>
                            <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[140px]">{e.email ?? "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{e.role_title ?? "Colaborador"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {e.department_id ? (departments.find(d => d.id === e.department_id)?.name ?? "—") : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {e.schedule_id ? (schedules.find(s => s.id === e.schedule_id)?.name ?? "—") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center gap-4 px-8 py-5 bg-white border-t border-border/70">
            <p className="flex-1 text-xs text-muted-foreground hidden md:block">
              Linhas inválidas (sem nome ou matrícula) serão ignoradas
            </p>
            <Button
              variant="outline"
              onClick={() => { setBatchOpen(false); setBatchText(""); setBatchParsed([]); }}
              className="rounded-xl h-11 px-6 font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveBatch}
              disabled={batchSaving || batchParsed.length === 0}
              className="rounded-xl h-11 px-8 gap-2 font-bold shadow-lg shadow-primary/25"
            >
              {batchSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                : <><Save className="w-4 h-4" /> Cadastrar {batchParsed.length > 0 ? batchParsed.length : ""} Funcionário{batchParsed.length !== 1 ? "s" : ""}</>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ── Shared form input ─────────────────────────────────────────────────────── */
function FI({ label, value, onChange, type = "text", cls }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; cls?: string;
}) {
  return (
    <div className={cn("space-y-2 min-w-0", cls)}>
      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-xl h-12 w-full border-border/80 bg-white focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all"
      />
    </div>
  );
}
