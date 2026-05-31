"use client";

import { useApp } from "@/components/ChatProvider";

export default function Contact() {
  const { t, scrollToChat } = useApp();

  return (
    <section id="contact" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-brand-dark px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.contact.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">{t.contact.subtitle}</p>
          <button
            onClick={scrollToChat}
            className="mt-8 rounded-full bg-brand-red px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-xl"
          >
            {t.contact.button}
          </button>
        </div>
      </div>
    </section>
  );
}
