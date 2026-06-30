/* ═══════════════════════════════════════════════════════════════════════════
   Projeto PIN — Gestão de Saldos Acumulados 2026
   Controla as horas extras dedicadas ao Projeto PIN por cada funcionário.
   Meta mensal: 40h (Jan/Fev/Mar/Mai) ou 48h (Abr/Jun/Jul — meses com
   compensação de feriado conforme Decreto nº 70.273/2025).
   Saldo POSITIVO = funcionário cumpriu e superou a meta → verde
   Saldo NEGATIVO = funcionário está devendo horas ao projeto → vermelho
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Upload, Download, Edit2, Save, X, RefreshCw, Search,
  ChevronDown, ChevronUp, Info, Users, Clock, FileSpreadsheet,
  BadgeCheck, AlertCircle, Filter, Building2, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

/* ── Metas mensais do Projeto PIN (Decreto nº 70.273/2025) ────────────────── */
const PIN_GOALS: Record<string, number> = {
  jan: 2400, // 40h
  fev: 2400, // 40h
  mar: 2400, // 40h
  abr: 2880, // 48h (compensação feriado Tiradentes + Corpus Christi)
  mai: 2400, // 40h
  jun: 2880, // 48h
  jul: 2880, // 48h
  ago: 2400, // 40h
  set: 2400, // 40h
  out: 2400, // 40h
  nov: 2400, // 40h
  dez: 2400, // 40h
};
const MONTH_LABELS: Record<string, string> = {
  jan: "Jan/26", fev: "Fev/26", mar: "Mar/26",
  abr: "Abr/26", mai: "Mai/26",
};

/* ── Dados extraídos da planilha "PIN - HORAS AREAS 2026.xlsx" ─────────────
   Colunas: cpf, nome, area, saldoDezMin (dez/2025), acum por mês,
   maiSAcumMin = saldo acumulado até Mai/2026, isNegative (em vermelho na planilha)
   ─────────────────────────────────────────────────────────────────────────── */
type ExcelEntry = {
  cpf: string;
  nome: string;
  area: string;
  saldoDezMin: number | null;
  janAcumMin: number | null;
  fevAcumMin: number | null;
  marAcumMin: number | null;
  abrAcumMin: number | null;
  maiAcumMin: number | null; // = saldo final Mai/2026
  isNegative: boolean;       // célula em VERMELHO na planilha
};

