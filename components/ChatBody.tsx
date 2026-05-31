"use client";

import { useEffect, useRef, useState } from "react";
import { useApp, EMBEDDED_INPUT_ID } from "@/components/ChatProvider";

// Small circular bot avatar shown beside assistant messages.
function BotAvatar() {
  return (
    <span className="mb-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-dark ring-1 ring-black/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo2.png" alt="" className="h-full w-full object-cover" width={28} height={28} />
    </span>
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

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, showLeadForm]);

  function doSend() {
    const el = inputRef.current;
    const text = (el?.value ?? "").trim();
    if (!text || loading) return;
    send(text);
    if (el) el.value = "";
    setCanSend(false);
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
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && <BotAvatar />}
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-brand-red text-white"
                  : "rounded-bl-sm bg-white text-brand-dark shadow-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

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

          <div className="flex items-end gap-2 px-3 py-3">
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
              disabled={!canSend || loading}
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
