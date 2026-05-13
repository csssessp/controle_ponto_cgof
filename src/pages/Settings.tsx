import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building, Clock, Users, Plus, Pencil, Trash2, Save, X,
  Building2, Phone, Mail, MapPin, Hash, Palette, Shield,
  Lock, Zap, ChevronRight, TrendingUp, Activity, Eye, EyeOff,
  Check, AlertCircle, CalendarDays, FileText, Star, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Dept = { id: string; name: string };
type Schedule = {
  id: string; name: string;
  start_time?: string; end_time?: string;
  lunch_minutes?: number; expected_work: number;
};
type Org = {
  id?: string; name?: string; cnpj?: string;
  address?: string; phone?: string; email?: string;
};

const ACCENT_COLORS = [
  { label: "Azul", value: "221 83% 53%", hex: "#2563eb" },
  { label: "Violeta", value: "262 83% 58%", hex: "#7c3aed" },
  { label: "Esmeralda", value: "160 84% 39%", hex: "#059669" },
  { label: "Âmbar", value: "38 92% 50%", hex: "#f59e0b" },
  { label: "Rosa", value: "336 80% 58%", hex: "#e11d79" },
  { label: "Ciano", value: "192 91% 36%", hex: "#0891b2" },
];

const SECTION_COLORS: Record<string, string> = {
  company:     "bg-blue-50   border-blue-100   text-blue-600",
  sectors:     "bg-indigo-50 border-indigo-100 text-indigo-600",
  schedules:   "bg-purple-50 border-purple-100 text-purple-600",
  holidays:    "bg-orange-50 border-orange-100 text-orange-600",
  users:       "bg-emerald-50 border-emerald-100 text-emerald-600",
  appearance:  "bg-pink-50   border-pink-100   text-pink-600",
  permissions: "bg-amber-50  border-amber-100  text-amber-600",
  security:    "bg-red-50    border-red-100    text-red-600",
  integrations:"bg-sky-50    border-sky-100    text-sky-600",
};

const SECTIONS = [
  { id: "company",     label: "Empresa",      desc: "Dados cadastrais da organização",  icon: Building,     status: "Configurado" },
  { id: "sectors",     label: "Setores",       desc: "Departamentos e estrutura",        icon: Building2,    status: "" },
  { id: "schedules",   label: "Jornadas",      desc: "Turnos e cargas horárias",        icon: Clock,        status: "" },
  { id: "holidays",    label: "Feriados",      desc: "Feriados, pontos facultativos e decreto", icon: CalendarDays, status: "" },
  { id: "users",       label: "Usuários",      desc: "Acesso e perfis do sistema",      icon: Users,        status: "" },
  { id: "appearance",  label: "Aparência",     desc: "Cores, tema e preferências",      icon: Palette,      status: "" },
  { id: "permissions", label: "Permissões",    desc: "Controles e níveis de acesso",    icon: Shield,       status: "" },
  { id: "security",    label: "Segurança",     desc: "Zona de perigo e sessões ativas", icon: Lock,         status: "" },
];

