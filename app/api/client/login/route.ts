// Client-portal login. Verifies email + phone against the client's own leads
// and sets the httpOnly client cookie. Rate-limited; never reveals whether the
// email exists — only ok/!ok.
import { NextRequest, NextResponse } from "next/server";
import {
  verifyClientLogin,
  clientCookieValue,
  clientCookieOptions,
  CLIENT_COOKIE,
} from "@/lib/clientAuth";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`client-login:${ip}`, 10, 10 * 60_000); // 10 / 10 min
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string; phone?: string };
  const email = typeof body.email === "string" ? body.email.slice(0, 200) : "";
  const phone = typeof body.phone === "string" ? body.phone.slice(0, 40) : "";

  const verified = await verifyClientLogin(email, phone);
  if (!verified) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLIENT_COOKIE, clientCookieValue(verified, phone), clientCookieOptions());
  return res;
}
