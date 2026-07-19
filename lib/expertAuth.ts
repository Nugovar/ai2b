// Expert-portal gate. Mirrors lib/adminAuth.ts but scoped to a single expert.
//
// Auth model:
// - Login (POST /api/expert/login) verifies email + login_code against the
//   experts directory, then sets an httpOnly, Secure, SameSite=Strict cookie
//   whose value is `${expertId}.${token}`, where token = SHA-256 of a salt +
//   expertId + login_code. The raw code never travels in the cookie or the URL.
// - Every expert page/route authorizes by reading that cookie, parsing the
//   expertId out of it, re-deriving the expected token from the stored expert's
//   code, and comparing with a constant-time check. The cookie both identifies
//   the expert AND proves they knew the code — no separate session table.
//
// Why no email infra: v1 is admin-provisioned codes (like a shared magic link).
// v2 swaps the "enter code" step for an emailed one-time link; the cookie/token
// model here is unchanged.
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { getExpertById } from "@/lib/expertStore";
import type { Expert } from "@/lib/types";

const isProd = process.env.NODE_ENV === "production";

export const EXPERT_COOKIE = "ai2b_expert";

// The opaque per-expert token: a hash of a salt + id + code, so the code itself
// never travels in the cookie and a token for one expert can't be reused for
// another (the id is bound into the hash).
function expertToken(expertId: string, code: string): string {
  return createHash("sha256").update(`ai2b-expert:${expertId}:${code}`).digest("hex");
}

// Constant-time string compare (avoids leaking match length via timing).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// The value to set in the expert cookie after a successful login.
export function expertCookieValue(expertId: string, code: string): string {
  return `${expertId}.${expertToken(expertId, code)}`;
}

// Options for the expert auth cookie (8h, httpOnly, Secure in prod).
export function expertCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}

// Resolve the currently-authed expert from the cookie, or null. Verifies the
// token against the expert's stored code with a constant-time compare, so a
// tampered or stale cookie (e.g. after the admin rotates the code) fails closed.
export async function getAuthedExpert(): Promise<Expert | null> {
  const raw = cookies().get(EXPERT_COOKIE)?.value ?? "";
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const expertId = raw.slice(0, dot);
  const presented = raw.slice(dot + 1);

  const expert = await getExpertById(expertId);
  if (!expert || !expert.login_code) return null;

  const expected = expertToken(expertId, expert.login_code);
  if (!safeEqual(presented, expected)) return null;
  return expert;
}
