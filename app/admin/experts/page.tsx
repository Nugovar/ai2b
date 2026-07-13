// Admin experts directory. Lists ALL experts incl. internal admin-only fields
// (phone/social/notes) - server-rendered behind the demo gate. Same source as
// matching (Supabase secret key, or in-memory fallback seed).
import { listExperts } from "@/lib/expertStore";
import { isAdminRequestAuthorized, isAdminProtected } from "@/lib/adminAuth";
import AdminExpertsTable from "@/components/AdminExpertsTable";
import AdminLogin from "@/components/AdminLogin";

export const dynamic = "force-dynamic";

export default async function AdminExpertsPage() {
  if (!isAdminRequestAuthorized()) {
    return <AdminLogin />;
  }

  const { experts, storage } = await listExperts();

  return (
    <AdminExpertsTable
      experts={experts}
      storage={storage}
      protectedMode={isAdminProtected()}
    />
  );
}
