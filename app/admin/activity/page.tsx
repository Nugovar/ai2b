// Admin AI Activity Log. Server-rendered initial feed (avoids an empty flash
// before the client's first poll), gated by the httpOnly admin cookie like
// the other admin pages.
import { listAiEvents } from "@/lib/aiEvents";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";
import AdminActivityTable from "@/components/AdminActivityTable";
import AdminLogin from "@/components/AdminLogin";

// Always render fresh (events change at runtime).
export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  if (!isAdminRequestAuthorized()) {
    return <AdminLogin />;
  }

  const { events, storage } = await listAiEvents({ limit: 200 });
  return <AdminActivityTable initialEvents={events} initialStorage={storage} />;
}
