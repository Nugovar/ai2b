"use client";

import { useMemo, useState } from "react";
import type { Expert } from "@/lib/types";
import { DESIGNER_SKILLS } from "@/lib/types";
import { useApp } from "@/components/ChatProvider";
import { translit, translitCity } from "@/lib/translit";
import AdminTabs from "@/components/AdminTabs";
import AdminLangToggle from "@/components/AdminLangToggle";

function scoreColor(v: number): string {
  if (v >= 8) return "bg-green-100 text-green-800";
  if (v >= 6) return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-600";
}

export default function AdminExpertsTable({
  experts,
  storage,
  protectedMode,
}: {
  experts: Expert[];
  storage: "supabase" | "memory";
  protectedMode: boolean;
}) {
  const { t, lang } = useApp();
  const A = t.admin;
  const E = A.experts;
  const en = lang === "en";
  // Display helpers (English admin only): transliterate curated expert fields.
  const dispName = (n: string) => (en ? translit(n) : n);
  const dispCity = (c?: string) => (en ? translitCity(c) : c ?? "");
  const dispCategory = (c: string) => A.categoryLabel[c] ?? c;

  const categories = useMemo(() => Array.from(new Set(experts.map((e) => e.category))), [experts]);
  const skillKeys = useMemo(() => {
    const present = new Set<string>();
    experts.forEach((e) => Object.keys(e.skill_scores ?? {}).forEach((k) => present.add(k)));
    const ordered = DESIGNER_SKILLS.filter((k) => present.has(k));
    const extra = Array.from(present).filter((k) => !DESIGNER_SKILLS.includes(k as never));
    return [...ordered, ...extra];
  }, [experts]);

  const [category, setCategory] = useState<string>("all");
  const [seniority, setSeniority] = useState<string>("all");
  const [availability, setAvailability] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("overall_rating");

  const rows = useMemo(() => {
    const list = experts.filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (seniority === "all" || e.seniority === seniority) &&
        (availability === "all" || (availability === "available" ? e.available : !e.available))
    );
    const val = (e: Expert) => {
      if (sortBy === "overall_rating") return e.overall_rating;
      if (sortBy === "ai_skill") return e.ai_skill;
      if (sortBy === "years_experience") return e.years_experience;
      return Number(e.skill_scores?.[sortBy] ?? 0);
    };
    return [...list].sort((a, b) => val(b) - val(a));
  }, [experts, category, seniority, availability, sortBy]);

  const selectCls =
    "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-brand-dark outline-none focus:border-brand-red";

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
              <p className="text-xs text-white/50">{A.expertsSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AdminLangToggle />
            <a href="/" className="text-sm text-white/70 transition-colors hover:text-white">{A.backToSite}</a>
          </div>
        </div>
        <AdminTabs active="experts" />
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand-dark px-3 py-1 text-sm font-semibold text-white">
            {A.total}: {rows.length}
          </span>
          <span className="text-xs text-gray-500">
            {A.source}: {storage === "supabase" ? A.sourceSupabase : A.sourceSeed}
          </span>
          {!protectedMode && (
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">{A.unprotected}</span>
          )}
        </div>

        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500">
            <span className="mb-1 block">{E.filters.category}</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
              <option value="all">{E.filters.all}</option>
              {categories.map((c) => <option key={c} value={c}>{dispCategory(c)}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-500">
            <span className="mb-1 block">{E.filters.seniority}</span>
            <select value={seniority} onChange={(e) => setSeniority(e.target.value)} className={selectCls}>
              <option value="all">{E.filters.all}</option>
              <option value="junior">{A.seniority.junior}</option>
              <option value="middle">{A.seniority.middle}</option>
              <option value="senior">{A.seniority.senior}</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">
            <span className="mb-1 block">{E.filters.availability}</span>
            <select value={availability} onChange={(e) => setAvailability(e.target.value)} className={selectCls}>
              <option value="all">{E.filters.all}</option>
              <option value="available">{E.available}</option>
              <option value="busy">{E.busy}</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">
            <span className="mb-1 block">{E.filters.sortBy}</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectCls}>
              <option value="overall_rating">{E.filters.ratingOpt}</option>
              <option value="ai_skill">{E.filters.aiSkillOpt}</option>
              <option value="years_experience">{E.filters.experienceOpt}</option>
              {skillKeys.map((k) => <option key={k} value={k}>{A.skills[k] ?? k}</option>)}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[60rem] table-auto divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-3">{E.th.expert}</th>
                <th className="px-3 py-3 whitespace-nowrap">{E.th.aiSkill}</th>
                <th className="px-3 py-3">{E.th.skills}</th>
                <th className="px-3 py-3 whitespace-nowrap">{E.th.rating}</th>
                <th className="px-3 py-3">{E.th.status}</th>
                <th className="px-3 py-3">{E.th.tools}</th>
                <th className="px-3 py-3 bg-brand-red/5 text-brand-red">{E.th.internal}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((e) => (
                <tr key={e.id} className="align-top hover:bg-gray-50/60">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-brand-dark">{dispName(e.name)}</p>
                    <p className="text-xs text-gray-500">
                      {dispCategory(e.category)} · {A.seniority[e.seniority] ?? e.seniority} · {e.years_experience} {A.detail.years}
                      {e.city ? ` · ${dispCity(e.city)}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-dark px-2.5 py-1 text-xs font-bold text-white">
                      {A.detail.ai} {e.ai_skill}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex max-w-[22rem] flex-wrap gap-1">
                      {skillKeys.map((k) =>
                        e.skill_scores?.[k] != null ? (
                          <span
                            key={k}
                            title={A.skills[k] ?? k}
                            className={`rounded px-1.5 py-0.5 text-[11px] ${scoreColor(Number(e.skill_scores[k]))}`}
                          >
                            {A.skills[k] ?? k} {e.skill_scores[k]}
                          </span>
                        ) : null
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap font-medium text-brand-dark">⭐ {e.overall_rating}</td>
                  <td className="px-3 py-3">
                    {e.available ? (
                      <span className="whitespace-nowrap rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">{E.available}</span>
                    ) : (
                      <span className="whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{E.busy}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">
                    <span className="block max-w-[12rem]">{e.tools?.join(", ")}</span>
                  </td>
                  <td className="px-3 py-3 bg-brand-red/5 text-xs text-gray-700">
                    <p className="whitespace-nowrap">{e.phone ?? "-"}</p>
                    <p className="text-gray-500">{e.social ?? ""}</p>
                    {e.notes && <p className="mt-1 max-w-[16rem] text-gray-500">{e.notes}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
