#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.join(__dirname, 'SUPABASE_SCHEMA.sql');

if (!fs.existsSync(sqlPath)) {
  console.error('❌ SUPABASE_SCHEMA.sql not found');
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

console.log('\n📋 Chronos Ponto - Schema SQL\n');
console.log('═'.repeat(70));
console.log('\n📌 Copy-paste everything below into Supabase SQL Editor:\n');
console.log('═'.repeat(70));
console.log('\n');
console.log(sqlContent);
console.log('\n' + '═'.repeat(70));
console.log('\n✅ Steps:');
console.log('   1. Go to: https://supabase.com/dashboard/projects');
console.log('   2. Select: yhwiertvbkeirvlieuag');
console.log('   3. Click: SQL Editor → New Query');
console.log('   4. Paste: Everything above');
console.log('   5. Click: Run\n');
console.log('═'.repeat(70) + '\n');
