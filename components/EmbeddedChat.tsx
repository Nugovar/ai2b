"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp, EMBEDDED_CHAT_ID } from "@/components/ChatProvider";
import ChatBody from "@/components/ChatBody";

// The refined, centered chat surface — the hero's focal element. Compact by
// default, with an expand toggle to a near-fullscreen overlay for longer
// conversations. Conversation state lives in the shared context, so toggling
// fullscreen never resets the chat.
//
// NOTE: when expanded we render through a portal to <body>. The hero wraps this
// in an animated (transformed) element, and a transformed ancestor becomes the
// containing block for position:fixed — which would break a fullscreen overlay.
// Portaling to <body> positions the overlay relative to the viewport instead.
export default function EmbeddedChat() {
  const { t } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Exit on Escape + lock background scroll while expanded.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const expandLabel = expanded ? t.chat.collapseAria : t.chat.expandAria;

  const panel = (
    <div
      id={EMBEDDED_CHAT_ID}
      className={
        expanded
          ? "relative z-[1] m-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white text-left shadow-2xl ring-1 ring-black/10"
          : "mx-auto flex h-[clamp(440px,62vh,560px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white text-left shadow-2xl ring-1 ring-black/10 scroll-mt-24"
      }
    >
      {/* Chat header */}
      <div className="flex items-center gap-3 bg-brand-dark px-4 py-3 text-white">
        <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-dark ring-1 ring-white/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt={t.chat.botName} className="h-full w-full object-cover" width={40} height={40} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">{t.chat.botName}</p>
          <p className="text-xs text-white/60">{t.chat.botRole}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-white/60">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          online
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expandLabel}
          title={expandLabel}
          className="ml-1 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {expanded ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>
      </div>

      <ChatBody embedded />
    </div>
  );

  if (expanded && mounted) {
    return (
      <>
        {/* Placeholder keeps the hero's layout height stable (no jump). */}
        <div aria-hidden className="mx-auto h-[clamp(440px,62vh,560px)] w-full max-w-2xl" />
        {createPortal(
          <div className="fixed inset-0 z-[70] flex p-2 sm:p-6 animate-fade-in">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
              aria-hidden="true"
            />
            {panel}
          </div>,
          document.body
        )}
      </>
    );
  }

  return panel;
}
