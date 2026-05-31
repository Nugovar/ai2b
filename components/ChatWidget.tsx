"use client";

import { useApp } from "@/components/ChatProvider";
import ChatBody from "@/components/ChatBody";

// Floating launcher + corner panel. Secondary to the embedded hero chat, but
// shares the SAME conversation state via context. Lets visitors reach the chat
// while scrolled down the page.
export default function ChatWidget() {
  const { t, isOpen, openChat, closeChat } = useApp();

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={isOpen ? closeChat : openChat}
        aria-label={isOpen ? t.chat.closeAria : t.chat.openAria}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-white shadow-xl transition-all hover:bg-red-700 hover:shadow-2xl sm:bottom-6 sm:right-6"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12a8 8 0 01-8 8H7l-4 3V12a8 8 0 018-8h2a8 8 0 018 8z" />
          </svg>
        )}
      </button>

      {/* Corner panel */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-24 z-50 flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-scale-in sm:inset-x-auto sm:right-6 sm:bottom-24 sm:h-[600px] sm:w-[400px]">
          <div className="flex items-center gap-3 bg-brand-dark px-4 py-3 text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-dark ring-1 ring-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo2.png" alt={t.chat.botName} className="h-full w-full object-cover" width={36} height={36} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">{t.chat.botName}</p>
              <p className="text-xs text-white/60">{t.chat.botRole}</p>
            </div>
            <button
              onClick={closeChat}
              aria-label={t.chat.closeAria}
              className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ChatBody />
        </div>
      )}
    </>
  );
}
