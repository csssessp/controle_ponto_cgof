import "dotenv/config";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE;
if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE in .env");
const sb = createClient(url, key);

const { data, error } = await sb.from("employees").select("id, name").order("name");
if (error) { console.error("Error:", error); process.exit(1); }
console.log(`Found ${data?.length} employees:`);
for (const e of data ?? []) console.log(` ${e.id}  |  ${e.name}`);
