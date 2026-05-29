import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RateLimitOptions = {
  key: string;
  route: string;
  limit: number;
  windowSeconds: number;
};

const memoryStore = new Map<string, { count: number; windowStart: number }>();

export async function checkRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const mapKey = `${options.route}:${options.key}`;

  try {
    const supabase = getSupabaseAdminClient();
    const windowStart = new Date(now - windowMs).toISOString();
    const { data } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("key", options.key)
      .eq("route", options.route)
      .gte("window_start", windowStart)
      .maybeSingle();

    if (!data) {
      await supabase.from("rate_limits").insert({
        key: options.key,
        route: options.route,
        count: 1,
        window_start: new Date().toISOString(),
      });
      return { allowed: true, remaining: options.limit - 1 };
    }

    if (data.count >= options.limit) {
      return { allowed: false, remaining: 0 };
    }

    await supabase
      .from("rate_limits")
      .update({ count: data.count + 1, updated_at: new Date().toISOString() })
      .eq("id", data.id);

    return { allowed: true, remaining: options.limit - data.count - 1 };
  } catch {
    const current = memoryStore.get(mapKey);
    if (!current || now - current.windowStart > windowMs) {
      memoryStore.set(mapKey, { count: 1, windowStart: now });
      return { allowed: true, remaining: options.limit - 1 };
    }

    if (current.count >= options.limit) {
      return { allowed: false, remaining: 0 };
    }

    current.count += 1;
    return { allowed: true, remaining: options.limit - current.count };
  }
}

export const rateLimitedResponse = Response.json(
  {
    error: true,
    code: "RATE_LIMITED",
    message: "You’re moving fast. Please wait a few minutes before trying again.",
  },
  { status: 429 },
);
