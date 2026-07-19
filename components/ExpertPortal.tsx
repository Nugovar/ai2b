"use client";

// Authed expert workspace: a feed of the expert's assigned tasks and a detail
// view where they read the AI brief, then complete + rate it. The rating writes
// the SAME ai_draft_status field the admin used, so it feeds the north-star
// acceptance metric directly — but now reported by the person who did the work.
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/ChatProvider";
import { getExpertDict } from "@/lib/expertI18n";
import { uploadFiles } from "@/lib/uploadClient";
import { ACCEPT_ATTR } from "@/lib/uploadLimits";
import type { ExpertTask } from "@/lib/leadStore";
import type { AiDraftStatus, Attachment } from "@/lib/types";

type Rating = Exclude<AiDraftStatus, "unset">;

const RATINGS: { key: Rating; cls: string; sel: string }[] = [
  { key: "accepted", cls: "border-green-300 text-green-700", sel: "bg-green-50 ring-2 ring-green-400" },
  { key: "edited", cls: "border-amber-300 text-amber-700", sel: "bg-amber-50 ring-2 ring-amber-400" },
  { key: "rejected", cls: "border-red-300 text-brand-red", sel: "bg-red-50 ring-2 ring-red-400" },
];

function StatusPill({ status, label }: { status: string; label: string }) {
  const cls =
    status === "done"
      ? "bg-green-50 text-green-700 border-green-300"
      : status === "in_progress"
      ? "bg-amber-50 text-amber-700 border-amber-300"
      : "bg-gray-100 text-gray-600 border-gray-300";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function ExpertPortal({
  expertName,
  tasks: initialTasks,
}: {
  expertName: string;
  tasks: ExpertTask[];
}) {
  const { lang, setLang } = useApp();
  const T = getExpertDict(lang);
  const router = useRouter();

  const [tasks, setTasks] = useState<ExpertTask[]>(initialTasks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const statusLabel = (s: string) =>
    s === "done" ? T.statusDone : s === "in_progress" ? T.statusInProgress : T.statusNew;

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks]);
  const selected = useMemo(() => tasks.find((t) => t.id === selectedId) ?? null, [tasks, selectedId]);

  function openTask(id: string) {
    setSelectedId(id);
    setRating(null);
    setFiles([]);
    setError(false);
  }

  async function logout() {
    await fetch("/api/expert/logout", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  async function submit() {
    if (!selected || !rating || busy) return;
    setBusy(true);
    setError(false);
    try {
      // Upload any attached deliverables first, so the submit carries real URLs.
      let deliverables: Attachment[] = [];
      if (files.length > 0) {
        deliverables = await uploadFiles(files, lang, T.uploadError);
      }

      const res = await fetch("/api/expert/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selected.id, rating, deliverables }),
      });
      if (!res.ok) {
        setError(true);
        setBusy(false);
        return;
      }
      // Optimistically reflect the completion in local state.
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                status: "done",
                ai_draft_status: rating,
                deliverables: deliverables.length > 0 ? deliverables : t.deliverables,
              }
            : t
        )
      );
      setFiles([]);
      setBusy(false);
    } catch {
      setError(true);
      setBusy(false);
    }
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
              <p className="text-sm font-bold leading-tight">
                {T.greeting}, {expertName}
              </p>
              <p className="text-xs text-white/50">{T.portalTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-white/20 p-0.5 text-xs font-semibold" role="group">
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
            <button
              onClick={logout}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {T.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {!selected ? (
          <Feed
            T={T}
            openTasks={openTasks}
            doneTasks={doneTasks}
            statusLabel={statusLabel}
            onOpen={openTask}
          />
        ) : (
          <Detail
            T={T}
            task={selected}
            statusLabel={statusLabel}
            rating={rating}
            setRating={setRating}
            files={files}
            setFiles={setFiles}
            busy={busy}
            error={error}
            onSubmit={submit}
            onBack={() => setSelectedId(null)}
          />
        )}
      </div>
    </main>
  );
}

