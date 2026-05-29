"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  if (url.includes("your-project-ref") || anonKey.includes("your-supabase-anon-key")) {
    throw new Error(
      "Supabase is still using placeholder values in .env.local. Add your project URL and anon key, then restart the dev server.",
    );
  }

  return createBrowserClient(url, anonKey);
}
