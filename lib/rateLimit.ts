// Minimal in-memory rate limiter. Baseline defense (zero-dependency); on
// serverless it is per-instance, so treat it as best-effort, not a hard global
// cap. Swap the store for Upstash/Redis when a hard multi-instance limit is
// needed — the call sites below stay unchanged.
interface Hit {
  count: number;
  resetAt: number;
}

// Backed by globalThis so the same map survives dev HMR and is shared across
// route-handler module layers within one instance.
const globalStore = globalThis as unknown as { __ai2bRate?: Map<string, Hit> };
const store: Map<string, Hit> = (globalStore.__ai2bRate ??= new Map());

// Returns { ok } — false when the caller has exceeded `limit` hits per
// `windowMs`. `retryAfter` is seconds until the window resets.
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || hit.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (hit.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)) };
  }
  hit.count += 1;
  return { ok: true, retryAfter: 0 };
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
