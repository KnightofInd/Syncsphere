import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isConfigured =
  supabaseUrl.startsWith('http') && supabaseAnonKey.length > 20;

// Export a real client when credentials are present, otherwise export null
// so every caller can guard with `if (!supabase) { … }` during local dev.
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isConfigured && typeof window !== 'undefined') {
  console.warn(
    '[SyncSphere] Supabase credentials are missing or invalid.\n' +
      'Copy .env.example → .env.local and fill in your project URL & anon key.'
  );
}

