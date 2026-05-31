"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/ChatProvider";

export default function Header() {
  const { t, lang, setLang, scrollToChat } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Transparent (blends into the dark hero) at the top; solid dark on scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#home", label: t.nav.home },
    { href: "#how", label: t.nav.how },
    { href: "#services", label: t.nav.services },
    { href: "#contact", label: t.nav.contact },
  ];

  const startChat = () => {
    setMobileOpen(false);
    scrollToChat();
  };

  const opaque = scrolled || mobileOpen;

  const LangToggle = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center rounded-full border border-white/20 p-0.5 text-xs font-semibold ${className}`} role="group" aria-label={t.langToggle.aria}>
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

  // Circular logo badge — square source image masked into a clean circle.
  const Logo = ({ size }: { size: string }) => (
    <span className={`inline-flex ${size} items-center justify-center overflow-hidden rounded-full bg-brand-dark ring-1 ring-white/10`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="AI2Business" className="h-full w-full object-cover" width={48} height={48} />
    </span>
  );

  return (
    <header
      className={`fixed top-0 z-40 w-full transition-all duration-300 ${
        opaque
          ? "border-b border-white/10 bg-brand-dark/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-brand-dark/80"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#home" className="flex items-center gap-2" aria-label="AI2Business">
          <Logo size="h-10 w-10 sm:h-11 sm:w-11" />
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-white/80 transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
          <LangToggle />
          <button
            onClick={startChat}
            className="rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md"
          >
            {t.header.cta}
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-3 md:hidden">
          <LangToggle />
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-white"
            aria-label={t.header.menu}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-brand-dark md:hidden">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <button onClick={startChat} className="mt-2 w-full rounded-full bg-brand-red px-5 py-3 text-base font-semibold text-white">
              {t.header.cta}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
