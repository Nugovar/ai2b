// Admin login. Verifies ADMIN_PASSWORD and sets an httpOnly admin cookie.
// Rate-limited per IP to blunt brute-force attempts. Never reflects whether the
// password was configured — only ok/!ok.
import { NextRequest, NextResponse } from "next/server";
import { isPasswordCorrect, adminCookieToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`admin-login:${ip}`, 10, 10 * 60_000); // 10 attempts / 10 min
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!isPasswordCorrect(body.password)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminCookieToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
