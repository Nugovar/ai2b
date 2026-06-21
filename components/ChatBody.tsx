"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, EMBEDDED_INPUT_ID } from "@/components/ChatProvider";
import type { Attachment } from "@/lib/types";
import { ACCEPT_ATTR, MAX_BYTES, MAX_FILES, isAllowedType } from "@/lib/uploadLimits";

// Small circular bot avatar shown beside assistant messages.
function BotAvatar() {
  return (
    <span className="mb-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dark ring-1 ring-black/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo2.png" alt="" className="h-full w-full object-cover" width={28} height={28} />
    </span>
  );
}

// Renders the files/photos attached to a sent message inside its bubble.
// Images show as clickable thumbnails; other files as a labeled chip.
function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((a, i) =>
        a.isImage ? (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" title={a.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url}
              alt={a.name}
              className="h-20 w-20 rounded-lg object-cover ring-1 ring-black/10"
            />
          </a>
        ) : (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            title={a.name}
            className="flex max-w-[12rem] items-center gap-1.5 rounded-lg bg-black/10 px-2 py-1.5 text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
            </svg>
            <span className="truncate">{a.name}</span>
          </a>
        )
      )}
    </div>
  );
}

// The shared conversation body. The text input is UNCONTROLLED (its value lives
// in the DOM via a ref), so React never re-sets it during typing and characters
// can't be dropped - including fast Georgian / IME input. We only read the value
// on send and clear it afterward. A tiny `canSend` flag drives the button state
// but never touches the textarea value, so it's safe.
export default function ChatBody({ embedded = false }: { embedded?: boolean }) {
  const {
    t,
    messages,
    control,
    showLeadForm,
    loading,
    send,
    editLastUserMessage,
    lead,
    setLead,
    leadSubmitting,
    leadError,
    leadDone,
    submitLead,
  } = useApp();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isComposing = useRef(false);
  const [canSend, setCanSend] = useState(false);

  // Pending attachments (files/photos picked but not yet sent). Kept in React
  // state separate from the uncontrolled textarea so they never interfere with
  // IME composition. The hidden <input type="file"> is triggered by the clip.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);

  // Object URLs for image previews; revoked when the file set changes/unmounts.
  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null })),
    [files]
  );
  useEffect(() => {
    return () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
  }, [previews]);

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setAttachError(null);
    setFiles((prev) => {
      const next = [...prev];
      for (const f of Array.from(selected)) {
        if (!isAllowedType(f.type)) {
          setAttachError(t.chat.attachBadType);
          continue;
        }
        if (f.size > MAX_BYTES) {
          setAttachError(t.chat.attachTooLarge);
          continue;
        }
        if (next.length >= MAX_FILES) {
          setAttachError(t.chat.attachTooMany);
          break;
        }
        next.push(f);
      }
      return next;
    });
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setAttachError(null);
  }

  // Inline edit of the LAST user message.
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const editComposing = useRef(false);

  const lastUserIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return i;
    }
    return -1;
  })();

  function startEdit() {
    if (loading) return;
    setEditing(true);
  }
  function saveEdit() {
    const v = (editRef.current?.value ?? "").trim();
    if (!v || loading) return;
    setEditing(false);
    editLastUserMessage(v);
  }
  function editKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !editComposing.current && !e.nativeEvent.isComposing) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, showLeadForm]);

  function doSend() {
    const el = inputRef.current;
    const text = (el?.value ?? "").trim();
    if ((!text && files.length === 0) || loading) return;
    send(text, files.length > 0 ? files : undefined);
    if (el) el.value = "";
    setFiles([]);
    setAttachError(null);
    setCanSend(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function sendChip(text: string) {
    if (loading) return;
    send(text);
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const has = e.currentTarget.value.trim().length > 0;
    // Only flip state on the empty/non-empty boundary to minimize re-renders.
    setCanSend((prev) => (prev === has ? prev : has));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Never act on Enter while an IME composition is in progress.
    if (e.key === "Enter" && !e.shiftKey && !isComposing.current && !e.nativeEvent.isComposing) {
      e.preventDefault();
      doSend();
    }
  }

  const showChips = !showLeadForm && (control.chips?.length ?? 0) > 0 && !loading;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4"
      >
        {messages.map((m, i) => {
          const isLastUser = i === lastUserIdx && m.role === "user";
          const editable = isLastUser && !showLeadForm && !loading;

          // Inline editor for the last user message.
          if (isLastUser && editing) {
            return (
              <div key={i} className="flex justify-end">
                <div className="w-full max-w-[90%] rounded-2xl border border-brand-red/40 bg-white p-2 shadow-sm">
                  <textarea
                    ref={editRef}
                    rows={2}
                    defaultValue={m.content}
                    autoFocus
                    onKeyDown={editKeyDown}
                    onCompositionStart={() => (editComposing.current = true)}
                    onCompositionEnd={() => (editComposing.current = false)}
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-brand-dark placeholder:text-gray-400 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100"
                    >
                      {t.chat.editCancel}
                    </button>
                    <button
                      onClick={saveEdit}
                      className="rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      {t.chat.editSave}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`group flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && <BotAvatar />}
              {editable && (
                <button
                  onClick={startEdit}
                  aria-label={t.chat.editAria}
                  title={t.chat.editAria}
                  className="mb-1 shrink-0 rounded-md p-1 text-gray-400 opacity-100 transition-colors hover:text-brand-red sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.688-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                  </svg>
                </button>
              )}
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-sm bg-brand-red text-white"
                    : "rounded-bl-sm bg-white text-brand-dark shadow-sm"
                }`}
              >
                {m.content}
                {m.attachments && m.attachments.length > 0 && (
                  <MessageAttachments attachments={m.attachments} />
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-end justify-start gap-2">
            <BotAvatar />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce-dot" style={{ animationDelay: "0s" }} />
              <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce-dot" style={{ animationDelay: "0.2s" }} />
              <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce-dot" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>

      {/* Lead capture form */}
      {showLeadForm && !leadDone && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitLead();
          }}
          className="space-y-2 border-t border-gray-200 bg-white px-4 py-3"
        >
          <p className="text-xs font-medium text-gray-500">{t.chat.leadPrompt}</p>
          <input
            type="text"
            required
            placeholder={t.chat.leadName}
            value={lead.name}
            onChange={(e) => setLead({ ...lead, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-dark placeholder:text-gray-400 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
          />
          <input
            type="tel"
            required
            placeholder={t.chat.leadPhone}
            value={lead.phone}
            onChange={(e) => setLead({ ...lead, phone: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-dark placeholder:text-gray-400 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
          />
          <input
            type="email"
            required
            placeholder={t.chat.leadEmail}
            value={lead.email}
            onChange={(e) => setLead({ ...lead, email: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-dark placeholder:text-gray-400 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
          />
          {leadError && <p className="text-xs text-brand-red">{leadError}</p>}
          <button
            type="submit"
            disabled={leadSubmitting}
            className="w-full rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {leadSubmitting ? t.chat.leadSubmitting : t.chat.leadSubmit}
          </button>
        </form>
      )}

      {/* Chips + text input */}
      {!showLeadForm && (
        <div className="border-t border-gray-200 bg-white">
          {showChips && (
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              {control.chips!.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendChip(chip)}
                  className="rounded-full border border-brand-red/30 bg-brand-red/5 px-3 py-1.5 text-xs font-medium text-brand-red transition-colors hover:bg-brand-red hover:text-white"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Pending attachment previews + any validation error */}
          {(files.length > 0 || attachError) && (
            <div className="px-3 pt-3">
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {previews.map((p, i) => (
                    <div
                      key={i}
                      className="group relative flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-1 pr-6 text-xs text-brand-dark"
                    >
                      {p.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.url} alt={p.name} className="h-9 w-9 rounded object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded bg-brand-red/10 text-brand-red">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
                          </svg>
                        </span>
                      )}
                      <span className="max-w-[7rem] truncate">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label={t.chat.attachRemoveAria}
                        className="absolute right-1 top-1 rounded p-0.5 text-gray-400 transition-colors hover:text-brand-red"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {attachError && <p className="mt-1 text-xs text-brand-red">{attachError}</p>}
            </div>
          )}

          <div className="flex items-end gap-2 px-3 py-3">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              accept={ACCEPT_ATTR}
              onChange={(e) => addFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || files.length >= MAX_FILES}
              aria-label={t.chat.attachAria}
              title={t.chat.attachAria}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300 text-gray-500 transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-40"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <textarea
              id={embedded ? EMBEDDED_INPUT_ID : undefined}
              ref={inputRef}
              rows={1}
              defaultValue=""
              onInput={handleInput}
              onCompositionStart={() => {
                isComposing.current = true;
              }}
              onCompositionEnd={() => {
                isComposing.current = false;
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.chat.inputPlaceholder}
              className="max-h-28 flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm text-brand-dark placeholder:text-gray-400 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
            />
            <button
              onClick={doSend}
              disabled={(!canSend && files.length === 0) || loading}
              aria-label={t.chat.sendAria}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red text-white transition-colors hover:bg-red-700 disabled:opacity-40"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
