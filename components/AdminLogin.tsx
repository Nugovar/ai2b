"use client";

import { useApp } from "@/components/ChatProvider";
import AdminLangToggle from "@/components/AdminLangToggle";

// Shared demo-grade login screen for /admin pages. Plain GET form that submits
// ?key=... back to the same path. Not real auth - see lib/adminAuth.ts.
export default function AdminLogin({ action, attempted }: { action: string; attempted: boolean }) {
  const { t } = useApp();
  const a = t.admin.login;
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="absolute right-4 top-4">
        <AdminLangToggle />
      </div>
      <form
        method="get"
        action={action}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-brand-dark ring-1 ring-white/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="AI2Business" className="h-full w-full object-cover" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-white">{a.title}</h1>
        <p className="mt-1 text-sm text-white/50">{a.subtitle}</p>
        <input
          type="password"
          name="key"
          placeholder={a.placeholder}
          autoFocus
          className="mt-6 w-full rounded-lg border border-white/15 bg-brand-dark px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
        />
        <button
          type="submit"
          className="mt-3 w-full rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          {a.button}
        </button>
        {attempted && <p className="mt-3 text-xs text-brand-red">{a.wrong}</p>}
      </form>
    </main>
  );
}
