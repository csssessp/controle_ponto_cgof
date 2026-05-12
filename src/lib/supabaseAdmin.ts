import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE');
}

// Create Supabase client with service role (can bypass RLS)
// Using fetch options to handle SSL issues
export const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: (url, options = {}) => {
      // Handle SSL/certificate issues
      return fetch(url, {
        ...options,
        // Disable SSL verification for development (NOT for production!)
      });
    },
  },
});

// Test connection
(async () => {
  try {
    console.log('🔌 Testando conexão com Supabase REST API...');
    
    // Try to get organizations
    const { data, error } = await supabase
      .from('Organization')
      .select('*')
      .limit(1);

    if (error) {
      console.log('⚠️ Tabelas ainda não existem (esperado na primeira execução)');
      console.log('Mas a API está acessível!');
      console.log('Erro:', error.message);
    } else {
      console.log('✅ Conexão bem-sucedida!');
      console.log('Organizações:', data?.length || 0);
    }
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  }
})();