function Feed({
  T,
  openTasks,
  doneTasks,
  statusLabel,
  onOpen,
}: {
  T: ReturnType<typeof getExpertDict>;
  openTasks: ExpertTask[];
  doneTasks: ExpertTask[];
  statusLabel: (s: string) => string;
  onOpen: (id: string) => void;
}) {
  const all = [...openTasks, ...doneTasks];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand-dark">{T.myTasks}</h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-brand-dark">{openTasks.length}</span> {T.openCount}
          <span className="text-gray-300">·</span>
          <span className="font-semibold text-brand-dark">{doneTasks.length}</span> {T.doneCount}
        </div>
      </div>

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-base font-semibold text-brand-dark">{T.noTasks}</p>
          <p className="mt-1 text-sm text-gray-400">{T.noTasksHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {all.map((task) => (
            <button
              key={task.id}
              onClick={() => onOpen(task.id)}
              className="flex w-full items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-red/40"
            >
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-brand-dark">
                    {task.business_type || task.category || T.taskFrom}
                  </span>
                  {task.ai_relevant && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red">
                      {T.aiFlag}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm text-gray-500">
                  {task.summary || task.advice || "—"}
                </p>
              </div>
              <StatusPill status={task.status} label={statusLabel(task.status)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({
  T,
  task,
  statusLabel,
  rating,
  setRating,
  files,
  setFiles,
  busy,
  error,
  onSubmit,
  onBack,
}: {
  T: ReturnType<typeof getExpertDict>;
  task: ExpertTask;
  statusLabel: (s: string) => string;
  rating: Exclude<AiDraftStatus, "unset"> | null;
  setRating: (r: Exclude<AiDraftStatus, "unset">) => void;
  files: File[];
  setFiles: (f: File[]) => void;
  busy: boolean;
  error: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDone = task.status === "done";
  const skills = task.required_skills ?? [];
  const clientFiles = task.attachments ?? [];
  const deliverables = task.deliverables ?? [];
  const slots = task.slots ? Object.entries(task.slots) : [];
  const rateLabel = (r: string) =>
    r === "accepted" ? T.rateAccepted : r === "edited" ? T.rateEdited : T.rateRejected;

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="text-sm font-medium text-gray-500 transition-colors hover:text-brand-dark"
      >
        ← {T.back}
      </button>

      {/* Task header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-brand-dark">
              {task.business_type || task.category || T.taskFrom}
            </h2>
            {task.ai_relevant && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red">
                {T.aiFlag}
              </span>
            )}
          </div>
          <StatusPill status={task.status} label={statusLabel(task.status)} />
        </div>
        {task.category && task.business_type && (
          <p className="mt-1 text-sm text-gray-400">{task.category}</p>
        )}
      </div>

      {/* AI brief */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          {T.briefTitle}
        </h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {task.advice || task.summary || T.noBrief}
        </p>
      </section>

      {/* Details + skills */}
      {(slots.length > 0 || skills.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {slots.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                {T.detailsTitle}
              </h3>
              <dl className="space-y-1.5">
                {slots.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-sm">
                    <dt className="text-gray-400">{k}</dt>
                    <dd className="text-right font-medium text-brand-dark">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {skills.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                {T.skillsTitle}
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Client-supplied files */}
      {clientFiles.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            {T.filesTitle}
          </h3>
          <ul className="space-y-2">
            {clientFiles.map((f, i) => (
              <li key={i}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-brand-red hover:underline"
                >
                  <span aria-hidden>{f.isImage ? "🖼️" : "📄"}</span>
                  <span className="truncate">{f.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Submit / rate — or the recorded rating + deliverables if already done */}
      {isDone ? (
        <section className="rounded-2xl border-2 border-green-200 bg-green-50/50 p-5">
          <p className="text-sm font-semibold text-green-700">{T.submitted}</p>
          {task.ai_draft_status && task.ai_draft_status !== "unset" && (
            <p className="mt-1 text-sm text-gray-500">
              {T.briefTitle}: <span className="font-medium">{rateLabel(task.ai_draft_status)}</span>
            </p>
          )}
          {deliverables.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                {T.deliverablesTitle}
              </p>
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
        </section>
      ) : (
        <section className="rounded-2xl border-2 border-brand-red/30 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-brand-dark">{T.submitTitle}</h3>
          <p className="mt-1 text-sm text-gray-500">{T.submitHint}</p>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {RATINGS.map(({ key, cls, sel }) => {
              const active = rating === key;
              return (
                <button
                  key={key}
                  onClick={() => setRating(key)}
                  className={`rounded-xl border bg-white px-3 py-3 text-left transition-all ${cls} ${active ? sel : "hover:border-gray-400"}`}
                >
                  <span className="block text-sm font-semibold">{rateLabel(key)}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {key === "accepted"
                      ? T.rateAcceptedHint
                      : key === "edited"
                      ? T.rateEditedHint
                      : T.rateRejectedHint}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Optional deliverable upload */}
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-3">
            <p className="mb-2 text-xs font-semibold text-gray-500">{T.attachTitle}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:border-brand-red"
              >
                {T.attachBtn}
              </button>
              {files.map((f, i) => (
                <span
                  key={i}
                  className="max-w-[12rem] truncate rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                  title={f.name}
                >
                  {f.name}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-brand-red">
              {T.submitError}
            </p>
          )}

          <button
            onClick={onSubmit}
            disabled={!rating || busy}
            className="mt-4 w-full rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? T.submitting : T.submitBtn}
          </button>
        </section>
      )}
    </div>
  );
}
