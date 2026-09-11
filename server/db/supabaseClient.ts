import dotenv from 'dotenv';
dotenv.config();

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://drwlnwxgycfazkekcgql.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd2xud3hneWNmYXprZWtjZ3FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODUzMzI5NiwiZXhwIjoyMTA0MTA5Mjk2fQ.W0hlKe-r-XguGXrfvF8K3GltsqI-DuGYbnOGXhdC2h0';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
