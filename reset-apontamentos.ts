/**
 * reset-apontamentos.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Apaga TODOS os registros de ponto (attendance_records + time_entries) e
 * limpa o histórico de uploads, mantendo:
 *   ✔ Funcionários            (employees)
 *   ✔ Saldos do banco de horas (time_bank_entries)  ← usados no cálculo do mês 05
 *   ✔ Departamentos, jornadas e organização
 *
 * Uso:
 *   npx tsx reset-apontamentos.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error("❌ Variáveis de ambiente não encontradas.");
  console.error("   Certifique-se que VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE estão no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

async function countRows(table: string): Promise<number> {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

async function deleteAll(table: string, label: string): Promise<number> {
  // Deleta tudo usando filtro "sempre verdadeiro" (id != UUID nulo)
  const DUMMY = "00000000-0000-0000-0000-000000000000";
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .neq("id", DUMMY);

  if (error) {
    // Tenta via gt vazio caso o método acima falhe
    const { error: e2, count: c2 } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .gt("created_at", "1900-01-01");
    if (e2) {
      console.error(`   ❌ Erro ao apagar ${label}: ${e2.message}`);
      return 0;
    }
    console.log(`   ✅ ${label.padEnd(30)} ${fmt(c2 ?? 0)} registro(s) apagado(s)`);
    return c2 ?? 0;
  }

  console.log(`   ✅ ${label.padEnd(30)} ${fmt(count ?? 0)} registro(s) apagado(s)`);
  return count ?? 0;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("   CHRONOS PONTO — Reset de Apontamentos");
  console.log("══════════════════════════════════════════════════════════════\n");

  // ── Contagens ANTES ────────────────────────────────────────────────────────
  console.log("📊 Situação ANTES da limpeza:\n");

  const [
    cEmployees,
    cBankEntries,
    cAttendance,
    cTimeEntries,
  ] = await Promise.all([
    countRows("employees"),
    countRows("time_bank_entries"),
    countRows("attendance_records"),
    countRows("time_entries"),
  ]);

  console.log(`   Funcionários (mantidos):          ${fmt(cEmployees)}`);
  console.log(`   Saldos banco de horas (mantidos): ${fmt(cBankEntries)}`);
  console.log(`   Registros de ponto (a apagar):    ${fmt(cAttendance)}`);
  console.log(`   Batidas individuais (a apagar):   ${fmt(cTimeEntries)}`);

  if (cAttendance === 0 && cTimeEntries === 0) {
    console.log("\n✅ Sistema já está sem apontamentos. Nenhuma ação necessária.\n");
    await printBankSummary();
    process.exit(0);
  }

  console.log("\n🗑️  Iniciando limpeza de apontamentos...\n");

  // ── 1. Batidas individuais (time_entries) ──────────────────────────────────
  //    Devem ser apagadas ANTES dos attendance_records por FK
  console.log("1️⃣  Apagando batidas individuais (time_entries)...");
  await deleteAll("time_entries", "time_entries");

  // ── 2. Registros de ponto (attendance_records) ─────────────────────────────
  console.log("\n2️⃣  Apagando registros de ponto (attendance_records)...");
  await deleteAll("attendance_records", "attendance_records");

  // ── 3. Histórico de uploads ────────────────────────────────────────────────
  console.log("\n3️⃣  Limpando histórico de uploads...");
  // Tenta tabela "uploads" (snake_case) — pode não existir em todos os ambientes
  const { error: upErr } = await supabase
    .from("uploads")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (upErr && upErr.code !== "42P01") {
    console.log(`   ⚠️  uploads: ${upErr.message}`);
  } else if (!upErr) {
    console.log("   ✅ uploads                        histórico limpo");
  } else {
    console.log("   ℹ️  Tabela uploads não encontrada (ignorado)");
  }

  // ── Contagens DEPOIS ───────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("📊 Situação DEPOIS da limpeza:\n");

  const [
    cAttAfter,
    cTimeAfter,
    cBankAfter,
    cEmpAfter,
  ] = await Promise.all([
    countRows("attendance_records"),
    countRows("time_entries"),
    countRows("time_bank_entries"),
    countRows("employees"),
  ]);

  console.log(`   Registros de ponto restantes:     ${fmt(cAttAfter)}`);
  console.log(`   Batidas individuais restantes:    ${fmt(cTimeAfter)}`);
  console.log(`   Saldos banco de horas (intactos): ${fmt(cBankAfter)}`);
  console.log(`   Funcionários (intactos):          ${fmt(cEmpAfter)}`);

  const ok = cAttAfter === 0 && cTimeAfter === 0;
  console.log(ok
    ? "\n✅ LIMPEZA CONCLUÍDA COM SUCESSO!"
    : "\n⚠️  Alguns registros podem não ter sido apagados. Verifique as mensagens acima."
  );

  // ── Resumo do Banco de Horas ───────────────────────────────────────────────
  await printBankSummary();

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 Sistema pronto para importação do mês 05.");
  console.log("   Os saldos acima serão considerados nos cálculos automáticos.");
  console.log("══════════════════════════════════════════════════════════════\n");
}

// ── Resumo do banco de horas por funcionário ──────────────────────────────────

async function printBankSummary() {
  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("💰 Saldos do Banco de Horas (por funcionário):\n");

  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, name")
    .order("name");

  if (empErr || !employees?.length) {
    console.log("   Nenhum funcionário encontrado.");
    return;
  }

  const { data: bankRows, error: bankErr } = await supabase
    .from("time_bank_entries")
    .select("employee_id, minutes");

  if (bankErr) {
    console.log(`   Erro ao ler banco de horas: ${bankErr.message}`);
    return;
  }

  // Agrupa saldo por employee_id
  const saldoMap: Record<string, number> = {};
  for (const row of (bankRows || []) as any[]) {
    const empId = row.employee_id ?? row.employeeId;
    saldoMap[empId] = (saldoMap[empId] ?? 0) + (row.minutes ?? 0);
  }

  let comSaldo = 0;
  let semSaldo = 0;

  for (const emp of employees as any[]) {
    const saldo = saldoMap[emp.id] ?? 0;
    if (saldo === 0) { semSaldo++; continue; }

    const neg = saldo < 0;
    const abs = Math.abs(saldo);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const saldoStr = `${neg ? "-" : "+"}${String(h).padStart(3, "0")}:${String(m).padStart(2, "0")}`;
    console.log(`   ${emp.name.padEnd(48)} ${saldoStr}`);
    comSaldo++;
  }

  if (semSaldo > 0) {
    console.log(`\n   (${semSaldo} funcionário(s) com saldo zero — não exibidos)`);
  }

  if (comSaldo === 0) {
    console.log("   Nenhum saldo registrado. Todos os funcionários estão com saldo zero.");
  }
}

main().catch((err) => {
  console.error("\n❌ Erro inesperado:", err.message ?? err);
  process.exit(1);
});
