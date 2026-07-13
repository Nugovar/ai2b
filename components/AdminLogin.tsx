"use client";

import { useState } from "react";
import { useApp } from "@/components/ChatProvider";
import AdminLangToggle from "@/components/AdminLangToggle";

// Admin login screen. POSTs the password to /api/admin/login, which sets an
// httpOnly cookie; on success we reload so the (cookie-gated) server page
// re-renders authorized. The password never appears in the URL.
export default function AdminLogin() {
  const { t } = useApp();
  const a = t.admin.login;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      setError(a.wrong);
    } catch {
      setError(a.wrong);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="absolute right-4 top-4">
        <AdminLangToggle />
      </div>
      <form
        onSubmit={submit}
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
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={a.placeholder}
          autoFocus
          className="mt-6 w-full rounded-lg border border-white/15 bg-brand-dark px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-3 w-full rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? a.loading : a.button}
        </button>
        {error && <p className="mt-3 text-xs text-brand-red">{error}</p>}
      </form>
    </main>
  );
}
