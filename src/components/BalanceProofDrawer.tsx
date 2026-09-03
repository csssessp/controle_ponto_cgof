/* ═══════════════════════════════════════════════════════════════════════════
   Comprovação de Saldo — Banco de Horas (Projeto PIN)

   Mostra, mês a mês e (quando aplicável) dia a dia, exatamente como o saldo
   acumulado de um servidor foi calculado — a mesma fonte de verdade usada em
   TimeCard.tsx / PinProject.tsx / Reports.tsx (/api/pin-project/auto-balances,
   ver server.ts). Existe pra responder "por que o saldo está nesse valor?"
   sem precisar reconstruir a conta manualmente.
   ═══════════════════════════════════════════════════════════════════════════ */
import React, { useMemo, useState } from "react";
import { X, ChevronDown, ChevronRight, FileDown, ShieldCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { findPinHistorical, PIN_MONTH_ABBR, type PinAutoMonths, type PinDayCalc } from "@/src/lib/pinHistoricalData";

const toHHMM = (min: number) => {
  const a = Math.abs(Math.round(min));
  return (min < 0 ? "-" : min > 0 ? "+" : "") + String(Math.floor(a / 60)).padStart(2, "0") + ":" + String(a % 60).padStart(2, "0");
};
const fmtDate = (d: string) => d?.substring(0, 10).split("-").reverse().join("/") || d;
const MONTH_ABBR_TO_LABEL: Record<string, string> = {
  JAN: "Janeiro", FEV: "Fevereiro", MAR: "Março", ABR: "Abril", MAI: "Maio", JUN: "Junho",
  JUL: "Julho", AGO: "Agosto", SET: "Setembro", OUT: "Outubro", NOV: "Novembro", DEZ: "Dezembro",
};
const STATUS_LABEL: Record<string, string> = {
  NORMAL: "Normal", VACATION: "Férias", HOLIDAY: "Feriado", OFF_DAY: "Folga",
  ABSENCE: "Falta", PREMIUM_LEAVE: "Licença-prêmio", COMPENSATION: "Compensação",
};

type Props = {
  employee: { id: string; name: string; registration: string; departments?: { name: string } };
  autoMonths: PinAutoMonths;
  onClose: () => void;
};

export default function BalanceProofDrawer({ employee, autoMonths, onClose }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const hist = useMemo(() => findPinHistorical(employee.name), [employee.name]);

  // Ordena os meses cronologicamente (chaves tipo "JAN2026", "AGO2026" …)
  const monthKeys = useMemo(() => {
    const abbrToNum: Record<string, number> = Object.fromEntries(Object.entries(PIN_MONTH_ABBR).map(([n, a]) => [a, Number(n)]));
    return Object.keys(autoMonths).sort((a, b) => {
      const ya = Number(a.slice(3)), yb = Number(b.slice(3));
      if (ya !== yb) return ya - yb;
      return abbrToNum[a.slice(0, 3)] - abbrToNum[b.slice(0, 3)];
    });
  }, [autoMonths]);

  const rows = useMemo(() => {
    let prevAcum = hist?.saldoDez ?? 0;
    return monthKeys.map(mk => {
      const data = autoMonths[mk];
      const saldoMes = data.acum !== null ? data.acum - prevAcum : null;
      if (data.acum !== null) prevAcum = data.acum;
      const abbr = mk.slice(0, 3);
      const year = mk.slice(3);
      const kind: "frozen" | "auto" | "override" = data.isManualOverride
        ? "override"
        : (data.days ? "auto" : "frozen");
      return { mk, label: `${MONTH_ABBR_TO_LABEL[abbr] ?? abbr} ${year}`, ...data, saldoMes, kind };
    });
  }, [monthKeys, autoMonths, hist]);

  const toggle = (mk: string) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(mk) ? n.delete(mk) : n.add(mk);
    return n;
  });

  const finalAcum = rows.length ? rows[rows.length - 1].acum : null;

  /* ── Exporta a comprovação completa como PDF (mesmo padrão visual dos
     demais relatórios oficiais do sistema) ────────────────────────────── */
  const exportPdf = () => {
    const genDate = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const monthRows = rows.map(r => {
      const kindLabel = r.kind === "frozen" ? "Planilha oficial (congelado)" : r.kind === "override" ? "Ajuste manual" : "Cálculo automático (espelho de ponto)";
      const dayTable = r.days?.length ? `
        <table class="daytable">
          <thead><tr><th>Data</th><th>Status</th><th>Extra</th><th>Déficit</th><th>Líquido</th></tr></thead>
          <tbody>
            ${r.days.map(d => `
              <tr>
                <td>${fmtDate(d.date)}</td>
                <td>${STATUS_LABEL[d.status] ?? d.status}</td>
                <td class="pos">${d.ot > 0 ? toHHMM(d.ot) : "—"}</td>
                <td class="neg">${d.delay > 0 ? toHHMM(-d.delay).replace("-","") : "—"}</td>
                <td class="${d.net >= 0 ? 'pos' : 'neg'}">${toHHMM(d.net)}</td>
              </tr>`).join("")}
          </tbody>
        </table>` : "";
      return `
        <tr class="monthrow">
          <td class="name">${r.label}</td>
          <td>${kindLabel}</td>
          <td class="mono">${r.extras ? toHHMM(r.extras) : "—"}</td>
          <td class="mono">${toHHMM(r.goal)}</td>
          <td class="mono ${r.saldoMes !== null && r.saldoMes < 0 ? 'neg' : 'pos'}">${r.saldoMes !== null ? toHHMM(r.saldoMes) : "—"}</td>
          <td class="mono bold ${r.acum !== null && r.acum < 0 ? 'neg' : 'pos'}">${r.acum !== null ? toHHMM(r.acum) : "—"}</td>
        </tr>
        ${dayTable ? `<tr><td colspan="6" style="padding:0">${dayTable}</td></tr>` : ""}`;
    }).join("");

    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup bloqueado. Libere popups para imprimir."); return; }
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Comprovação de Banco de Horas — ${employee.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;color:#111827;background:#fff;font-size:10.5px;padding:26mm 16mm 18mm}
  .lh{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #0f2044;margin-bottom:14px}
  .lh .logo-crop{width:55px;height:64px;overflow:hidden;position:relative;display:inline-block}
  .lh .logo-crop img{height:64px;width:auto;position:absolute;left:0;top:0}
  .lh .org h1{font-size:14px;font-weight:800;color:#0f2044}
  .lh .org p{font-size:10px;color:#6b7280;margin-top:2px}
  .lh .ref{text-align:right;font-size:10px;color:#6b7280}
  .lh .ref strong{display:block;font-size:12px;color:#0f2044;font-weight:800}
  .title-row{margin-bottom:4px}
  .title-row h2{font-size:18px;font-weight:800;color:#0f2044}
  .subtitle{font-size:10.5px;color:#6b7280;margin-bottom:10px}
  .emp{display:flex;gap:22px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:10.5px}
  .emp b{color:#0f2044}
  .formula{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:9.5px;color:#1e3a8a;line-height:1.5}
  .final{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center}
  .final .fl{font-size:10px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.06em}
  .final .fv{font-size:20px;font-weight:800;color:#15803d;font-family:'Courier New',monospace}
  table{width:100%;border-collapse:collapse;font-size:10px}
  thead tr{background:#0f2044}
  thead th{color:#fff;padding:6px 8px;text-align:left;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
  tbody tr.monthrow{border-top:1.5px solid #e5e7eb}
  td{padding:6px 8px;vertical-align:middle}
  td.name{font-weight:700;color:#111827}
  td.mono{font-family:'Courier New',monospace}
  td.bold{font-weight:800}
  td.pos{color:#15803d}
  td.neg{color:#dc2626}
  .daytable{width:100%;border-collapse:collapse;font-size:9px;margin:2px 0 8px 18px;width:calc(100% - 18px)}
  .daytable thead tr{background:#f1f5f9}
  .daytable thead th{color:#475569;padding:4px 8px;font-size:8px;text-transform:uppercase}
  .daytable td{padding:3px 8px;border-bottom:1px solid #f3f4f6}
  .sig{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig .sl{font-size:9px;color:#9ca3af;margin-bottom:26px}
  .sig .sline{border-top:1.5px solid #374151;margin-bottom:5px}
  .sig .sn{font-size:10px;font-weight:700;color:#111827}
  .sig .sr{font-size:9px;color:#6b7280}
  .footer{margin-top:18px;display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af}
  @media print{@page{size:A4 portrait;margin:12mm 10mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}thead{display:table-header-group}tr{page-break-inside:avoid}}
</style></head><body>
  <div class="lh">
    <div style="display:flex;align-items:center;gap:16px">
      <div class="logo-crop"><img src="/img/Bras%C3%A3o.png" alt="Logo"/></div>
      <div class="org"><h1>Coordenadoria de Gestão Orçamentária e Financeira</h1><p>Secretaria de Estado da Saúde de São Paulo — CGOF</p><p>Projeto PIN — Banco de Horas</p></div>
    </div>
    <div class="ref"><strong>COMP-PIN-${employee.registration}</strong><div>Gerado: ${genDate}</div></div>
  </div>
  <div class="title-row"><h2>Comprovação de Saldo do Banco de Horas</h2></div>
  <div class="subtitle">Memória de cálculo completa — mês a mês e, quando aplicável, dia a dia.</div>
  <div class="emp">
    <div><b>Servidor:</b> ${employee.name}</div>
    <div><b>Matrícula:</b> ${employee.registration}</div>
    <div><b>Setor:</b> ${employee.departments?.name ?? "—"}</div>
  </div>
  <div class="formula">
    <b>Fórmula:</b> Saldo Acumulado = Saldo inicial (Dez/2025) + Σ (Extras − Déficit − Meta de 40h), mês a mês.
    Jan–Jul/2026 usam o valor oficial e congelado da planilha "PIN - Horas Area 2026.xlsx". A partir de Ago/2026 o
    cálculo é automático a partir do espelho de ponto. Dias de férias, feriado e folga nunca geram déficit (a jornada
    esperada nesses dias é zero), mas horas extras efetivamente trabalhadas nesses dias são contabilizadas normalmente.
  </div>
  <table>
    <thead><tr><th>Mês</th><th>Origem</th><th>Extras</th><th>Meta</th><th>Saldo do mês</th><th>Saldo acumulado</th></tr></thead>
    <tbody>${monthRows}</tbody>
  </table>
  ${finalAcum !== null ? `<div class="final"><span class="fl">Saldo acumulado atual</span><span class="fv">${toHHMM(finalAcum)}</span></div>` : ""}
  <div class="sig">
    <div><div class="sl">Responsável pela elaboração</div><div class="sline"></div><div class="sn">_______________________________</div><div class="sr">Nome / Matrícula — CGOF</div></div>
    <div><div class="sl">Visto da Chefia Imediata</div><div class="sline"></div><div class="sn">_______________________________</div><div class="sr">Coordenador(a) CGOF</div></div>
  </div>
  <div class="footer"><span>CGOF — Coordenadoria de Gestão Orçamentária e Financeira</span><span>${employee.name} — Comprovação de Banco de Horas</span></div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
    win.document.close();
    toast.success("PDF gerado!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-card h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-br from-slate-50 to-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl border border-emerald-100 bg-emerald-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm leading-tight">Comprovação de Banco de Horas</p>
              <p className="text-xs text-muted-foreground mt-0.5">{employee.name} · #{employee.registration}</p>
              {finalAcum !== null && (
                <p className={cn("text-xs font-bold mt-1", finalAcum >= 0 ? "text-emerald-600" : "text-red-600")}>
                  Saldo acumulado atual: {toHHMM(finalAcum)}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Formula explainer */}
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex gap-3 text-xs text-blue-900 leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Como o saldo é calculado</p>
              <p>Saldo Acumulado = Saldo inicial (Dez/2025) + soma de (Extras − Déficit − Meta 40h) de cada mês.
              Jan–Jul/2026 usam o valor oficial congelado da planilha do Projeto PIN. A partir de Ago/2026 o cálculo
              é automático, a partir do espelho de ponto real. Dias de férias/feriado/folga nunca geram déficit
              (jornada esperada = 0 nesses dias), mas qualquer hora extra efetivamente trabalhada nesses dias
              continua contando normalmente.</p>
            </div>
          </div>

          {/* Month-by-month table */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-2 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Mês</th>
                  <th className="text-left px-3 py-2 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Origem</th>
                  <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Extras</th>
                  <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Meta</th>
                  <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Saldo do mês</th>
                  <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Acumulado</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <React.Fragment key={r.mk}>
                    <tr
                      className={cn("border-t border-border/50 hover:bg-muted/20 transition-colors", r.days?.length && "cursor-pointer")}
                      onClick={() => r.days?.length && toggle(r.mk)}
                    >
                      <td className="px-3 py-2 font-semibold">{r.label}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                          r.kind === "frozen" ? "bg-slate-50 text-slate-600 border-slate-200"
                            : r.kind === "override" ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        )}>
                          {r.kind === "frozen" ? "Planilha oficial" : r.kind === "override" ? "Ajuste manual" : "Cálculo automático"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{r.extras ? toHHMM(r.extras) : "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{toHHMM(r.goal)}</td>
                      <td className={cn("px-3 py-2 text-right font-mono font-semibold", r.saldoMes !== null && r.saldoMes < 0 ? "text-red-600" : "text-emerald-600")}>
                        {r.saldoMes !== null ? toHHMM(r.saldoMes) : "—"}
                      </td>
                      <td className={cn("px-3 py-2 text-right font-mono font-bold", r.acum !== null && r.acum < 0 ? "text-red-600" : "text-emerald-600")}>
                        {r.acum !== null ? toHHMM(r.acum) : "—"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {r.days?.length ? (expanded.has(r.mk) ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />) : null}
                      </td>
                    </tr>
                    {r.days?.length && expanded.has(r.mk) && (
                      <tr className="bg-muted/10">
                        <td colSpan={7} className="px-3 pb-3">
                          <div className="rounded-xl border border-border/60 overflow-hidden ml-2">
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="bg-muted/30">
                                  <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Data</th>
                                  <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Status</th>
                                  <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">Extra</th>
                                  <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">Déficit</th>
                                  <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">Líquido</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.days.map((d: PinDayCalc) => (
                                  <tr key={d.date} className="border-t border-border/30">
                                    <td className="px-3 py-1.5">{fmtDate(d.date)}</td>
                                    <td className="px-3 py-1.5 text-muted-foreground">{STATUS_LABEL[d.status] ?? d.status}</td>
                                    <td className="px-3 py-1.5 text-right font-mono text-emerald-600">{d.ot > 0 ? `+${toHHMM(d.ot).replace("+","")}` : "—"}</td>
                                    <td className="px-3 py-1.5 text-right font-mono text-red-600">{d.delay > 0 ? toHHMM(d.delay) : "—"}</td>
                                    <td className={cn("px-3 py-1.5 text-right font-mono font-semibold", d.net >= 0 ? "text-emerald-600" : "text-red-600")}>{toHHMM(d.net)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Sem dados de banco de horas para este servidor.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-muted/20 shrink-0">
          <button
            onClick={exportPdf}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            <FileDown className="w-4 h-4" /> Exportar Comprovação em PDF
          </button>
        </div>
      </div>
    </div>
  );
}
