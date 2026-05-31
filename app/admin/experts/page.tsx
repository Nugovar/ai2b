// Admin experts directory. Lists ALL experts incl. internal admin-only fields
// (phone/social/notes) - server-rendered behind the demo gate. Same source as
// matching (Supabase secret key, or in-memory fallback seed).
import { listExperts } from "@/lib/expertStore";
import { isAdminAuthorized, isAdminProtected } from "@/lib/adminAuth";
import AdminExpertsTable from "@/components/AdminExpertsTable";
import AdminLogin from "@/components/AdminLogin";

export const dynamic = "force-dynamic";

export default async function AdminExpertsPage({
  searchParams,
}: {
  searchParams: { key?: string };
}) {
  const key = searchParams?.key ?? "";

  if (!isAdminAuthorized(key)) {
    return <AdminLogin action="/admin/experts" attempted={Boolean(key)} />;
  }

  const { experts, storage } = await listExperts();

  return (
    <AdminExpertsTable
      experts={experts}
      storage={storage}
      authKey={key}
      protectedMode={isAdminProtected()}
    />
  );
}
