// Admin metrics dashboard. Server-rendered from the same leads dataset the
// leads tab uses; all aggregation happens in lib/metrics.ts (pure). Gated by
// the httpOnly admin cookie like the other admin pages.
import { listLeads } from "@/lib/leadStore";
import { computeMetrics } from "@/lib/metrics";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";
import AdminMetrics from "@/components/AdminMetrics";
import AdminLogin from "@/components/AdminLogin";

// Always render fresh (leads change at runtime).
export const dynamic = "force-dynamic";

export default async function AdminMetricsPage() {
  if (!isAdminRequestAuthorized()) {
    return <AdminLogin />;
  }

  const { leads, storage } = await listLeads();
  const metrics = computeMetrics(leads, Date.now());

  return <AdminMetrics metrics={metrics} storage={storage} />;
}
