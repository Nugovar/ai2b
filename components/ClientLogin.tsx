"use client";

// Client (business) portal sign-in: the email + phone the visitor left in the
// lead form. On success the server sets the httpOnly cookie and we refresh.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/ChatProvider";
import { getClientDict } from "@/lib/clientI18n";

export default function ClientLogin() {
  const { lang, setLang } = useApp();
  const T = getClientDict(lang);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      if (!res.ok) {
        setError(true);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo2.png" alt="AI2Business" className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-brand-dark">{T.brand}</p>
              <p className="text-xs text-gray-400">{T.portalTitle}</p>
            </div>
          </div>
          <div
            className="flex items-center rounded-full border border-gray-200 p-0.5 text-xs font-semibold"
            role="group"
          >
            <button
              type="button"
              onClick={() => setLang("ka")}
              className={`rounded-full px-2.5 py-1 transition-colors ${lang === "ka" ? "bg-brand-red text-white" : "text-gray-500 hover:text-brand-dark"}`}
              aria-pressed={lang === "ka"}
            >
              ქარ
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-full px-2.5 py-1 transition-colors ${lang === "en" ? "bg-brand-red text-white" : "text-gray-500 hover:text-brand-dark"}`}
              aria-pressed={lang === "en"}
            >
              ENG
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-brand-dark">{T.loginTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{T.loginSubtitle}</p>

          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {T.emailLabel}
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={T.emailPlaceholder}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-dark outline-none transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {T.phoneLabel}
              </span>
              <input
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={T.phonePlaceholder}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-dark outline-none transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-brand-red">
                {T.loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? T.loggingIn : T.loginBtn}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
