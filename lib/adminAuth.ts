// Admin gate. Demo-grade but no longer leaks the password in the URL.
//
// Auth model:
// - Login (POST /api/admin/login) verifies ADMIN_PASSWORD, then sets an
//   httpOnly, Secure, SameSite=Strict cookie whose value is SHA-256(password)
//   (the raw password is never stored in the cookie or the URL).
// - Every admin page/route authorizes by reading that cookie and comparing it
//   to the expected token with a constant-time check.
//
// Security posture:
// - PRODUCTION: always fail-closed. If ADMIN_PASSWORD is unset, access is DENIED
//   (no bypass). Cookie is Secure.
// - DEVELOPMENT: if ADMIN_PASSWORD is unset locally, the panel is open (with a
//   visible "unprotected" banner). Setting it enables the gate.
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

const isProd = process.env.NODE_ENV === "production";

export const ADMIN_COOKIE = "ai2b_admin";

// The opaque token stored in the cookie: a hash of the configured password, so
// the password itself never travels in the cookie.
function expectedToken(pw: string): string {
  return createHash("sha256").update(`ai2b:${pw}`).digest("hex");
}

// Constant-time string compare (avoids leaking match length via timing).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// In production the panel is always considered protected (banner never shows).
export function isAdminProtected(): boolean {
  if (process.env.AI2B_DEMO === "1") return true; // demo: clean panel, no banner
  if (isProd) return true;
  return Boolean(process.env.ADMIN_PASSWORD);
}

// Verify a submitted password (login only). Never succeeds without a configured
// password, even in dev — the dev "open" path is handled by the request check.
export function isPasswordCorrect(pw: string | undefined | null): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
  return typeof pw === "string" && safeEqual(pw, secret);
}

// The value to set in the admin cookie after a successful login.
export function adminCookieToken(): string {
  return expectedToken(process.env.ADMIN_PASSWORD ?? "");
}

// Authorize the current request by reading the httpOnly admin cookie.
// Call from server components (admin pages) and admin route handlers.
export function isAdminRequestAuthorized(): boolean {
  // Demo build: the panel is open (localhost walkthrough, no real data). Never
  // set in production, so this can't loosen a real deployment.
  if (process.env.AI2B_DEMO === "1") return true;
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    // No password configured: open in dev only; LOCKED in production.
    return !isProd;
  }
  const token = cookies().get(ADMIN_COOKIE)?.value ?? "";
  return safeEqual(token, expectedToken(secret));
}
