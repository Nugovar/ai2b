"use client";

// Admin chats register: every saved conversation (converted or dropped), with
// an expandable transcript per row. Read-only — the value is reviewing what
// visitors actually asked and recovering the ones that dropped pre-lead.
import { useState } from "react";
import type { StoredChatSession } from "@/lib/chatStore";
import { useApp } from "@/components/ChatProvider";
import AdminTabs from "@/components/AdminTabs";
import AdminLangToggle from "@/components/AdminLangToggle";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AdminChatsTable({
  sessions,
  storage,
}: {
  sessions: StoredChatSession[];
  storage: "supabase" | "memory";
}) {
  const { t } = useApp();
  const A = t.admin;
  const C = A.chats;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-dark text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-dark ring-1 ring-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo2.png" alt="AI2Business" className="h-full w-full object-cover" />
            </span>
            <div>
              <h1 className="text-lg font-bold leading-tight">{A.panelTitle}</h1>
              <p className="text-xs text-white/50">{A.chatsSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AdminLangToggle />
            <a href="/" className="text-sm text-white/70 transition-colors hover:text-white">
              {A.backToSite}
            </a>
          </div>
        </div>
        <AdminTabs active="chats" />
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand-dark px-3 py-1 text-sm font-semibold text-white">
            {C.total}: {sessions.length}
          </span>
          <span className="text-xs text-gray-500">
            {A.source}: {storage === "supabase" ? A.sourceSupabase : A.sourceMemory}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <p className="text-lg font-semibold text-brand-dark">{C.empty}</p>
            <p className="mt-1 text-sm text-gray-400">{C.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const open = openId === s.id;
              return (
                <div key={s.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.lead_captured ? (
                        <span className="rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          {C.leadYes}
                        </span>
                      ) : (
                        <span className="rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                          {C.leadNo}
                        </span>
                      )}
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-brand-red">
                        {C.phases[s.phase] ?? s.phase}
                      </span>
                      <span className="text-xs text-gray-500">
                        {s.messages?.length ?? 0} {C.messages}
                      </span>
                      <span className="text-xs uppercase text-gray-400">{s.lang}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400" title={C.updated}>
                        {fmtTime(s.updated_at)}
                      </span>
                      <button
                        onClick={() => setOpenId(open ? null : s.id)}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-brand-dark transition-colors hover:border-brand-red hover:text-brand-red"
                      >
                        {open ? C.hide : C.view}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-gray-100 p-4">
                      <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
                        {(s.messages ?? []).map((m, i) => (
                          <div
                            key={i}
                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                                m.role === "user"
                                  ? "bg-brand-red text-white"
                                  : "border border-gray-200 bg-white text-gray-700"
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        ))}
                      </div>
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
