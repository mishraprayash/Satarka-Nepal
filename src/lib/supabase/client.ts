import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { CONFIG } from "@/lib/config";

let browserClient: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(CONFIG.supabase.url && CONFIG.supabase.anonKey);
}

/**
 * Returns the client-side Supabase singleton.
 * Returns null if Supabase environment variables are not configured,
 * ensuring zero runtime crashes on local/preview without DB credentials.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;

  if (!browserClient) {
    browserClient = createClient<Database>(
      CONFIG.supabase.url!,
      CONFIG.supabase.anonKey!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      },
    );
  }

  return browserClient;
}
