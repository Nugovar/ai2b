// Admin: provision an expert's portal-login credentials (email + login_code).
// Cookie-authed (admin gate). Lets the admin set an email and generate/rotate a
// per-expert code from the experts tab, instead of hand-editing SQL. The raw
// code is stored as-is (it's the shared secret the expert types); rotating it
// invalidates any existing expert session (the auth cookie re-derives from it).
import { NextRequest, NextResponse } from "next/server";
import { updateExpertLogin } from "@/lib/expertStore";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequestAuthorized()) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      email?: string;
      login_code?: string;
    };
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }

    const fields: { email?: string; login_code?: string } = {};
    if (typeof body.email === "string") fields.email = body.email.slice(0, 200);
    if (typeof body.login_code === "string") fields.login_code = body.login_code.slice(0, 100);
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ ok: false, error: "nothing to update" }, { status: 400 });
    }

    const ok = await updateExpertLogin(body.id, fields);
    // 404 here almost always means migration 0005 hasn't run (missing column).
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  } catch (err) {
    console.error("[api/admin/expert-login] error:", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