export default function Settings() {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [schedules,   setSchedules]   = useState<Schedule[]>([]);
  const [employees,   setEmployees]   = useState<any[]>([]);
  const [org,         setOrg]         = useState<Org>({});
  const [orgDraft,    setOrgDraft]    = useState<Org>({});
  const [savingOrg,   setSavingOrg]   = useState(false);

  const [activePanel, setActivePanel] = useState<string | null>(null);

  // Dept form
  const [deptEditing, setDeptEditing] = useState<Dept | null>(null);
  const [deptName,    setDeptName]    = useState("");
  const [deptSaving,  setDeptSaving]  = useState(false);

  // Schedule form
  const [schedEditing, setSchedEditing] = useState<Schedule | null>(null);
  const [schedForm,    setSchedForm]    = useState<Partial<Schedule>>({});
  const [schedSaving,  setSchedSaving]  = useState(false);

  // User form (removed — PanelUsers manages its own state)

  // Appearance
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0].value);

  const load = useCallback(async () => {
    try {
      const [dr, sr, er, or_] = await Promise.all([
        fetch("/api/departments").then(r => r.json()),
        fetch("/api/schedules").then(r => r.json()),
        fetch("/api/employees").then(r => r.json()),
        fetch("/api/organizations").then(r => r.json()),
      ]);
      setDepartments(dr.departments || []);
      setSchedules(sr.schedules || []);
      setEmployees(er.employees || []);
      const o = or_.organization || {};
      setOrg(o); setOrgDraft(o);
    } catch {
      toast.error("Erro ao carregar dados");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", accentColor);
  }, [accentColor]);

  // ── Org ──────────────────────────────────────────────────────────────────
  const saveOrg = async () => {
    setSavingOrg(true);
    try {
      const r = await fetch("/api/organizations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgDraft),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setOrg(d.organization);
      toast.success("Empresa salva!");
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingOrg(false); }
  };

  // ── Departments ───────────────────────────────────────────────────────────
  const saveDept = async (): Promise<boolean> => {
    if (!deptName.trim()) return false;
    setDeptSaving(true);
    try {
      const isEdit = !!deptEditing;
      const url = isEdit ? "/api/departments/" + deptEditing!.id : "/api/departments";
      const r = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deptName.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (isEdit) setDepartments(p => p.map(x => x.id === d.department.id ? d.department : x));
      else setDepartments(p => [...p, d.department]);
      setDeptEditing(null); setDeptName("");
      toast.success(isEdit ? "Setor atualizado" : "Setor criado");
      return true;
    } catch (e: any) { toast.error(e.message); return false; }
    finally { setDeptSaving(false); }
  };

  const deleteDept = async (id: string) => {
    if (!confirm("Excluir este setor?")) return;
    const r = await fetch("/api/departments/" + id, { method: "DELETE" });
    if (!r.ok) { toast.error("Erro ao excluir"); return; }
    setDepartments(p => p.filter(x => x.id !== id));
    toast.success("Setor excluído");
  };

  // ── Schedules ─────────────────────────────────────────────────────────────
  const saveSched = async (): Promise<boolean> => {
    if (!schedForm.name?.trim()) { toast.error("Nome obrigatório"); return false; }
    setSchedSaving(true);
    try {
      const isEdit = !!schedEditing;
      const body = {
        name:          schedForm.name,
        start_time:    schedForm.start_time ?? null,
        end_time:      schedForm.end_time   ?? null,
        expected_work: schedForm.expected_work ?? 480,
      };
      const url = isEdit ? "/api/schedules/" + schedEditing!.id : "/api/schedules";
      let r: Response;
      try {
        r = await fetch(url, {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (fetchErr: any) {
        toast.error("Sem conexão com o servidor: " + fetchErr.message);
        return false;
      }
      const d = await r.json();
      if (!r.ok) {
        const detail = [d.error, d.hint, d.details].filter(Boolean).join(" — ");
        toast.error("Erro ao salvar: " + (detail || d.code || "Erro desconhecido"));
        return false;
      }
      const s = d.schedule;
      if (isEdit) setSchedules(p => p.map(x => x.id === s.id ? s : x));
      else setSchedules(p => [...p, s]);
      setSchedEditing(null); setSchedForm({});
      toast.success(isEdit ? "Jornada atualizada!" : "Jornada criada!");
      return true;
    } catch (e: any) {
      toast.error("Erro inesperado: " + e.message);
      return false;
    } finally {
      setSchedSaving(false);
    }
  };

  const deleteSched = async (id: string) => {
    if (!confirm("Excluir esta jornada?")) return;
    const r = await fetch("/api/schedules/" + id, { method: "DELETE" });
    if (!r.ok) { toast.error("Erro ao excluir"); return; }
    setSchedules(p => p.filter(x => x.id !== id));
    toast.success("Jornada excluída");
  };

  // ── KPI data ──────────────────────────────────────────────────────────────
  const activeEmps = employees.filter(e => (e.status ?? "ATIVO") === "ATIVO").length;
  const kpis = [
    { label: "Funcionários", value: employees.length, sub: activeEmps + " ativos", icon: Users,    color: "text-blue-600",   bg: "bg-blue-50 border-blue-100" },
    { label: "Setores",      value: departments.length, sub: "departamentos",        icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
    { label: "Jornadas",     value: schedules.length,  sub: "configuradas",          icon: Clock,     color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
    { label: "Usuários",     value: 1,                 sub: "administrador",         icon: Shield,    color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-100" },
  ];

  // ── Recent activity (static) ───────────────────────────────────────────────
  const ACTIVITY = [
    { user: "Admin", action: "Carregou PDF de ponto", module: "Upload", time: "Hoje, 09:14", status: "ok" },
    { user: "Admin", action: "Editou jornada 'Turno Manhã'", module: "Jornadas", time: "Hoje, 08:52", status: "ok" },
    { user: "Admin", action: "Criou setor 'TI'", module: "Setores", time: "Ontem, 17:30", status: "ok" },
    { user: "Admin", action: "Atualizou dados da empresa", module: "Empresa", time: "Ontem, 14:10", status: "ok" },
  ];

  return (
    <div className="relative">
      {/* ── Main overview ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("space-y-8 transition-all duration-300", activePanel ? "opacity-40 pointer-events-none select-none" : "")}
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os parâmetros da plataforma ChronosAI.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="rounded-[20px] border-border shadow-sm hover:shadow-md transition-shadow cursor-default">
                <CardContent className="p-5">
                  <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center mb-4", k.bg)}>
                    <k.icon className={cn("w-5 h-5", k.color)} />
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-foreground">{k.value}</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">{k.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Config cards grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Configurações do Sistema
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SECTIONS.map((sec, i) => (
              <motion.button
                key={sec.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                onClick={() => setActivePanel(sec.id)}
                className={cn(
                  "relative text-left p-5 rounded-[20px] border bg-card hover:shadow-md transition-all",
                  "hover:-translate-y-0.5 group focus:outline-none focus:ring-2 focus:ring-primary/30"
                )}
              >
                <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center mb-4",
                  SECTION_COLORS[sec.id])}>
                  <sec.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm text-foreground">{sec.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{sec.desc}</p>
                {sec.status && (
                  <Badge className={cn("mt-3 text-[10px] rounded-full px-2 py-0.5 border font-semibold",
                    sec.status === "Em breve"
                      ? "bg-muted text-muted-foreground border-border"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    {sec.status}
                  </Badge>
                )}
                <ChevronRight className="absolute right-4 bottom-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Atividade Recente
          </h2>
          <Card className="rounded-[20px] border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                      {a.user.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0.5">
                      {a.module}
                    </Badge>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>

      {/* ── Overlay ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePanel(null)}
            className="fixed inset-0 z-30"
          />
        )}
      </AnimatePresence>

      {/* ── Right drawer panel ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            key="panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[500px] bg-background border-l border-border shadow-2xl z-40 flex flex-col"
          >
            {/* Panel header */}
            {(() => {
              const sec = SECTIONS.find(s => s.id === activePanel);
              if (!sec) return null;
              return (
                <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center",
                      SECTION_COLORS[sec.id])}>
                      <sec.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base">{sec.label}</p>
                      <p className="text-xs text-muted-foreground">{sec.desc}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActivePanel(null)}
                    className="rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              );
            })()}

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <PanelContent
                section={activePanel}
                org={orgDraft}
                setOrg={setOrgDraft}
                saveOrg={saveOrg}
                savingOrg={savingOrg}
                departments={departments}
                employees={employees}
                deptName={deptName}
                setDeptName={setDeptName}
                deptEditing={deptEditing}
                setDeptEditing={setDeptEditing}
                saveDept={saveDept}
                deptSaving={deptSaving}
                deleteDept={deleteDept}
                schedules={schedules}
                schedForm={schedForm}
                setSchedForm={setSchedForm}
                schedEditing={schedEditing}
                setSchedEditing={setSchedEditing}
                saveSched={saveSched}
                schedSaving={schedSaving}
                deleteSched={deleteSched}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Panel content router ────────────────────────────────────────────────────
function PanelContent(props: any) {
  const { section } = props;

  switch (section) {
    case "company":   return <PanelCompany {...props} />;
    case "sectors":   return <PanelSectors {...props} />;
    case "schedules": return <PanelSchedules {...props} />;
    case "holidays":  return <PanelHolidays />;
    case "users":     return <PanelUsers />;
    case "appearance":return <PanelAppearance {...props} />;
    case "permissions":return <PanelPermissions />;
    case "security":  return <PanelSecurity />;
    case "integrations": return <PanelIntegrations />;
    default: return null;
  }
}

// ── Feriados ─────────────────────────────────────────────────────────────────
const HOLIDAY_KEY = (year: number) => `chronos_holidays_${year}`;
type HolidayEntry = { date: string; name: string; type: "FERIADO" | "PONTO_FACULTATIVO" };
type HolidayConfig = { holidays: HolidayEntry[]; decree: string };

function loadHolidayConfig(year: number): HolidayConfig {
  try {
    const raw = localStorage.getItem(HOLIDAY_KEY(year));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { holidays: [], decree: "" };
}
function saveHolidayConfig(year: number, cfg: HolidayConfig) {
  localStorage.setItem(HOLIDAY_KEY(year), JSON.stringify(cfg));
}

function PanelHolidays() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [config, setConfig] = useState<HolidayConfig>(() => loadHolidayConfig(currentYear));
  const [newDate, setNewDate]   = useState("");
  const [newName, setNewName]   = useState("");
  const [newType, setNewType]   = useState<"FERIADO" | "PONTO_FACULTATIVO">("FERIADO");

  const changeYear = (y: number) => {
    setYear(y);
    setConfig(loadHolidayConfig(y));
  };

  const addHoliday = () => {
    if (!newDate || !newName.trim()) { toast.error("Preencha data e nome"); return; }
    const entry: HolidayEntry = { date: newDate, name: newName.trim(), type: newType };
    const updated = { ...config, holidays: [...config.holidays, entry].sort((a, b) => a.date.localeCompare(b.date)) };
    setConfig(updated);
    saveHolidayConfig(year, updated);
    setNewDate(""); setNewName("");
    toast.success("Feriado adicionado");
  };

  const removeHoliday = (idx: number) => {
    const updated = { ...config, holidays: config.holidays.filter((_, i) => i !== idx) };
    setConfig(updated);
    saveHolidayConfig(year, updated);
    toast.success("Feriado removido");
  };

  const saveDecree = () => {
    saveHolidayConfig(year, config);
    toast.success("Decreto salvo");
  };

  const fmtDate = (d: string) => d.split("-").reverse().join("/");
  const feriados = config.holidays.filter(h => h.type === "FERIADO");
  const facultativos = config.holidays.filter(h => h.type === "PONTO_FACULTATIVO");

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Ano</Label>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={() => changeYear(year - 1)}>
            <span className="text-xs">‹</span>
          </Button>
          <span className="w-16 text-center font-bold text-sm">{year}</span>
          <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={() => changeYear(year + 1)}>
            <span className="text-xs">›</span>
          </Button>
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">{config.holidays.length} data{config.holidays.length !== 1 ? "s" : ""} cadastrada{config.holidays.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Add new */}
      <div className="rounded-2xl border border-border p-4 space-y-3 bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Nova Data</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Data</Label>
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="rounded-xl h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Tipo</Label>
            <div className="flex gap-2">
              {([["FERIADO", "Feriado"], ["PONTO_FACULTATIVO", "Ponto Facultativo"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setNewType(v)}
                  className={cn(
                    "flex-1 py-2 text-[11px] font-bold rounded-xl border transition-all",
                    newType === v ? "border-[#0f2044] bg-[#0f2044]/10 text-[#0f2044]" : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Nome / Descrição</Label>
          <div className="flex gap-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Tiradentes, Corpus Christi..." className="rounded-xl flex-1" onKeyDown={e => e.key === "Enter" && addHoliday()} />
            <Button onClick={addHoliday} className="rounded-xl gap-1.5 px-4 bg-[#0f2044] text-white hover:bg-[#0f2044]/90">
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Feriados list */}
      {feriados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Feriados Nacionais / Estaduais ({feriados.length})</p>
          {feriados.map((h, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-purple-100 bg-purple-50 group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{h.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{fmtDate(h.date)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => removeHoliday(config.holidays.indexOf(h))}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Pontos Facultativos list */}
      {facultativos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pontos Facultativos ({facultativos.length})</p>
          {facultativos.map((h, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-amber-100 bg-amber-50 group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{h.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{fmtDate(h.date)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => removeHoliday(config.holidays.indexOf(h))}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {config.holidays.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma data cadastrada para {year}</p>
      )}

      <Separator />

      {/* Decreto */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Texto do Decreto Governamental</p>
        </div>
        <textarea
          value={config.decree}
          onChange={e => setConfig(c => ({ ...c, decree: e.target.value }))}
          placeholder="Cole aqui o texto completo do decreto governamental sobre feriados e pontos facultativos do ano..."
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-mono leading-relaxed resize-none min-h-[200px] focus:outline-none focus:ring-2 focus:ring-[#0f2044]/20"
        />
        <Button onClick={saveDecree} className="w-full rounded-xl gap-2 bg-[#0f2044] text-white hover:bg-[#0f2044]/90">
          <Save className="w-4 h-4" /> Salvar Decreto
        </Button>
      </div>
    </div>
  );
}

// ── Empresa ─────────────────────────────────────────────────────────────────
function PanelCompany({ org, setOrg, saveOrg, savingOrg }: any) {
  const set = (k: string, v: string) => setOrg((p: any) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-5">
      <FP label="Razão Social" icon={Building} value={org.name || ""} onChange={v => set("name", v)} />
      <FP label="CNPJ" icon={Hash} value={org.cnpj || ""} onChange={v => set("cnpj", v)} placeholder="00.000.000/0001-00" />
      <FP label="Telefone" icon={Phone} value={org.phone || ""} onChange={v => set("phone", v)} />
      <FP label="E-mail Corporativo" icon={Mail} value={org.email || ""} onChange={v => set("email", v)} type="email" />
      <FP label="Endereço Completo" icon={MapPin} value={org.address || ""} onChange={v => set("address", v)} />
      <Button onClick={saveOrg} disabled={savingOrg} className="w-full rounded-xl h-11 gap-2 shadow-md shadow-primary/10 mt-2">
        <Save className="w-4 h-4" />
        {savingOrg ? "Salvando..." : "Salvar Dados da Empresa"}
      </Button>
    </div>
  );
}

// ── Setores ─────────────────────────────────────────────────────────────────
function PanelSectors({ departments, employees, deptName, setDeptName, deptEditing, setDeptEditing, saveDept, deptSaving, deleteDept }: any) {
  const [showForm, setShowForm] = useState(false);

  const handleSave = async () => {
    const ok = await saveDept();
    if (ok) setShowForm(false);
  };
  const handleCancel = () => {
    setShowForm(false);
    setDeptEditing(null);
    setDeptName("");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {departments.length} setor{departments.length !== 1 ? "es" : ""}
        </p>
        {!showForm && !deptEditing && (
          <Button
            size="sm"
            onClick={() => { setShowForm(true); setDeptName(""); }}
            className="rounded-xl h-8 gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Setor
          </Button>
        )}
      </div>

      {/* Add / edit form */}
      {(showForm || deptEditing) && (
        <div className="rounded-2xl border border-border p-4 space-y-3 bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {deptEditing ? "Editar Setor" : "Novo Setor"}
          </p>
          <div className="flex gap-2">
            <Input
              value={deptName}
              onChange={e => setDeptName(e.target.value)}
              placeholder="Nome do setor..."
              className="rounded-xl flex-1"
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <Button onClick={handleSave} disabled={deptSaving || !deptName.trim()} className="rounded-xl gap-1.5 px-4">
              <Save className="w-4 h-4" />
              {deptSaving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={handleCancel} className="rounded-xl px-3">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {departments.length === 0 && !showForm && !deptEditing && (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum setor cadastrado</p>
        )}
        {departments.map((d: Dept) => {
          const count = employees.filter((e: any) => e.department_id === d.id).length;
          return (
            <div key={d.id} className="flex items-center justify-between px-4 py-3 rounded-2xl border border-border bg-card hover:bg-muted/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">{count} funcionário{count !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost" size="icon"
                  className="rounded-xl h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => { setDeptEditing(d); setDeptName(d.name); setShowForm(false); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="rounded-xl h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteDept(d.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Jornadas ─────────────────────────────────────────────────────────────────
function PanelSchedules({ schedules, employees, schedForm, setSchedForm, schedEditing, setSchedEditing, saveSched, schedSaving, deleteSched }: any) {
  const [showForm, setShowForm] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────
  const minToHHMM = (m: number) =>
    String(Math.floor(Math.max(0, m) / 60)).padStart(2, "0") + ":" + String(Math.max(0, m) % 60).padStart(2, "0");
  const hhmmToMin = (s: string) => {
    const [h, mm] = (s || "").split(":").map(Number);
    return ((h || 0) * 60) + (mm || 0);
  };
  const cltLunch = (spanMin: number) =>
    spanMin > 375 ? 60 : spanMin > 255 ? 15 : 0;

  const applyTimes = (start: string, end: string, currentLunch?: number) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const span = (eh * 60 + em) - (sh * 60 + sm);
    if (span <= 0) return {};
    const lunch = currentLunch != null ? currentLunch : cltLunch(span);
    return { lunch_minutes: lunch, expected_work: Math.max(0, span - lunch) };
  };

  const onStartChange = (val: string) =>
    setSchedForm((p: any) => ({
      ...p, start_time: val,
      ...(val && p.end_time ? applyTimes(val, p.end_time) : {}),
    }));

  const onEndChange = (val: string) =>
    setSchedForm((p: any) => ({
      ...p, end_time: val,
      ...(p.start_time && val ? applyTimes(p.start_time, val) : {}),
    }));

  const onLunchChange = (val: string) => {
    const lunch = hhmmToMin(val);
    setSchedForm((p: any) => {
      const st = p.start_time || "", et = p.end_time || "";
      if (st && et) {
        const [sh, sm] = st.split(":").map(Number);
        const [eh, em] = et.split(":").map(Number);
        const span = (eh * 60 + em) - (sh * 60 + sm);
        return { ...p, lunch_minutes: lunch, expected_work: Math.max(0, span - lunch) };
      }
      return { ...p, lunch_minutes: lunch };
    });
  };

  const onCargaChange = (val: string) => {
    const net = hhmmToMin(val);
    setSchedForm((p: any) => {
      const lunch = cltLunch(net + (p.lunch_minutes ?? cltLunch(net)));
      let end_time = p.end_time;
      if (p.start_time) {
        const [sh, sm] = p.start_time.split(":").map(Number);
        const exitMin = sh * 60 + sm + net + lunch;
        end_time = String(Math.floor(exitMin / 60) % 24).padStart(2, "0") + ":" + String(exitMin % 60).padStart(2, "0");
      }
      return { ...p, expected_work: net, lunch_minutes: lunch, end_time };
    });
  };

  const handleSave = async () => {
    const ok = await saveSched();
    if (ok) setShowForm(false);
  };
  const handleCancel = () => {
    setShowForm(false);
    setSchedEditing(null);
    setSchedForm({});
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {schedules.length} jornada{schedules.length !== 1 ? "s" : ""}
        </p>
        {!showForm && !schedEditing && (
          <Button
            size="sm"
            onClick={() => { setShowForm(true); setSchedForm({}); }}
            className="rounded-xl h-8 gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Jornada
          </Button>
        )}
      </div>

      {/* Form */}
      {(showForm || schedEditing) && (
        <div className="rounded-2xl border border-border p-4 space-y-4 bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {schedEditing ? "Editar Jornada" : "Nova Jornada"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Nome</Label>
              <Input value={schedForm.name || ""} onChange={e => setSchedForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="Ex: Turno Manhã" className="rounded-xl" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Entrada</Label>
              <Input type="time" value={schedForm.start_time || ""} onChange={e => onStartChange(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Saída</Label>
              <Input type="time" value={schedForm.end_time || ""} onChange={e => onEndChange(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Intervalo</Label>
              <Input
                type="time"
                value={schedForm.lunch_minutes != null ? minToHHMM(schedForm.lunch_minutes) : ""}
                placeholder="01:00"
                onChange={e => onLunchChange(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Carga Diária</Label>
              <Input
                type="time"
                value={schedForm.expected_work != null ? minToHHMM(schedForm.expected_work) : ""}
                placeholder="08:00"
                onChange={e => onCargaChange(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Live preview */}
          {schedForm.start_time && schedForm.end_time && schedForm.expected_work != null && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs flex items-center gap-2 text-primary">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>{schedForm.start_time}</strong> → <strong>{schedForm.end_time}</strong>
                {" · "} Intervalo <strong>{minToHHMM(schedForm.lunch_minutes ?? 0)}</strong>
                {" · "} Carga <strong>{minToHHMM(schedForm.expected_work)}</strong>/dia
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={schedSaving || !schedForm.name?.trim()} className="flex-1 rounded-xl gap-1.5">
              <Save className="w-4 h-4" />
              {schedSaving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={handleCancel} className="rounded-xl px-3">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {schedules.length === 0 && !showForm && !schedEditing && (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma jornada configurada</p>
        )}
        {schedules.map((s: Schedule) => {
          const count = employees.filter((e: any) => e.schedule_id === s.id).length;
          const lunch = s.lunch_minutes ?? 0;
          return (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-2xl border border-border bg-card hover:bg-muted/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.start_time ?? "?"} → {s.end_time ?? "?"}
                    {" · "} int. {minToHHMM(lunch)}
                    {" · "} {minToHHMM(s.expected_work)}/dia
                    {" · "} {count} func.
                  </p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost" size="icon"
                  className="rounded-xl h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => { setSchedEditing(s); setSchedForm({ ...s }); setShowForm(false); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="rounded-xl h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteSched(s.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Usuários ─────────────────────────────────────────────────────────────────
type SysUser = { id: string; email: string; name: string; role: string; confirmed: boolean; last_sign_in?: string };

function PanelUsers() {
  const [sysUsers, setSysUsers] = useState<SysUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VIEWER" });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const r = await fetch("/api/system-users");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao carregar");
      setSysUsers(d.users || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.email.trim()) return toast.error("E-mail obrigatório");
    if (!form.password.trim() || form.password.length < 8) return toast.error("Senha mínima de 8 caracteres");
    setSaving(true);
    try {
      const r = await fetch("/api/system-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), name: form.name.trim(), role: form.role, password: form.password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao criar usuário");
      toast.success("Usuário criado com sucesso!");
      setForm({ name: "", email: "", password: "", role: "VIEWER" });
      setShowForm(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este usuário?")) return;
    const r = await fetch(`/api/system-users/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) { toast.error(d.error || "Erro ao remover"); return; }
    toast.success("Usuário removido");
    setSysUsers(p => p.filter(u => u.id !== id));
  };

  const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", AUDITOR: "Auditor", VIEWER: "Visualizador" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {loadingUsers ? "Carregando…" : `${sysUsers.length} usuário${sysUsers.length !== 1 ? "s" : ""} ativo${sysUsers.length !== 1 ? "s" : ""}`}
        </p>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => { setShowForm(true); setForm({ name: "", email: "", password: "", role: "VIEWER" }); }}
            className="rounded-xl h-8 gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Usuário
          </Button>
        )}
      </div>

      {/* Users list */}
      <div className="space-y-2">
        {sysUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-2xl border border-border bg-card group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                  {(u.name || u.email).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{u.name || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20 px-2">{ROLE_LABEL[u.role] || u.role}</Badge>
                <Badge className={cn("rounded-full text-[10px] px-2",
                  u.confirmed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                )}>{u.confirmed ? "Ativo" : "Pendente"}</Badge>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      {/* New user form */}
      {showForm && (
      <div className="rounded-2xl border border-border p-4 space-y-4 bg-muted/20">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Novo Usuário</p>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => setShowForm(false)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <FP label="Nome Completo" icon={Users} value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
        <FP label="E-mail" icon={Mail} value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Senha Provisória</Label>
          <div className="relative">
            <Input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
              className="rounded-xl h-10 pr-10"
            />
            <button
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Perfil de Acesso</Label>
          <div className="grid grid-cols-3 gap-2">
            {([["ADMIN", "Administrador"], ["AUDITOR", "Auditor"], ["VIEWER", "Visualizador"]] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setForm(f => ({ ...f, role: v }))}
                className={cn(
                  "py-2.5 text-xs font-semibold rounded-xl border transition-all",
                  form.role === v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <Button
          onClick={handleCreate}
          disabled={saving}
          className="w-full rounded-xl h-11 gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Salvando…" : "Salvar Usuário"}
        </Button>
      </div>
      )}
    </div>
  );
}

// ── Aparência ─────────────────────────────────────────────────────────────────
function PanelAppearance({ accentColor, setAccentColor }: any) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Cor Principal</p>
        <div className="space-y-2">
          {ACCENT_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setAccentColor(c.value)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all hover:bg-muted/30",
                accentColor === c.value ? "border-primary bg-primary/5 shadow-sm" : "border-border"
              )}
            >
              <div className="w-6 h-6 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: c.hex }} />
              <span className="text-sm font-medium flex-1 text-left">{c.label}</span>
              {accentColor === c.value && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Preferências</p>
        {[
          { label: "Sidebar compacta por padrão", desc: "Inicia com o menu recolhido", default: false },
          { label: "Confirmação antes de excluir", desc: "Alerta em ações destrutivas", default: true },
          { label: "Notificações sonoras", desc: "Som ao salvar e em erros", default: false },
          { label: "Alto contraste", desc: "Melhora acessibilidade visual", default: false },
        ].map((p, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-foreground">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
            <Switch defaultChecked={p.default} />
          </div>
        ))}
      </div>

      <Button
        onClick={() => toast.success("Preferências salvas!")}
        className="w-full rounded-xl h-11 gap-2"
      >
        <Save className="w-4 h-4" /> Salvar Preferências
      </Button>
    </div>
  );
}

// ── Permissões ─────────────────────────────────────────────────────────────────
function PanelPermissions() {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Controles de Acesso</p>
      {[
        { label: "Admin pode excluir registros", desc: "Permite exclusão permanente de dados", default: true, color: "text-red-600" },
        { label: "Editor pode aprovar marcações", desc: "Aprovação de edições manuais no espelho", default: false, color: "text-amber-600" },
        { label: "Visualizador pode exportar", desc: "Exportar relatórios sem edição", default: true, color: "text-blue-600" },
        { label: "Exigir aprovação para edições", desc: "Toda edição manual precisa de aprovação", default: false, color: "text-purple-600" },
        { label: "Notificar admin por e-mail", desc: "E-mail ao receber novas alterações", default: false, color: "text-emerald-600" },
        { label: "Log de auditoria ativo", desc: "Registra todas as ações dos usuários", default: true, color: "text-indigo-600" },
      ].map((p, i) => (
        <div key={i} className="flex items-start justify-between py-2 border-b border-border/50 last:border-0">
          <div>
            <p className={cn("text-sm font-semibold", p.color)}>{p.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
          </div>
          <Switch defaultChecked={p.default} className="shrink-0 mt-0.5" />
        </div>
      ))}

      <Button
        onClick={() => toast.success("Permissões salvas!")}
        className="w-full rounded-xl h-11 gap-2 mt-2"
      >
        <Save className="w-4 h-4" /> Salvar Permissões
      </Button>
    </div>
  );
}

// ── Segurança ─────────────────────────────────────────────────────────────────
function PanelSecurity() {
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeEmail, setPurgeEmail]         = useState("");
  const [purgePassword, setPurgePassword]   = useState("");
  const [purgeLoading, setPurgeLoading]     = useState(false);
  const [showPw, setShowPw]                 = useState(false);

  const handlePurge = async () => {
    if (!purgeEmail.trim() || !purgePassword) {
      toast.error("Preencha email e senha");
      return;
    }
    setPurgeLoading(true);
    try {
      const r = await fetch("/api/admin/purge-attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: purgeEmail.trim(), password: purgePassword }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Todos os apontamentos foram apagados.");
      setShowPurgeModal(false);
      setPurgeEmail(""); setPurgePassword("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Autenticação em 2 Fatores</p>
          <p className="text-xs text-amber-700 mt-0.5">Configure 2FA para aumentar a segurança da conta administrativa.</p>
          <Button size="sm" className="mt-3 rounded-xl h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700">
            <Shield className="w-3.5 h-3.5" /> Ativar 2FA
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sessões Ativas</p>
        {[
          { device: "Windows 11 · Chrome", location: "São Paulo, SP", time: "Agora", current: true },
          { device: "iPhone 14 · Safari", location: "São Paulo, SP", time: "2h atrás", current: false },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 rounded-2xl border border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">{s.device}</p>
              <p className="text-xs text-muted-foreground">{s.location} · {s.time}</p>
            </div>
            {s.current
              ? <Badge className="rounded-full text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 px-2">Atual</Badge>
              : <Button variant="outline" size="sm" className="rounded-xl h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">Revogar</Button>
            }
          </div>
        ))}
      </div>

      {/* Zona de Perigo */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Zona de Perigo</p>
        </div>
        <Separator className="bg-red-200" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-800">Apagar todos os apontamentos</p>
            <p className="text-xs text-red-600 mt-0.5">
              Remove <strong>permanentemente</strong> todos os registros de ponto de todos os funcionários e todos os meses. Esta ação não pode ser desfeita.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0 rounded-xl h-8 text-xs gap-1.5"
            onClick={() => setShowPurgeModal(true)}
          >
            <Trash2 className="w-3.5 h-3.5" /> Apagar tudo
          </Button>
        </div>
      </div>

      {/* Modal de confirmação */}
      <Dialog open={showPurgeModal} onOpenChange={open => { if (!purgeLoading) { setShowPurgeModal(open); if (!open) { setPurgeEmail(""); setPurgePassword(""); } } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" /> Confirmar exclusão total
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Esta ação apagará <strong>todos os apontamentos</strong> de todos os funcionários permanentemente. Confirme com suas credenciais de administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">E-mail do administrador</Label>
              <Input
                type="email"
                placeholder="admin@exemplo.com"
                value={purgeEmail}
                onChange={e => setPurgeEmail(e.target.value)}
                className="rounded-xl h-9 text-sm"
                disabled={purgeLoading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Senha</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={purgePassword}
                  onChange={e => setPurgePassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handlePurge()}
                  className="rounded-xl h-9 text-sm pr-9"
                  disabled={purgeLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-9 text-sm"
                onClick={() => { setShowPurgeModal(false); setPurgeEmail(""); setPurgePassword(""); }}
                disabled={purgeLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-xl h-9 text-sm gap-1.5"
                onClick={handlePurge}
                disabled={purgeLoading || !purgeEmail || !purgePassword}
              >
                {purgeLoading ? "Apagando..." : <><Trash2 className="w-3.5 h-3.5" /> Confirmar e apagar</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Integrações ─────────────────────────────────────────────────────────────────
function PanelIntegrations() {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Integrações Disponíveis</p>
      {[
        { name: "REST API", desc: "Acesse dados via API externa", icon: Zap, status: "Em breve" },
        { name: "Exportação CSV", desc: "Exporte relatórios para planilhas", icon: Activity, status: "Disponível" },
        { name: "Webhook Ponto", desc: "Receba eventos de ponto em tempo real", icon: Lock, status: "Em breve" },
        { name: "LDAP / AD", desc: "Sincronize usuários do Active Directory", icon: Users, status: "Em breve" },
      ].map((intg, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
              <intg.icon className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{intg.name}</p>
              <p className="text-[11px] text-muted-foreground">{intg.desc}</p>
            </div>
          </div>
          <Badge className={cn(
            "rounded-full text-[10px] px-2 border",
            intg.status === "Disponível"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-muted text-muted-foreground border-border"
          )}>
            {intg.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ── Shared form field ─────────────────────────────────────────────────────────
function FP({
  label, icon: Icon, value, onChange, type = "text", placeholder,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl h-10"
      />
    </div>
  );
}
