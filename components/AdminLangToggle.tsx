"use client";

import { useApp } from "@/components/ChatProvider";

// Same "ქარ / ENG" toggle as the public header, reusing the shared language
// context + localStorage preference. Dark-surface variant for the admin header.
export default function AdminLangToggle() {
  const { lang, setLang, t } = useApp();
  return (
    <div
      className="flex shrink-0 items-center rounded-full border border-white/20 p-0.5 text-xs font-semibold"
      role="group"
      aria-label={t.langToggle.aria}
    >
      <button
        onClick={() => setLang("ka")}
        className={`rounded-full px-2.5 py-1 transition-colors ${lang === "ka" ? "bg-brand-red text-white" : "text-white/70 hover:text-white"}`}
        aria-pressed={lang === "ka"}
      >
        {t.langToggle.ka}
      </button>
      <button
        onClick={() => setLang("en")}
        className={`rounded-full px-2.5 py-1 transition-colors ${lang === "en" ? "bg-brand-red text-white" : "text-white/70 hover:text-white"}`}
        aria-pressed={lang === "en"}
      >
        {t.langToggle.en}
      </button>
    </div>
  );
}
