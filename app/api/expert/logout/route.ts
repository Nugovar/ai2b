// Expert-portal logout. Clears the per-expert auth cookie.
import { NextResponse } from "next/server";
import { EXPERT_COOKIE } from "@/lib/expertAuth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(EXPERT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