const EXCEL_DATA: ExcelEntry[] = [
  // ── GABINETE / ASSESSORIA ────────────────────────────────────────────────
  { cpf:"225.860.348-05", nome:"ADAN FREIRE PEREIRA",               area:"GABINETE",   saldoDezMin:867,   janAcumMin:1416, fevAcumMin:1524, marAcumMin:2209, abrAcumMin:1927, maiAcumMin:2358,  isNegative:false },
  { cpf:"190.680.298-00", nome:"ADRIANA CRISTINA DE JESUS AZEVEDO", area:"ASSESSORIA", saldoDezMin:427,   janAcumMin:482,  fevAcumMin:527,  marAcumMin:1107, abrAcumMin:942,  maiAcumMin:1141,  isNegative:false },
  { cpf:"229.219.648-48", nome:"ANA PAULA DA SILVA",                area:"GABINETE",   saldoDezMin:277,   janAcumMin:414,  fevAcumMin:446,  marAcumMin:931,  abrAcumMin:-527, maiAcumMin:-159,  isNegative:true  },
  { cpf:"125.496.378-28", nome:"ELIANA FRANCO PEREIRA",             area:"ASSESSORIA", saldoDezMin:123,   janAcumMin:-829, fevAcumMin:-749, marAcumMin:-112, abrAcumMin:-1015, maiAcumMin:-283, isNegative:true  },
  { cpf:"327.236.438-24", nome:"GABRIELA FERNANDA VERGUEIRO",       area:"ASSESSORIA", saldoDezMin:1438,  janAcumMin:1163, fevAcumMin:1249, marAcumMin:1829, abrAcumMin:1269, maiAcumMin:1440,  isNegative:false },
  { cpf:"287.620.078-31", nome:"SUSANA SERAFIM CIRINO",             area:"ASSESSORIA", saldoDezMin:934,   janAcumMin:1100, fevAcumMin:1744, marAcumMin:2391, abrAcumMin:2157, maiAcumMin:1517,  isNegative:false },
  { cpf:"286.235.138-51", nome:"TATIANA DE CARVALHO COSTA LOSCHER", area:"GABINETE",   saldoDezMin:null,  janAcumMin:null, fevAcumMin:null, marAcumMin:152,  abrAcumMin:null, maiAcumMin:null,  isNegative:false },

  // ── CATC ─────────────────────────────────────────────────────────────────
  { cpf:"317.425.088-98", nome:"BEATRIZ PUGA RODRIGUES",            area:"CATC",       saldoDezMin:165,   janAcumMin:134,  fevAcumMin:170,  marAcumMin:-85,  abrAcumMin:-409, maiAcumMin:-404,  isNegative:true  },
  { cpf:"303.099.138-53", nome:"DIONE MARIA LISBOA PEREIRA",        area:"CATC",       saldoDezMin:1972,  janAcumMin:1746, fevAcumMin:1431, marAcumMin:1531, abrAcumMin:23,   maiAcumMin:-219,  isNegative:true  },
  { cpf:"247.823.728-84", nome:"FÁBIO LUÍS POZZO",                  area:"CATC",       saldoDezMin:11169, janAcumMin:10001,fevAcumMin:10376,marAcumMin:11281,abrAcumMin:10261,maiAcumMin:11073, isNegative:false },
  { cpf:"",               nome:"GABRIELA PICCARDI GONZALES",         area:"CATC",       saldoDezMin:900,   janAcumMin:882,  fevAcumMin:801,  marAcumMin:777,  abrAcumMin:300,  maiAcumMin:132,   isNegative:false },
  { cpf:"012.953.668-78", nome:"ROSELI APARECIDA RODRIGUES COLOMBO",area:"CATC",       saldoDezMin:619,   janAcumMin:1153, fevAcumMin:1177, marAcumMin:1381, abrAcumMin:1758, maiAcumMin:3046,  isNegative:false },

  // ── GCSS (dados até Abr/26 — Mai/26 não preenchido na planilha) ──────────
  { cpf:"161.372.618-08", nome:"ALMIR MANTA",                        area:"GCSS",       saldoDezMin:null,  janAcumMin:1008, fevAcumMin:1574, marAcumMin:1769, abrAcumMin:1921, maiAcumMin:null,  isNegative:false },
  { cpf:"122.523.178-76", nome:"CARLA ROSARIA RODRIGUES VAZ TURIANI",area:"GCSS",       saldoDezMin:null,  janAcumMin:null, fevAcumMin:396,  marAcumMin:848,  abrAcumMin:510,  maiAcumMin:null,  isNegative:false },
  { cpf:"045.369.178-10", nome:"MAGDA DE CAMPOS",                    area:"GCSS",       saldoDezMin:null,  janAcumMin:1921, fevAcumMin:3100, marAcumMin:4495, abrAcumMin:2916, maiAcumMin:null,  isNegative:false },
  { cpf:"992.148.308-00", nome:"MARILDA APARECIDA DA SILVA VELOSO",  area:"GCSS",       saldoDezMin:null,  janAcumMin:1315, fevAcumMin:2149, marAcumMin:2877, abrAcumMin:1811, maiAcumMin:null,  isNegative:false },
  { cpf:"001.545.238-79", nome:"MARTA DE ALMEIDA GOMES GUNTHER",     area:"GCSS",       saldoDezMin:null,  janAcumMin:106,  fevAcumMin:299,  marAcumMin:485,  abrAcumMin:5,    maiAcumMin:null,  isNegative:false },
  { cpf:"170.792.878-98", nome:"MARCELO DA SILVA GASPAR",            area:"GCSS",       saldoDezMin:561,   janAcumMin:1394, fevAcumMin:1850, marAcumMin:2509, abrAcumMin:2000, maiAcumMin:null,  isNegative:false },
  { cpf:"010.679.358-60", nome:"NORMA SUELY FERREIRA SOUZA AMERICO", area:"GCSS",       saldoDezMin:43780, janAcumMin:46050,fevAcumMin:47756,marAcumMin:50099,abrAcumMin:51683,maiAcumMin:null,  isNegative:false },
  { cpf:"148.987.578-63", nome:"SILVIA MARIA ROCHA",                 area:"GCSS",       saldoDezMin:1704,  janAcumMin:1806, fevAcumMin:1681, marAcumMin:1510, abrAcumMin:1040, maiAcumMin:null,  isNegative:false },

  // ── GCO ──────────────────────────────────────────────────────────────────
  { cpf:"305.526.208-58", nome:"BRUNO MARCELO LOPES SANTOS",         area:"GCO",        saldoDezMin:null,  janAcumMin:null, fevAcumMin:null, marAcumMin:null, abrAcumMin:758,  maiAcumMin:2418,  isNegative:false },
  { cpf:"257.166.288-00", nome:"CLEMILSON SANTOS COBRA",             area:"GCO",        saldoDezMin:null,  janAcumMin:1252, fevAcumMin:2570, marAcumMin:3286, abrAcumMin:4782, maiAcumMin:5743,  isNegative:false },
  { cpf:"",               nome:"DARIO BESSELER",                      area:"GCO",        saldoDezMin:null,  janAcumMin:507,  fevAcumMin:688,  marAcumMin:1181, abrAcumMin:1401, maiAcumMin:2098,  isNegative:false },
  { cpf:"",               nome:"EUNICE BRASILEIRO",                   area:"GCO",        saldoDezMin:null,  janAcumMin:871,  fevAcumMin:871,  marAcumMin:871,  abrAcumMin:391,  maiAcumMin:null,  isNegative:false },
  { cpf:"148.944.468-80", nome:"EDNA MIYUKI BABA",                   area:"GCO",        saldoDezMin:34891, janAcumMin:36147,fevAcumMin:36762,marAcumMin:37839,abrAcumMin:38639,maiAcumMin:39441, isNegative:false },
  { cpf:"257.779.938-18", nome:"WANDER HELENO SALLES",               area:"GCO",        saldoDezMin:3601,  janAcumMin:2709, fevAcumMin:2778, marAcumMin:2181, abrAcumMin:1643, maiAcumMin:3220,  isNegative:false },

  // ── GGCON ────────────────────────────────────────────────────────────────
  { cpf:"287.989.128-01", nome:"ARLETE SHIRLEY PEREIRA DE CARVALHO", area:"GGCON",      saldoDezMin:1869,  janAcumMin:1728, fevAcumMin:2366, marAcumMin:2134, abrAcumMin:1884, maiAcumMin:2097,  isNegative:false },
  { cpf:"126.609.768-64", nome:"ELENICE ORPHEU ALVES DE SOUZA",      area:"GGCON",      saldoDezMin:868,   janAcumMin:1852, fevAcumMin:1919, marAcumMin:2303, abrAcumMin:1689, maiAcumMin:-606,  isNegative:true  },
  { cpf:"",               nome:"ELZA TATSUO SAMECIMA",                area:"GGCON",      saldoDezMin:3084,  janAcumMin:5241, fevAcumMin:6994, marAcumMin:9346, abrAcumMin:10198,maiAcumMin:12096, isNegative:false },
  { cpf:"312.848.578-08", nome:"FERNANDA DA SILVA E SOUZA",          area:"GGCON",      saldoDezMin:381,   janAcumMin:186,  fevAcumMin:-1263,marAcumMin:-1928,abrAcumMin:-792, maiAcumMin:779,   isNegative:false },
  { cpf:"765.959.358-72", nome:"GILMAR MARCIANO DOS SANTOS",         area:"GGCON",      saldoDezMin:1273,  janAcumMin:1816, fevAcumMin:1975, marAcumMin:2428, abrAcumMin:1221, maiAcumMin:1398,  isNegative:false },
  { cpf:"035.275.838-40", nome:"JOÃO CARLOS FERREIRA DE SOUZA",      area:"GGCON",      saldoDezMin:587,   janAcumMin:97,   fevAcumMin:-384, marAcumMin:-273, abrAcumMin:-1381,maiAcumMin:-980,  isNegative:true  },
  { cpf:"386.631.688-70", nome:"JOMARA SIMÕES DOS SANTOS",           area:"GGCON",      saldoDezMin:1040,  janAcumMin:122,  fevAcumMin:1001, marAcumMin:1036, abrAcumMin:441,  maiAcumMin:1027,  isNegative:false },
  { cpf:"342.131.178-12", nome:"KAREN DE OLIVEIRA DELFINO",          area:"GGCON",      saldoDezMin:1623,  janAcumMin:1188, fevAcumMin:1126, marAcumMin:1136, abrAcumMin:1400, maiAcumMin:-407,  isNegative:true  },
  { cpf:"",               nome:"LUIZ ANDRADE",                        area:"GGCON",      saldoDezMin:null,  janAcumMin:null, fevAcumMin:null, marAcumMin:null, abrAcumMin:null, maiAcumMin:292,   isNegative:false },
  { cpf:"016.445.498-59", nome:"MARILSA DA SILVA E SILVA",           area:"GGCON",      saldoDezMin:null,  janAcumMin:71,   fevAcumMin:-73,  marAcumMin:-43,  abrAcumMin:497,  maiAcumMin:490,   isNegative:false },
  { cpf:"107.506.848-79", nome:"MARISTELA APARECIDA RAPHAEL",        area:"GGCON",      saldoDezMin:807,   janAcumMin:-107, fevAcumMin:1495, marAcumMin:295,  abrAcumMin:811,  maiAcumMin:2424,  isNegative:false },
  { cpf:"119.658.078-28", nome:"MARTA CONCEIÇÃO DE MOURA",           area:"GGCON",      saldoDezMin:344,   janAcumMin:183,  fevAcumMin:-1313,marAcumMin:4524, abrAcumMin:4108, maiAcumMin:5773,  isNegative:false },
  { cpf:"283.638.378-06", nome:"RENATO ESPIRITO SANTO DIAS TATIT",   area:"GGCON",      saldoDezMin:6752,  janAcumMin:73,   fevAcumMin:90,   marAcumMin:650,  abrAcumMin:668,  maiAcumMin:1018,  isNegative:false },
  { cpf:"043.072.288-55", nome:"ROBERTO CARLOS SANTANA",             area:"GGCON",      saldoDezMin:631,   janAcumMin:278,  fevAcumMin:851,  marAcumMin:1701, abrAcumMin:1149, maiAcumMin:922,   isNegative:false },
  { cpf:"021.430.158-36", nome:"RONALDO HILÁRIO DOS SANTOS",         area:"GGCON",      saldoDezMin:537,   janAcumMin:598,  fevAcumMin:598,  marAcumMin:886,  abrAcumMin:1027, maiAcumMin:1208,  isNegative:false },
  { cpf:"094.778.158-70", nome:"TANIA CRISTINA BEGOSSO",             area:"GGCON",      saldoDezMin:514,   janAcumMin:518,  fevAcumMin:920,  marAcumMin:6209, abrAcumMin:4676, maiAcumMin:4624,  isNegative:false },
  { cpf:"",               nome:"THIAGO ALMEIDA DA SILVA",            area:"GGCON",      saldoDezMin:925,   janAcumMin:935,  fevAcumMin:942,  marAcumMin:571,  abrAcumMin:-539, maiAcumMin:-712,  isNegative:true  },

  // ── GCF ──────────────────────────────────────────────────────────────────
  { cpf:"132.925.068-08", nome:"ALEXSANDRA BERTACO SEVERINO",        area:"GCF",        saldoDezMin:null,  janAcumMin:531,  fevAcumMin:973,  marAcumMin:1093, abrAcumMin:1150, maiAcumMin:1168,  isNegative:false },
  { cpf:"075.267.358-01", nome:"CESAR MOREIRA CONSTANTINO",          area:"GCF",        saldoDezMin:6332,  janAcumMin:6197, fevAcumMin:5296, marAcumMin:3682, abrAcumMin:2678, maiAcumMin:2973,  isNegative:false },
  { cpf:"290.989.248-40", nome:"CLAUDENICE DA SILVA",                area:"GCF",        saldoDezMin:377,   janAcumMin:171,  fevAcumMin:-68,  marAcumMin:-2,   abrAcumMin:345,  maiAcumMin:4,     isNegative:false },
  { cpf:"113.118.838-19", nome:"CONCEIÇÃO AP. PANISSI MARTINS",      area:"GCF",        saldoDezMin:null,  janAcumMin:1799, fevAcumMin:3117, marAcumMin:5032, abrAcumMin:5563, maiAcumMin:7044,  isNegative:false },
  { cpf:"350.308.248-47", nome:"CLEBER FARIAS DOS SANTOS",           area:"GCF",        saldoDezMin:6445,  janAcumMin:6640, fevAcumMin:5270, marAcumMin:5839, abrAcumMin:5957, maiAcumMin:6790,  isNegative:false },
  { cpf:"333.343.528-46", nome:"DIEGO BARBOSA DOS SANTOS",           area:"GCF",        saldoDezMin:580,   janAcumMin:1390, fevAcumMin:1773, marAcumMin:2058, abrAcumMin:2150, maiAcumMin:2563,  isNegative:false },
  { cpf:"",               nome:"FERNANDO CESAR BARBOZA",             area:"GCF",        saldoDezMin:null,  janAcumMin:1556, fevAcumMin:1194, marAcumMin:2169, abrAcumMin:2581, maiAcumMin:3321,  isNegative:false },
  { cpf:"321.856.588-08", nome:"JOSÉ LUIZ DOS SANTOS MOREIRA",       area:"GCF",        saldoDezMin:345,   janAcumMin:251,  fevAcumMin:-1142,marAcumMin:-1446,abrAcumMin:-982, maiAcumMin:-43,   isNegative:true  },
  { cpf:"346.985.798-99", nome:"JOSE ROMÃO BATISTA",                 area:"GCF",        saldoDezMin:268,   janAcumMin:829,  fevAcumMin:1027, marAcumMin:1482, abrAcumMin:1495, maiAcumMin:1028,  isNegative:false },
  { cpf:"032.442.248-22", nome:"LUIZ CARLOS BAZALIA DOS SANTOS",     area:"GCF",        saldoDezMin:1811,  janAcumMin:5277, fevAcumMin:5391, marAcumMin:5810, abrAcumMin:5346, maiAcumMin:6837,  isNegative:false },
  { cpf:"439.597.228-42", nome:"MATEUS RIBEIRO DA SILVA",            area:"GCF",        saldoDezMin:4635,  janAcumMin:5089, fevAcumMin:4434, marAcumMin:4569, abrAcumMin:3888, maiAcumMin:3733,  isNegative:false },
  { cpf:"",               nome:"THAIS CRISTINA NASCIMENTO BARBOSA",  area:"GCF",        saldoDezMin:null,  janAcumMin:null, fevAcumMin:45,   marAcumMin:1227, abrAcumMin:1471, maiAcumMin:2334,  isNegative:false },
];

