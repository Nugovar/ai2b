"use client";

import { useApp } from "@/components/ChatProvider";
import EmbeddedChat from "@/components/EmbeddedChat";

export default function Hero() {
  const { t, scrollToChat } = useApp();

  return (
    <section id="home" className="relative overflow-hidden bg-brand-dark text-white">
      {/* background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-red/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-brand-red/10 blur-3xl" />
      </div>

      {/* pt clears the fixed header */}
      <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:px-8">
        {/* Intro — centered */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-5 inline-block rounded-full border border-brand-red/40 bg-brand-red/10 px-4 py-1.5 text-sm font-medium text-brand-red opacity-0 animate-fade-in">
            {t.hero.badge}
          </span>

          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight opacity-0 animate-fade-in-up sm:text-5xl">
            {t.hero.titleA}
            <span className="text-brand-red">{t.hero.titleHighlight}</span>
            {t.hero.titleB}
          </h1>

          <p
            className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-white/70 opacity-0 animate-fade-in-up sm:text-lg"
            style={{ animationDelay: "0.1s" }}
          >
            {t.hero.subtitle}
          </p>

          <div
            className="mt-7 flex flex-col items-center justify-center gap-3 opacity-0 animate-fade-in-up sm:flex-row"
            style={{ animationDelay: "0.2s" }}
          >
            <button
              onClick={scrollToChat}
              className="w-full rounded-full bg-brand-red px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-xl sm:w-auto"
            >
              {t.hero.ctaPrimary}
            </button>
            <a
              href="#how"
              className="w-full rounded-full border border-white/20 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              {t.hero.ctaSecondary}
            </a>
          </div>
        </div>

        {/* Chat — centered focal element below the intro */}
        <div className="mt-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <EmbeddedChat />
        </div>
      </div>
    </section>
  );
}
