"use client";

// Metrics dashboard UI. Pure presentation over lib/metrics.ts output.
// Viz rules followed: stat tiles for headline numbers; single-hue horizontal
// bars for magnitude (funnel, category, expert workload); reserved status
// colors (gray/amber/green) ONLY for payment state, always with text labels;
// values/labels wear ink tokens, never the bar color; no dual axes, no legend
// needed (single series per chart, every bar direct-labeled).
import type { Metrics, BreakdownRow } from "@/lib/metrics";
import { useApp } from "@/components/ChatProvider";
import { translit } from "@/lib/translit";
import AdminTabs from "@/components/AdminTabs";
import AdminLangToggle from "@/components/AdminLangToggle";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

// One KPI stat tile: muted label on top, big ink number under it.
function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-dark">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// A horizontal magnitude bar row: label — thin single-hue bar — direct value.
// `max` anchors all widths in the group to a common scale (one axis).
function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max((count / max) * 100, 2) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-sm text-gray-600" title={label}>
        {label}
      </span>
      <div className="h-4 flex-1 overflow-hidden rounded-r-[4px] bg-gray-100">
        <div
          className="h-full rounded-r-[4px] bg-brand-red/80"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-semibold text-brand-dark">
        {fmt(count)}
      </span>
    </div>
  );
}

function BarCard({ title, rows, empty }: { title: string; rows: BreakdownRow[]; empty: string }) {
  const max = rows.length > 0 ? rows[0].count : 0;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.slice(0, 6).map((r) => (
            <BarRow key={r.label} label={r.label} count={r.count} max={max} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminMetrics({
  metrics,
  storage,
}: {
  metrics: Metrics;
  storage: "supabase" | "memory";
}) {
  const { t, lang } = useApp();
  const A = t.admin;
  const M = A.metrics;
  const en = lang === "en";

  const funnelRows: BreakdownRow[] = [
    { label: M.fCaptured, count: metrics.funnel.captured },
    { label: M.fAssigned, count: metrics.funnel.assigned },
    { label: M.fDone, count: metrics.funnel.done },
    { label: M.fPaid, count: metrics.funnel.paid },
  ];

  const expertRows = en
    ? metrics.byExpert.map((r) => ({ ...r, label: translit(r.label) }))
    : metrics.byExpert;

  // Payment state uses the reserved status palette (never the series hue),
  // always paired with its text label.
  const payment = [
    { key: "paid" as const, cls: "bg-green-50 text-green-700 border-green-300" },
    { key: "invoiced" as const, cls: "bg-amber-50 text-amber-700 border-amber-300" },
    { key: "unpaid" as const, cls: "bg-gray-100 text-gray-600 border-gray-300" },
  ];
  const outcomes = [
    { key: "won" as const, cls: "bg-green-50 text-green-700 border-green-300" },
    { key: "lost" as const, cls: "bg-red-50 text-brand-red border-red-300" },
    { key: "pending" as const, cls: "bg-gray-100 text-gray-600 border-gray-300" },
  ];
  const drafts = [
    { key: "accepted" as const, cls: "bg-green-50 text-green-700 border-green-300" },
    { key: "edited" as const, cls: "bg-amber-50 text-amber-700 border-amber-300" },
    { key: "rejected" as const, cls: "bg-red-50 text-brand-red border-red-300" },
  ];

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
              <p className="text-xs text-white/50">{A.metricsSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AdminLangToggle />
            <a href="/" className="text-sm text-white/70 transition-colors hover:text-white">
              {A.backToSite}
            </a>
          </div>
        </div>
        <AdminTabs active="metrics" />
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-500">
            {A.source}: {storage === "supabase" ? A.sourceSupabase : A.sourceMemory}
          </span>
        </div>

        {metrics.total === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <p className="text-lg font-semibold text-brand-dark">{M.noData}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* North-star: AI-draft acceptance rate. The metric that decides
                software- vs agency-margined, so it leads the dashboard. */}
            <div className="rounded-2xl border-2 border-brand-red/30 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-red">
                    {M.kpiAcceptance}
                  </p>
                  <p className="mt-1 text-4xl font-bold text-brand-dark">
                    {metrics.aiDraftRated > 0 ? `${Math.round(metrics.aiAcceptanceRate * 100)}%` : "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {M.acceptanceHint} · {fmt(metrics.aiDraftRated)} {M.rated}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {drafts.map(({ key, cls }) => (
                    <div
                      key={key}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${cls}`}
                    >
                      <span>{A.aiDraft[key]}</span>
                      <span className="tabular-nums">{fmt(metrics.aiDraftSplit[key])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI tiles */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Tile label={M.kpiTotal} value={fmt(metrics.total)} />
              <Tile label={M.kpiLast30} value={fmt(metrics.last30)} />
              <Tile
                label={M.kpiPaidConv}
                value={`${Math.round(metrics.paidConversion * 100)}%`}
                sub={`${fmt(metrics.funnel.paid)} / ${fmt(metrics.total)}`}
              />
              <Tile label={M.kpiCollected} value={`${fmt(metrics.revenueCollected)} ${M.gel}`} />
              <Tile label={M.kpiOutstanding} value={`${fmt(metrics.revenueOutstanding)} ${M.gel}`} />
              <Tile
                label={M.kpiWinRate}
                value={
                  metrics.outcomeSplit.won + metrics.outcomeSplit.lost > 0
                    ? `${Math.round(metrics.winRate * 100)}%`
                    : "—"
                }
                sub={`${fmt(metrics.outcomeSplit.won)} / ${fmt(
                  metrics.outcomeSplit.won + metrics.outcomeSplit.lost
                )}`}
              />
              <Tile label={M.kpiPipeline} value={`${fmt(metrics.pipelineValue)} ${M.gel}`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Funnel */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {M.funnelTitle}
                </h3>
                <div className="space-y-2.5">
                  {funnelRows.map((r) => (
                    <BarRow
                      key={r.label}
                      label={r.label}
                      count={r.count}
                      max={metrics.funnel.captured}
                    />
                  ))}
                </div>
              </div>

              {/* Payment split — status colors with text labels */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {M.payment}
                </h3>
                <div className="space-y-2.5">
                  {payment.map(({ key, cls }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
                        {A.assign.pay[key]}
                      </span>
                      <span className="text-sm font-semibold text-brand-dark">
                        {fmt(metrics.paymentSplit[key])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outcomes — status colors + text labels */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {M.outcomeTitle}
                </h3>
                <div className="space-y-2.5">
                  {outcomes.map(({ key, cls }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
                        {A.outcome[key]}
                      </span>
                      <span className="text-sm font-semibold text-brand-dark">
                        {fmt(metrics.outcomeSplit[key])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI-relevant demand vs the aiRelevant note already shown in funnel;
                  here we surface it inline for balance. */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {M.aiRelevant}
                </h3>
                <p className="text-4xl font-bold text-brand-dark">{fmt(metrics.aiRelevant)}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {M.aiRelevant} / {fmt(metrics.total)}
                </p>
              </div>

              <BarCard title={M.byCategory} rows={metrics.byCategory} empty={M.noData} />
              <BarCard title={M.byExpert} rows={expertRows} empty={M.noExperts} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