/* ── Types ────────────────────────────────────────────────────────────────── */
type DbEmployee = {
  id: string;
  name: string;
  cpf: string | null;
  registration: string | null;
  department: string | null;
  pinSeedMinutes: number | null;
};

type MatchedEntry = ExcelEntry & {
  dbEmployee: DbEmployee | null;
  matched: boolean;
};

type EditState = { minutes: string; open: boolean };

/* ── Component ────────────────────────────────────────────────────────────── */
export default function PinProject() {
  const [dbEmps, setDbEmps]         = useState<DbEmployee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [importing, setImporting]   = useState(false);
  const [search, setSearch]         = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "ok" | "deficit" | "sem_dados">("all");
  const [sortKey, setSortKey]       = useState<"nome" | "area" | "saldo">("area");
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("asc");
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [savingId, setSavingId]     = useState<string | null>(null);
  const [showInfo, setShowInfo]     = useState(false);

  /* load DB employees */
  const loadDbEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pin-project/balances");
      const j = await r.json();
      if (j.success) setDbEmps(j.employees);
    } catch {
      toast.error("Erro ao carregar funcionários PIN");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDbEmployees(); }, [loadDbEmployees]);

  /* Match Excel entries to DB employees */
  const matched: MatchedEntry[] = useMemo(() => {
    return EXCEL_DATA.map(ex => {
      let dbEmp: DbEmployee | null = null;
      if (ex.cpf) {
        // Match by CPF (normalize – remove dots/dashes for comparison)
        const normCpf = (s: string) => s.replace(/\D/g, "");
        dbEmp = dbEmps.find(d => d.cpf && normCpf(d.cpf) === normCpf(ex.cpf)) ?? null;
      }
      if (!dbEmp) {
        // Fallback: match by normalized name
        const normName = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
        dbEmp = dbEmps.find(d => normName(d.name) === normName(ex.nome)) ?? null;
      }
      return { ...ex, dbEmployee: dbEmp, matched: !!dbEmp };
    });
  }, [dbEmps]);

  /* Areas for filter */
  const areas = useMemo(() => ["all", ...Array.from(new Set(EXCEL_DATA.map(e => e.area))).sort()], []);

  /* Apply filters + sort */
  const visible = useMemo(() => {
    let list = matched;
    if (search) list = list.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()));
    if (filterArea !== "all") list = list.filter(e => e.area === filterArea);
    if (filterStatus === "ok")       list = list.filter(e => e.maiAcumMin !== null && e.maiAcumMin >= 0);
    if (filterStatus === "deficit")  list = list.filter(e => e.maiAcumMin !== null && e.maiAcumMin < 0);
    if (filterStatus === "sem_dados") list = list.filter(e => e.maiAcumMin === null);

    list = [...list].sort((a, b) => {
      let v: number;
      if (sortKey === "nome")  v = a.nome.localeCompare(b.nome, "pt-BR");
      else if (sortKey === "area") v = a.area.localeCompare(b.area, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR");
      else {
        const av = a.maiAcumMin ?? Infinity;
        const bv = b.maiAcumMin ?? Infinity;
        v = av - bv;
      }
      return sortDir === "asc" ? v : -v;
    });
    return list;
  }, [matched, search, filterArea, filterStatus, sortKey, sortDir]);

  /* Summary stats */
  const stats = useMemo(() => {
    const withData = matched.filter(e => e.maiAcumMin !== null);
    const deficits = withData.filter(e => (e.maiAcumMin ?? 0) < 0);
    const ok       = withData.filter(e => (e.maiAcumMin ?? 0) >= 0);
    const totalDef = deficits.reduce((s, e) => s + (e.maiAcumMin ?? 0), 0);
    const totalSur = ok.reduce((s, e) => s + (e.maiAcumMin ?? 0), 0);
    const imported = matched.filter(e => e.dbEmployee && e.dbEmployee.pinSeedMinutes !== null).length;
    return { total: matched.length, deficits: deficits.length, ok: ok.length, noData: matched.length - withData.length, totalDef, totalSur, imported };
  }, [matched]);

  /* Import all to DB */
  const handleImportAll = async () => {
    const toImport = matched.filter(e => e.dbEmployee && e.maiAcumMin !== null);
    if (toImport.length === 0) { toast.error("Nenhum funcionário encontrado no sistema para importar."); return; }
    setImporting(true);
    try {
      const entries = toImport.map(e => ({ employeeId: e.dbEmployee!.id, minutes: e.maiAcumMin!, nome: e.nome }));
      const r = await fetch("/api/pin-project/import-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(`${j.imported} saldos importados com sucesso!`);
        await loadDbEmployees();
      } else {
        toast.error(j.error ?? "Erro na importação");
      }
    } catch {
      toast.error("Erro ao importar saldos");
    } finally {
      setImporting(false);
    }
  };

  /* Save individual balance */
  const handleSave = async (ex: MatchedEntry) => {
    if (!ex.dbEmployee) { toast.error("Funcionário não encontrado no sistema."); return; }
    const st = editStates[ex.cpf + ex.nome];
    if (!st) return;
    const min = parseHHMM(st.minutes);
    if (min === null) { toast.error("Formato inválido. Use ex: 39h18m ou -3h39m"); return; }
    setSavingId(ex.dbEmployee.id);
    try {
      const r = await fetch(`/api/pin-project/balance/${ex.dbEmployee.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: min }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success("Saldo salvo!");
        setEditStates(p => ({ ...p, [ex.cpf + ex.nome]: { ...p[ex.cpf + ex.nome], open: false } }));
        await loadDbEmployees();
      } else {
        toast.error(j.error ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSavingId(null);
    }
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k
      ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />)
      : <ChevronDown className="w-3 h-3 inline ml-0.5 opacity-30" />;

  /* ── Status of an entry ──────────────────────────────────────────────────── */
  const entryStatus = (e: MatchedEntry) => {
    if (!e.matched) return "no_system";
    const dbMin = e.dbEmployee?.pinSeedMinutes;
    if (e.maiAcumMin === null) return "no_excel_may";
    if (dbMin === null) return "not_imported";
    if (dbMin !== e.maiAcumMin) return "diverge";
    return "ok";
  };

  /* ── Month accumulation mini-bar ────────────────────────────────────────── */
  function MonthBar({ min, goal }: { min: number | null; goal: number }) {
    if (min === null) return <span className="text-[10px] text-muted-foreground/40">—</span>;
    const pct = Math.min(Math.abs(min) / goal * 100, 200);
    const isNeg = min < 0;
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className={cn("text-[10px] font-mono font-semibold", isNeg ? "text-red-600" : "text-emerald-600")}>
          {toHHMMRaw(min)}
        </span>
        <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", isNeg ? "bg-red-400" : "bg-emerald-400")}
            style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-foreground">Projeto PIN</h1>
            <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 text-xs">2026</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Controle de horas extras dedicadas ao Projeto PIN — saldos acumulados Jan–Mai/2026
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Base: planilha <strong>PIN - HORAS AREAS 2026.xlsx</strong> · Decreto nº 70.273/2025
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" onClick={() => setShowInfo(v => !v)}>
            <Info className="w-3.5 h-3.5" /> Como funciona
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" onClick={loadDbEmployees} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Atualizar
          </Button>
          <Button size="sm" className="rounded-xl gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={handleImportAll} disabled={importing || loading}>
            {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Importar Planilha para Sistema
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
                    <p className="font-bold text-blue-800 mb-1.5 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Metas mensais PIN</p>
                    <div className="space-y-0.5 text-xs text-blue-700">
                      {Object.entries(PIN_GOALS).slice(0,5).map(([m, g]) => (
                        <div key={m} className="flex justify-between">
                          <span className="capitalize">{MONTH_LABELS[m] ?? m}</span>
                          <span className="font-mono font-bold">{g / 60}h {g === 2880 ? "(compensação)" : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-blue-800 mb-1.5 flex items-center gap-1.5"><Target className="w-4 h-4" /> Como calcular</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>Saldo do mês = horas trabalhadas − meta do mês</li>
                      <li>Saldo acumulado = saldo acumulado anterior + saldo do mês</li>
                      <li>Saldo <strong>positivo</strong> = cumpriu e superou a meta</li>
                      <li>Saldo <strong>negativo</strong> = deve horas ao projeto PIN</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold text-blue-800 mb-1.5 flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4" /> Fluxo de trabalho</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>Saldos em <strong>vermelho</strong> na planilha = negativos</li>
                      <li>Clique "Importar Planilha" para salvar os saldos no sistema</li>
                      <li>Edite individualmente com o ícone ✏️</li>
                      <li>O sistema usa o saldo de Mai/26 como base para Jun/26+</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Summary cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total PIN", value: stats.total, sub: "funcionários na planilha", icon: Users, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "Em Dia",    value: stats.ok,    sub: "saldo ≥ 0h",              icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Déficit",   value: stats.deficits, sub: toHHMM(stats.totalDef) + " total", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Importados",value: stats.imported, sub: `de ${matched.filter(e=>e.dbEmployee&&e.maiAcumMin!==null).length} possíveis`, icon: BadgeCheck, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
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
              <option value="sem_dados">Sem dados de Maio</option>
            </select>
            <span className="text-xs text-muted-foreground ml-auto">{visible.length} de {matched.length} registros</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Main table ────────────────────────────────────────────────────────── */}
      <Card className="rounded-[20px] border-border shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-0 px-6 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Saldos Acumulados — Jan a Mai/2026</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Fonte: planilha PIN — saldo negativo = em déficit (célula vermelha na planilha original)
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
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("nome")}>
                    Nome <SortIcon k="nome" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("area")}>
                    Área <SortIcon k="area" />
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Saldo Dez/25</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Jan/26<br/><span className="text-[9px] font-normal opacity-60">meta 40h</span></th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Fev/26<br/><span className="text-[9px] font-normal opacity-60">meta 40h</span></th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Mar/26<br/><span className="text-[9px] font-normal opacity-60">meta 40h</span></th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Abr/26<br/><span className="text-[9px] font-normal opacity-60">meta 48h ★</span></th>
                  <th className="px-3 py-2.5 text-center font-semibold text-foreground bg-blue-50/60">
                    Mai/26 Acumulado<br/><span className="text-[9px] font-normal opacity-60">meta 40h</span>
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Sistema</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {visible.map((e, i) => {
                  const key = e.cpf + e.nome;
                  const ed = editStates[key];
                  const isEditOpen = ed?.open;
                  const dbMin = e.dbEmployee?.pinSeedMinutes ?? null;
                  const maiMin = e.maiAcumMin;
                  const isNeg = (maiMin ?? 0) < 0;
                  const hasMay = maiMin !== null;
                  const status = entryStatus(e);
                  const saving = savingId === e.dbEmployee?.id;

                  return (
                    <tr key={key} className={cn("group hover:bg-muted/30 transition-colors", i % 2 === 1 && "bg-muted/10")}>
                      {/* Nome */}
                      <td className="px-4 py-2 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {hasMay ? (
                            isNeg
                              ? <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              : <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          ) : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />}
                          <span className="truncate max-w-[180px]" title={e.nome}>{e.nome}</span>
                          {!e.matched && <Badge variant="outline" className="text-[9px] px-1 py-0 border-orange-300 text-orange-600 shrink-0">não encontrado</Badge>}
                        </div>
                      </td>
                      {/* Área */}
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-border text-muted-foreground font-medium">{e.area}</Badge>
                      </td>
                      {/* Saldo Dez/25 */}
                      <td className="px-3 py-2 text-center font-mono text-[11px] text-muted-foreground">
                        {e.saldoDezMin !== null ? toHHMMRaw(e.saldoDezMin) : "—"}
                      </td>
                      {/* Meses Jan-Abr acumulado */}
                      {[e.janAcumMin, e.fevAcumMin, e.marAcumMin, e.abrAcumMin].map((min, mi) => (
                        <td key={mi} className="px-3 py-2 text-center">
                          <MonthBar min={min} goal={mi === 3 ? PIN_GOALS.abr : PIN_GOALS.jan} />
                        </td>
                      ))}
                      {/* Mai/26 Acumulado — destaque */}
                      <td className={cn("px-3 py-2 text-center bg-blue-50/40", !hasMay && "opacity-50")}>
                        {hasMay ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn("text-xs font-mono font-bold", isNeg ? "text-red-600" : "text-emerald-600")}>
                              {isNeg ? "▼ " : "▲ "}{toHHMMRaw(Math.abs(maiMin!))}
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", isNeg ? "bg-red-500" : "bg-emerald-500")}
                                style={{ width: `${Math.min(Math.abs(maiMin!) / (PIN_GOALS.mai * 2) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : <span className="text-muted-foreground/40 text-[10px]">Sem dados</span>}
                      </td>
                      {/* Sistema (valor importado) */}
                      <td className="px-3 py-2 text-center">
                        {!e.matched ? (
                          <span className="text-[10px] text-orange-500">Não vinculado</span>
                        ) : dbMin !== null ? (
                          <span className={cn("text-[11px] font-mono font-semibold", (dbMin ?? 0) < 0 ? "text-red-600" : "text-emerald-600")}>
                            {toHHMMRaw(dbMin)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">Não importado</span>
                        )}
                      </td>
                      {/* Ação */}
                      <td className="px-3 py-2 text-center">
                        {e.matched && (
                          isEditOpen ? (
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="text"
                                value={ed?.minutes ?? ""}
                                onChange={ev => setEditStates(p => ({ ...p, [key]: { ...p[key], minutes: ev.target.value } }))}
                                placeholder="ex: 39h18m"
                                className="w-24 px-2 py-1 text-[11px] border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 font-mono"
                                onKeyDown={ev => { if (ev.key === "Enter") handleSave(e); if (ev.key === "Escape") setEditStates(p => ({ ...p, [key]: { ...p[key], open: false } })); }}
                              />
                              <Button size="sm" className="h-6 px-2 text-[10px] gap-1 rounded-lg" onClick={() => handleSave(e)} disabled={saving}>
                                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 rounded-lg" onClick={() => setEditStates(p => ({ ...p, [key]: { ...p[key], open: false } }))}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] gap-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEditStates(p => ({
                                ...p,
                                [key]: { open: true, minutes: maiMin !== null ? toHHMMRaw(maiMin) : "" }
                              }))}
                            >
                              <Edit2 className="w-3 h-3" /> Editar
                            </Button>
                          )
                        )}
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
          <span><strong>★</strong> Abril tem meta de <strong>48h</strong> (compensação de feriado conforme Decreto nº 70.273/2025)</span>
          <span>· Saldo acumulado = soma de todos os saldos mensais desde Dez/2025</span>
          <span>· Coluna <strong>Sistema</strong> = valor salvo no banco de dados após importação</span>
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
                  {stats.deficits} funcionário{stats.deficits > 1 ? "s" : ""} com déficit acumulado até Mai/2026
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Total de déficit: <strong>{toHHMM(stats.totalDef)}</strong> — esses funcionários precisam compensar as horas faltantes nos próximos meses do Projeto PIN.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {matched.filter(e => (e.maiAcumMin ?? 0) < 0).map(e => (
                    <Badge key={e.cpf + e.nome} className="text-[10px] bg-red-100 text-red-700 border border-red-200 hover:bg-red-200">
                      {e.nome.split(" ")[0]} {e.nome.split(" ").slice(-1)[0]} ({toHHMM(e.maiAcumMin)})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </motion.div>
  );
}
