import { supabase } from './src/lib/supabase';

console.log('Supabase Auth Methods:', Object.keys(supabase.auth));
if (supabase.auth.mfa) {
  console.log('Supabase Auth MFA Methods:', Object.keys(supabase.auth.mfa));
}
