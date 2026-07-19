"use client";

import { useApp } from "@/components/ChatProvider";
import { MARKETING_ONLY } from "@/lib/config";

// Icon paths align by index with the 5 service categories in the i18n dict:
// Marketing, Development, Legal, Design/Branding, Business consulting.
const ICONS = [
  // Marketing - megaphone
  "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
  // Development - code brackets
  "M17.25 6.75L22.5 12l-5.25 5.25M6.75 17.25L1.5 12l5.25-5.25M14.25 3.75l-4.5 16.5",
  // Legal - scales of justice
  "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.203L18.75 4.97zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.203L5.25 4.97z",
  // Design / Branding - paint brush
  "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42",
  // Business consulting - growth trend
  "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
];

export default function Services() {
  const { t, scrollToChat } = useApp();

  return (
    <section id="services" className="bg-gray-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-dark sm:text-4xl">{t.services.title}</h2>
          <p className="mt-4 text-lg text-gray-600">
            {MARKETING_ONLY ? t.services.subtitleMarketing : t.services.subtitle}
          </p>
        </div>

        <div
          className={`mt-16 grid gap-6 ${
            MARKETING_ONLY ? "mx-auto max-w-4xl sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {/* MARKETING_ONLY: render ONLY the marketing card (index 0) — the other
              directions are removed from the public site entirely. */}
          {(MARKETING_ONLY ? t.services.items.slice(0, 1) : t.services.items).map((service, i) => (
            <div
              key={i}
              className={`group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${
                MARKETING_ONLY ? "ring-2 ring-brand-red/30" : ""
              }`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red transition-colors group-hover:bg-brand-red group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[i]} />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-brand-dark">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{service.description}</p>
            </div>
          ))}

          {/* CTA card */}
          <div className="flex flex-col justify-center rounded-2xl bg-brand-dark p-6 text-white shadow-sm">
            <h3 className="text-lg font-bold">{t.services.ctaTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{t.services.ctaText}</p>
            <button
              onClick={scrollToChat}
              className="mt-4 self-start rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              {t.services.ctaButton}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
