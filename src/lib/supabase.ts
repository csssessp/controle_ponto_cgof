import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return { url, key };
};

export const supabase = (() => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    // Return a dummy client that warns when used, or just null
    // To follow "lazy initialization" pattern:
    console.warn("Supabase credentials missing. Check your environment variables.");
    return null as any; 
  }
  return createClient(url, key);
})();

// Re-export a helper to check if supabase is ready
export const isSupabaseReady = () => {
    const { url, key } = getSupabaseConfig();
    return !!(url && key);
};

export type UserRole = 'ADMIN' | 'RH' | 'MANAGER' | 'EMPLOYEE';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  organization_id: string;
  employee_id?: string;
}
