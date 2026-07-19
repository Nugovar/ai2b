// Expert-portal login. Verifies email + login_code against the experts
// directory and sets an httpOnly per-expert cookie. Rate-limited per IP to
// blunt brute-force. Never reveals whether the email exists — only ok/!ok.
import { NextRequest, NextResponse } from "next/server";
import { findExpertByLogin } from "@/lib/expertStore";
import { EXPERT_COOKIE, expertCookieValue, expertCookieOptions } from "@/lib/expertAuth";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`expert-login:${ip}`, 10, 10 * 60_000); // 10 attempts / 10 min
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string; code?: string };
  const email = typeof body.email === "string" ? body.email.slice(0, 200) : "";
  const code = typeof body.code === "string" ? body.code.slice(0, 100) : "";

  const expert = await findExpertByLogin(email, code);
  if (!expert || !expert.login_code) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, name: expert.name });
  res.cookies.set(
    EXPERT_COOKIE,
    expertCookieValue(expert.id, expert.login_code),
    expertCookieOptions()
  );
  return res;
}
