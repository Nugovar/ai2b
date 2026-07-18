// Client-portal logout. Clears the client auth cookie.
import { NextResponse } from "next/server";
import { CLIENT_COOKIE } from "@/lib/clientAuth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLIENT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
