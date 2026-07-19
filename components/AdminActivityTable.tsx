"use client";

// Admin AI Activity Log: a live feed of AI routing decisions, chat technical
// metrics (model/latency/tokens/cost), errors, and expert feedback on AI
// drafts. Read-only. Polls /api/admin/ai-events every 12s so the admin can
// watch activity without reloading.
import { useEffect, useState } from "react";
import type { AiEventType, StoredAiEvent } from "@/lib/aiEvents";
import { useApp } from "@/components/ChatProvider";
import AdminTabs from "@/components/AdminTabs";
import AdminLangToggle from "@/components/AdminLangToggle";

const POLL_MS = 12_000;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

type FilterKey = "all" | AiEventType;

export default function AdminActivityTable({
  initialEvents,
  initialStorage,
}: {
  initialEvents: StoredAiEvent[];
  initialStorage: "supabase" | "memory";
}) {
  const { t } = useApp();
  const A = t.admin;
  const C = A.activity;

  const [events, setEvents] = useState<StoredAiEvent[]>(initialEvents);
  const [storage, setStorage] = useState<"supabase" | "memory">(initialStorage);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/ai-events");
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          events?: StoredAiEvent[];
          storage?: "supabase" | "memory";
        };
        if (data.ok && data.events) {
          setEvents(data.events);
          if (data.storage) setStorage(data.storage);
        }
      } catch {
        // Best-effort polling — a failed tick just waits for the next one.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: C.filterAll },
    { key: "chat_reply", label: C.filterChat },
    { key: "chat_error", label: C.filterErrors },
    { key: "match_decision", label: C.filterRouting },
    { key: "draft_rated", label: C.filterFeedback },
  ];

  const visible = filter === "all" ? events : events.filter((e) => e.type === filter);

  const typeLabel: Record<AiEventType, string> = {
    chat_reply: C.typeChatReply,
    chat_error: C.typeChatError,
    match_decision: C.typeMatchDecision,
    draft_rated: C.typeDraftRated,
  };
  const typeStyle: Record<AiEventType, string> = {
    chat_reply: "border-blue-300 bg-blue-50 text-blue-700",
    chat_error: "border-red-300 bg-red-50 text-red-700",
    match_decision: "border-purple-300 bg-purple-50 text-purple-700",
    draft_rated: "border-green-300 bg-green-50 text-green-700",
  };

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
              <p className="text-xs text-white/50">{A.activitySubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AdminLangToggle />
            <a href="/" className="text-sm text-white/70 transition-colors hover:text-white">
              {A.backToSite}
            </a>
          </div>
        </div>
        <AdminTabs active="activity" />
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand-dark px-3 py-1 text-sm font-semibold text-white">
            {C.total}: {visible.length}
          </span>
          <span className="text-xs text-gray-500">
            {A.source}: {storage === "supabase" ? A.sourceSupabase : A.sourceMemory}
          </span>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? "border-brand-red bg-brand-red text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-brand-red hover:text-brand-red"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <p className="text-lg font-semibold text-brand-dark">{C.empty}</p>
            <p className="mt-1 text-sm text-gray-400">{C.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeStyle[ev.type]}`}>
                    {typeLabel[ev.type]}
                  </span>
                  <span className="text-xs text-gray-400">{fmtTime(ev.created_at)}</span>
                  {ev.ref_id && <span className="text-xs text-gray-400">· {ev.ref_id}</span>}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                  {ev.type === "chat_reply" && (
                    <>
                      <span>{C.model}: {String(ev.payload.model ?? "—")}</span>
                      <span>{C.latency}: {String(ev.payload.latency_ms ?? "—")}ms</span>
                      <span>{C.tokensIn}/{C.tokensOut}: {String(ev.payload.tokens_in ?? "—")}/{String(ev.payload.tokens_out ?? "—")}</span>
                      <span>{C.cost}: ${String(ev.payload.cost_estimate ?? "—")}</span>
                      <span>{String(ev.payload.lang ?? "—")} · {String(ev.payload.phase ?? "—")}</span>
                    </>
                  )}
                  {ev.type === "chat_error" && (
                    <>
                      <span className="font-semibold text-brand-red">{C.errorKind}: {String(ev.payload.error_kind ?? "—")}</span>
                      <span>{C.model}: {String(ev.payload.model ?? "—")}</span>
                    </>
                  )}
                  {ev.type === "match_decision" && (
                    <>
                      <span>{C.category}: {A.categoryLabel[String(ev.payload.category ?? "")] ?? String(ev.payload.category ?? "—")}</span>
                      <span>
                        {C.skills}:{" "}
                        {Array.isArray(ev.payload.required_skills)
                          ? (ev.payload.required_skills as string[]).map((s) => A.skills[s] ?? s).join(", ")
                          : "—"}
                      </span>
                      {ev.payload.ai_relevant === true && (
                        <span className="font-semibold text-brand-red">{A.metrics.aiRelevant}</span>
                      )}
                    </>
                  )}
                  {ev.type === "draft_rated" && (
                    <>
                      <span className="font-semibold">
                        {A.aiDraft[String(ev.payload.rating ?? "unset") as "accepted" | "edited" | "rejected" | "unset"]}
                      </span>
                      <span>{C.expert}: {String(ev.payload.expert_id ?? "—")}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
