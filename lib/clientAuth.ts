// Client (business) portal gate. Zero-provisioning: the client signs in with
// the SAME email + phone they left in the lead form — no codes, no email infra.
//
// Auth model (mirrors expertAuth's cookie shape):
// - Login (POST /api/client/login) verifies that at least one lead exists with
//   that email (case-insensitive) AND phone (last-9-digits match), then sets an
//   httpOnly cookie `${b64url(email)}.${token}` where
//   token = SHA-256("ai2b-client:" + email + ":" + phone9).
// - getAuthedClient() re-derives the token from the stored leads' phones, so a
//   tampered cookie fails closed and the phone never travels in the cookie.
//
// This is status-page-grade auth (the pair is knowledge the client themselves
// submitted); it guards convenience data (status/advice/deliverables), never
// other clients' records — lookups are always scoped to the cookie's email.
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { listLeadsByEmail, toClientRequest, type ClientRequest } from "@/lib/leadStore";

const isProd = process.env.NODE_ENV === "production";

export const CLIENT_COOKIE = "ai2b_client";

// Georgian numbers: compare the last 9 digits so formatting never matters.
export function phone9(phone: string): string {
  return (phone || "").replace(/\D/g, "").slice(-9);
}

function clientToken(email: string, p9: string): string {
  return createHash("sha256").update(`ai2b-client:${email}:${p9}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}
function fromB64url(s: string): string {
  try {
    return Buffer.from(s, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

// Verify a login attempt against the stored leads. Returns the normalized
// email on success, else null.
export async function verifyClientLogin(
  email: string,
  phone: string
): Promise<string | null> {
  const e = (email || "").trim().toLowerCase();
  const p = phone9(phone);
  if (!e || p.length < 9) return null;
  const leads = await listLeadsByEmail(e);
  const match = leads.some((l) => phone9(l.phone) === p);
  return match ? e : null;
}

export function clientCookieValue(email: string, phone: string): string {
  return `${b64url(email)}.${clientToken(email, phone9(phone))}`;
}

export function clientCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days — status pages get revisited
  };
}

// Resolve the authed client from the cookie and return their requests
// (client-safe projection). Null when unauthenticated/invalid.
export async function getAuthedClient(): Promise<{
  email: string;
  requests: ClientRequest[];
} | null> {
  const raw = cookies().get(CLIENT_COOKIE)?.value ?? "";
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const email = fromB64url(raw.slice(0, dot)).trim().toLowerCase();
  const presented = raw.slice(dot + 1);
  if (!email) return null;

  const leads = await listLeadsByEmail(email);
  if (leads.length === 0) return null;

  // The cookie was minted from ONE of this email's lead phones — accept if any
  // of them re-derives the presented token (phones can differ across leads).
  const phones = Array.from(new Set(leads.map((l) => phone9(l.phone)).filter((p) => p.length >= 9)));
  const ok = phones.some((p) => safeEqual(presented, clientToken(email, p)));
  if (!ok) return null;

  return { email, requests: leads.map(toClientRequest) };
}
