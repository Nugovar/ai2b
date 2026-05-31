"use client";

import { useApp } from "@/components/ChatProvider";

export default function Footer() {
  const { t } = useApp();

  const navLinks = [
    { href: "#home", label: t.nav.home },
    { href: "#how", label: t.nav.how },
    { href: "#services", label: t.nav.services },
    { href: "#contact", label: t.nav.contact },
  ];

  return (
    <footer className="bg-brand-dark text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-brand-dark ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="AI2Business" className="h-full w-full object-cover" width={48} height={48} />
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">{t.footer.tagline}</p>
          </div>

          {/* Nav */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">{t.footer.navHeading}</h3>
            <ul className="mt-4 space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — PLACEHOLDER values */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">{t.footer.contactHeading}</h3>
            {/* TODO: confirm from ai2b.ge */}
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                {t.footer.emailLabel}{" "}
                <a href="mailto:info@ai2b.ge" className="transition-colors hover:text-white">info@ai2b.ge</a>
              </li>
              {/* TODO: confirm from ai2b.ge — placeholder phone */}
              <li>{t.footer.phoneLabel} {t.footer.phoneValue}</li>
              {/* TODO: confirm from ai2b.ge — placeholder address */}
              <li>{t.footer.addressLabel} {t.footer.addressValue}</li>
              <li className="flex gap-4 pt-2">
                {/* TODO: confirm social links from ai2b.ge */}
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-white/70 transition-colors hover:text-white" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" /></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white/70 transition-colors hover:text-white" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zm0 10.16a4 4 0 110-8 4 4 0 010 8zm6.41-10.4a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" /></svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-white/70 transition-colors hover:text-white" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3V9zm6 0h3.8v1.64h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.33-.02-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95V21H9V9z" /></svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/50">{t.footer.copyright}</div>
      </div>
    </footer>
  );
}
