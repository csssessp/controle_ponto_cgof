/**
 * Script para limpar todos os dados fictícios do banco
 * Remove TODOS os funcionários, registros de ponto e dados de ponto banco
 * Mantém apenas as organizações e estrutura base
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function cleanDatabase() {
  try {
    console.log("🧹 Iniciando limpeza de dados fictícios...\n");

    // 1. Limpar time_entries (dependência)
    console.log("🗑️  Removendo time_entries...");
    const { data: entries, error: entriesErr } = await supabase
      .from("time_entries")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    if (!entriesErr) console.log(`   ✅ ${entries?.length || 0} registros removidos`);

    // 2. Limpar attendance_records
    console.log("🗑️  Removendo attendance_records...");
    const { data: records, error: recordsErr } = await supabase
      .from("attendance_records")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    if (!recordsErr) console.log(`   ✅ ${records?.length || 0} registros removidos`);

    // 3. Limpar time_bank_entries
    console.log("🗑️  Removendo time_bank_entries...");
    const { data: bank, error: bankErr } = await supabase
      .from("time_bank_entries")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    if (!bankErr) console.log(`   ✅ ${bank?.length || 0} registros removidos`);

    // 4. Limpar absences
    console.log("🗑️  Removendo absences...");
    const { data: absences, error: absencesErr } = await supabase
      .from("absences")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    if (!absencesErr) console.log(`   ✅ ${absences?.length || 0} registros removidos`);

    // 5. Limpar users vinculados a employees
    console.log("🗑️  Removendo users...");
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    if (!usersErr) console.log(`   ✅ ${users?.length || 0} registros removidos`);

    // 6. Limpar employees
    console.log("🗑️  Removendo employees...");
    const { data: employees, error: employeesErr } = await supabase
      .from("employees")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    if (!employeesErr) console.log(`   ✅ ${employees?.length || 0} funcionários removidos`);

    // 7. Limpar schedules
    console.log("🗑️  Removendo schedules...");
    const { data: schedules, error: schedulesErr } = await supabase
      .from("schedules")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    if (!schedulesErr) console.log(`   ✅ ${schedules?.length || 0} registros removidos`);

    // 8. Limpar departments
    console.log("🗑️  Removendo departments...");
    const { data: departments, error: departmentsErr } = await supabase
      .from("departments")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    if (!departmentsErr) console.log(`   ✅ ${departments?.length || 0} registros removidos`);

    console.log("\n✅ Limpeza concluída com sucesso!");
    console.log("   O banco está limpo e pronto para importação de dados reais.\n");
  } catch (error) {
    console.error("❌ Erro durante limpeza:", error);
    process.exit(1);
  }
}

cleanDatabase().then(() => process.exit(0));
