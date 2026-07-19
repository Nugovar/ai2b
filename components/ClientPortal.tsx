"use client";

// Authed client (business) workspace: their own requests with status, the
// recommendation, payment state, and finished deliverables. The expert is
// NEVER identified — the platform stays in the middle.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/ChatProvider";
import { getClientDict } from "@/lib/clientI18n";
import type { ClientRequest } from "@/lib/leadStore";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtAmount(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export default function ClientPortal({
  email,
  requests,
}: {
  email: string;
  requests: ClientRequest[];
}) {
  const { lang, setLang } = useApp();
  const T = getClientDict(lang);
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(requests[0]?.id ?? null);

  const statusMeta = (s: string) =>
    s === "done"
      ? { label: T.statusDone, cls: "bg-green-50 text-green-700 border-green-300" }
      : s === "in_progress"
      ? { label: T.statusInProgress, cls: "bg-amber-50 text-amber-700 border-amber-300" }
      : { label: T.statusNew, cls: "bg-gray-100 text-gray-600 border-gray-300" };

  async function logout() {
    await fetch("/api/client/logout", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-dark text-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo2.png" alt="AI2Business" className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">{T.portalTitle}</p>
              <p className="text-xs text-white/50">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center rounded-full border border-white/20 p-0.5 text-xs font-semibold"
              role="group"
            >
              <button
                onClick={() => setLang("ka")}
                className={`rounded-full px-2.5 py-1 transition-colors ${lang === "ka" ? "bg-brand-red text-white" : "text-white/70 hover:text-white"}`}
                aria-pressed={lang === "ka"}
              >
                ქარ
              </button>
              <button
                onClick={() => setLang("en")}
                className={`rounded-full px-2.5 py-1 transition-colors ${lang === "en" ? "bg-brand-red text-white" : "text-white/70 hover:text-white"}`}
                aria-pressed={lang === "en"}
              >
                ENG
              </button>
            </div>
            <button onClick={logout} className="text-sm text-white/70 transition-colors hover:text-white">
              {T.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h2 className="mb-5 text-lg font-bold text-brand-dark">{T.myRequests}</h2>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-base font-semibold text-brand-dark">{T.empty}</p>
            <p className="mt-1 text-sm text-gray-400">{T.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const open = openId === r.id;
              const st = statusMeta(r.status);
              const deliverables = r.deliverables ?? [];
              return (
                <div key={r.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <button
                    onClick={() => setOpenId(open ? null : r.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark">
                        {r.business_type || r.category || "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{fmtDate(r.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.payment_status === "paid" ? (
                        <span className="rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          {T.payPaid}
                        </span>
                      ) : r.payment_status === "invoiced" ? (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          {T.payInvoiced}
                        </span>
                      ) : null}
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  </button>

                  {open && (
                    <div className="space-y-4 border-t border-gray-100 p-4">
                      {r.status === "in_progress" && r.expert_assigned && (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          ⚙️ {T.expertOnIt}
                        </p>
                      )}

                      {r.advice && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                            {T.adviceTitle}
                          </h4>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                            {r.advice}
                          </p>
                        </div>
                      )}

                      {typeof r.amount === "number" && r.amount > 0 && (
                        <p className="text-sm text-gray-600">
                          {T.amountLabel}:{" "}
                          <span className="font-semibold text-brand-dark">
                            {fmtAmount(r.amount)} {T.gel}
                          </span>
                        </p>
                      )}

                      {deliverables.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-green-600">
                            {T.deliverablesTitle}
                          </h4>
                          <ul className="space-y-1.5">
                            {deliverables.map((f, i) => (
                              <li key={i}>
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-green-700 hover:underline"
                                >
                                  <span aria-hidden>{f.isImage ? "🖼️" : "📄"}</span>
                                  <span className="truncate">{f.name}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
