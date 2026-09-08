import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client. SERVER-ONLY: it bypasses Row Level Security, so
// it must never be imported into a client component or exposed through a
// NEXT_PUBLIC_ variable.
//
// Use it only from trusted server entry points that have no user session and
// authenticate by other means — currently just the GitHub webhook, which
// verifies an HMAC signature instead of a cookie.
let cached: SupabaseClient | null = null;

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createServiceClient requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  if (!cached) {
    cached = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cached;
}
