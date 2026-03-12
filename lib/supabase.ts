import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service role key.
 * NEVER import this in client components or expose to the browser.
 */
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
