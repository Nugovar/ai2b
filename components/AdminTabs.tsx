"use client";

import { useApp } from "@/components/ChatProvider";

// Admin tab navigation (Leads / Experts). Preserves the ?key= gate param.
export default function AdminTabs({
  active,
  authKey,
}: {
  active: "leads" | "experts";
  authKey: string;
}) {
  const { t } = useApp();
  const q = authKey ? `?key=${encodeURIComponent(authKey)}` : "";
  const tabs = [
    { id: "leads" as const, label: t.admin.tabs.leads, href: "/admin" },
    { id: "experts" as const, label: t.admin.tabs.experts, href: "/admin/experts" },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <nav className="-mb-px flex gap-1">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={`${tab.href}${q}`}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              active === tab.id
                ? "bg-gray-50 text-brand-dark"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
