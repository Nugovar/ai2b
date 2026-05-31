"use client";

import { Fragment, useState } from "react";
import type { StoredLead, LeadStatus } from "@/lib/leadStore";
import type { RankedExpert } from "@/lib/match";
import { useApp } from "@/components/ChatProvider";
import { translit } from "@/lib/translit";
import AdminTabs from "@/components/AdminTabs";
import AdminLangToggle from "@/components/AdminLangToggle";

const STATUS_ORDER: LeadStatus[] = ["new", "in_progress", "done"];

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-brand-red/10 text-brand-red border-brand-red/30",
  in_progress: "bg-amber-50 text-amber-700 border-amber-300",
  done: "bg-green-50 text-green-700 border-green-300",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const COLSPAN = 8;

export default function AdminLeadsTable({
  leads: initialLeads,
  storage,
  authKey,
  protectedMode,
  matchesByLead,
}: {
  leads: StoredLead[];
  storage: "supabase" | "memory";
  authKey: string;
  protectedMode: boolean;
  matchesByLead: Record<string, RankedExpert[]>;
}) {
  const { t } = useApp();
  const A = t.admin;
  const [leads, setLeads] = useState<StoredLead[]>(initialLeads);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function deleteLeadRow(id: string) {
    if (!window.confirm(A.delConfirm)) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, key: authKey }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (data.ok) {
        // refresh the list: drop the removed lead
        setLeads((ls) => ls.filter((l) => l.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } catch {
      /* keep the row on failure */
    } finally {
      setDeletingId(null);
    }
  }

  async function changeStatus(id: string, status: LeadStatus) {
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, key: authKey }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (!data.ok) setLeads(prev);
    } catch {
      setLeads(prev);
    } finally {
      setSavingId(null);
    }
  }

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
              <p className="text-xs text-white/50">{A.leadsSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AdminLangToggle />
            <a href="/" className="text-sm text-white/70 transition-colors hover:text-white">
              {A.backToSite}
            </a>
          </div>
        </div>
        <AdminTabs active="leads" authKey={authKey} />
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand-dark px-3 py-1 text-sm font-semibold text-white">
            {A.total}: {leads.length}
          </span>
          <span className="text-xs text-gray-500">
            {A.source}: {storage === "supabase" ? A.sourceSupabase : A.sourceMemory}
          </span>
          {!protectedMode && (
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">{A.unprotected}</span>
          )}
        </div>

        {leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <p className="text-lg font-semibold text-brand-dark">{A.emptyTitle}</p>
            <p className="mt-1 text-sm text-gray-500">{A.emptyHint}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[64rem] table-auto divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">{A.th.name}</th>
                  <th className="px-4 py-3">{A.th.phone}</th>
                  <th className="px-4 py-3">{A.th.email}</th>
                  <th className="px-4 py-3">{A.th.category}</th>
                  <th className="px-4 py-3">{A.th.context}</th>
                  <th className="px-4 py-3">{A.th.status}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{A.th.date}</th>
                  <th className="px-4 py-3 text-right">{A.th.details}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => {
                  const status = (STATUS_ORDER.includes(lead.status as LeadStatus)
                    ? lead.status
                    : "new") as LeadStatus;
                  const open = expandedId === lead.id;
                  return (
                    <Fragment key={lead.id}>
                      <tr className="align-top hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-brand-dark">{lead.name || "-"}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {lead.phone ? <a href={`tel:${lead.phone}`} className="hover:text-brand-red">{lead.phone}</a> : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {lead.email ? <a href={`mailto:${lead.email}`} className="break-all hover:text-brand-red">{lead.email}</a> : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{lead.business_type || "-"}</td>
                        <td className="px-4 py-3 text-gray-500">
                          <span className="line-clamp-2 block max-w-[16rem]" title={lead.summary || ""}>{lead.summary || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={status}
                            disabled={savingId === lead.id}
                            onChange={(e) => changeStatus(lead.id, e.target.value as LeadStatus)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold outline-none disabled:opacity-50 ${STATUS_STYLES[status]}`}
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s} className="bg-white text-brand-dark">{A.status[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(lead.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setExpandedId(open ? null : lead.id)}
                              className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-brand-red hover:text-brand-red"
                            >
                              {open ? A.close : A.view}
                            </button>
                            <button
                              onClick={() => deleteLeadRow(lead.id)}
                              disabled={deletingId === lead.id}
                              className="whitespace-nowrap rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-brand-red transition-colors hover:bg-brand-red hover:text-white disabled:opacity-50"
                            >
                              {deletingId === lead.id ? A.deleting : A.del}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {open && (
                        <tr className="bg-gray-50/80">
                          <td colSpan={COLSPAN} className="px-4 py-5">
                            <LeadDetail lead={lead} matches={matchesByLead[lead.id] ?? []} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function LeadDetail({ lead, matches }: { lead: StoredLead; matches: RankedExpert[] }) {
  const { t, lang } = useApp();
  const A = t.admin;
  const en = lang === "en";
  const slots = lead.slots ?? {};
  const slotKeys = Object.keys(slots);

  const reasonFor = (m: RankedExpert) => {
    const skillBits = m.requiredSkills
      .map((s) => `${A.skills[s] ?? s} ${m.expert.skill_scores?.[s] ?? 0}`)
      .join(", ");
    return `${skillBits} · ${A.detail.avg} ${m.taskScore} · ${A.detail.ai} ${m.expert.ai_skill} · ⭐${m.expert.overall_rating}`;
  };

  return (
    <div className="space-y-6">
      {/* Matched experts (public-safe: no internal contact fields) */}
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          {A.detail.matchedExperts}
          {lead.category ? ` · ${A.categoryLabel[lead.category] ?? lead.category}` : ""}
          {lead.required_skills?.length ? ` · [${lead.required_skills.join(", ")}]` : ""}
          {lead.ai_relevant ? " · AI" : ""}
        </h4>
        {matches.length === 0 ? (
          <p className="text-sm text-gray-400">{A.detail.noMatches}</p>
        ) : (
          <ol className="space-y-2">
            {matches.map((m, i) => (
              <div
                key={m.expert.id}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                  i === 0 ? "border-brand-red/40 bg-brand-red/5" : "border-gray-200 bg-white"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-brand-red text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">
                    {en ? translit(m.expert.name) : m.expert.name}{" "}
                    <span className="font-normal text-gray-400">
                      · {A.seniority[m.expert.seniority] ?? m.expert.seniority} · {m.expert.years_experience} {A.detail.years}
                    </span>
                    {i === 0 && (
                      <span className="ml-2 rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-semibold text-white">
                        {A.detail.topMatch}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">{reasonFor(m)}</p>
                  {m.tieBreakBy && (
                    <p className="text-[11px] text-amber-700">
                      {A.detail.tiePrefix} {A.tieBy[m.tieBreakBy] ?? m.tieBreakBy}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </ol>
        )}
        {/* Phase 2: auto-send the task + references to the #1 match, no middleman. */}
        <p className="mt-2 text-[11px] text-gray-400">{A.detail.phase2}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{A.detail.context}</h4>
            {slotKeys.length === 0 ? (
              <p className="text-sm text-gray-400">{A.detail.noContext}</p>
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {slotKeys.map((k) => (
                  <div key={k} className="rounded-lg bg-white px-3 py-2 shadow-sm">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{A.slots[k] ?? k}</dt>
                    <dd className="text-sm text-brand-dark">{slots[k]}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{A.detail.advice}</h4>
            <div className="rounded-lg border border-brand-red/20 bg-white px-4 py-3 text-sm leading-relaxed text-brand-dark shadow-sm">
              {lead.advice ? lead.advice : <span className="text-gray-400">{A.detail.adviceNot}</span>}
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{A.detail.transcript}</h4>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
            {lead.conversation && lead.conversation.length > 0 ? (
              lead.conversation.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === "user" ? "bg-brand-red text-white" : "bg-gray-100 text-brand-dark"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">{A.detail.transcriptNot}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
