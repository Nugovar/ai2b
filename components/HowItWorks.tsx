"use client";

import { useApp } from "@/components/ChatProvider";

const ICONS = [
  // 1: chat / describe
  "M8 10h8M8 14h5M21 12a9 9 0 11-3.6-7.2L21 4v5h-5",
  // 2: analyze / gear-ish
  "M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3L4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4",
  // 3: complete / check
  "M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z",
];

export default function HowItWorks() {
  const { t } = useApp();

  return (
    <section id="how" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-dark sm:text-4xl">{t.how.title}</h2>
          <p className="mt-4 text-lg text-gray-600">{t.how.subtitle}</p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {t.how.steps.map((step, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-red/20 hover:shadow-lg"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red transition-colors group-hover:bg-brand-red group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[i]} />
                  </svg>
                </div>
                <span className="text-5xl font-black tracking-tight text-brand-red/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-xl font-bold text-brand-dark">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
