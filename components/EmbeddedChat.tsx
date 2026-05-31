"use client";

import { useApp, EMBEDDED_CHAT_ID } from "@/components/ChatProvider";
import ChatBody from "@/components/ChatBody";

// The refined, centered chat surface — the hero's focal element. Compact, with
// a sensible max-width (not stretched). Shares conversation state with the
// floating widget via context.
export default function EmbeddedChat() {
  const { t } = useApp();

  return (
    <div
      id={EMBEDDED_CHAT_ID}
      className="mx-auto flex h-[clamp(440px,62vh,560px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white text-left shadow-2xl ring-1 ring-black/10 scroll-mt-24"
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
      </div>

      <ChatBody embedded />
    </div>
  );
}
