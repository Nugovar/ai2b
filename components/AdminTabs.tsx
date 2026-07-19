"use client";

import { useApp } from "@/components/ChatProvider";

// Admin tab navigation (Leads / Experts) + logout. Auth is via the httpOnly
// admin cookie, so no key is threaded through links anymore.
export default function AdminTabs({
  active,
}: {
  active: "leads" | "experts" | "metrics" | "chats" | "activity";
}) {
  const { t } = useApp();
  const tabs = [
    { id: "leads" as const, label: t.admin.tabs.leads, href: "/admin" },
    { id: "experts" as const, label: t.admin.tabs.experts, href: "/admin/experts" },
    { id: "metrics" as const, label: t.admin.tabs.metrics, href: "/admin/metrics" },
    { id: "chats" as const, label: t.admin.tabs.chats, href: "/admin/chats" },
    { id: "activity" as const, label: t.admin.tabs.activity, href: "/admin/activity" },
  ];

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin";
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <nav className="-mb-px flex gap-1">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={tab.href}
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
      <button
        onClick={logout}
        className="mb-1 rounded-md px-3 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        {t.admin.logout}
      </button>
    </div>
  );
}
