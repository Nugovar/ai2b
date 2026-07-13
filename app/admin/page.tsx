// Admin leads panel. Read-only list of captured leads + status dropdown + the
// TOP RANKED expert matches for each lead's task (computed server-side from the
// task signal captured with the lead). Gated by the httpOnly admin cookie.
import { listLeads } from "@/lib/leadStore";
import { listPublicExperts } from "@/lib/expertStore";
import { rankExperts, type RankedExpert } from "@/lib/match";
import { isAdminRequestAuthorized, isAdminProtected } from "@/lib/adminAuth";
import AdminLeadsTable from "@/components/AdminLeadsTable";
import AdminLogin from "@/components/AdminLogin";

// Always render fresh (leads change at runtime).
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdminRequestAuthorized()) {
    return <AdminLogin />;
  }

  const { leads, storage } = await listLeads();
  const publicExperts = await listPublicExperts();

  // Rank experts for each lead's task (public-safe: no internal contact fields).
  const matchesByLead: Record<string, RankedExpert[]> = {};
  for (const lead of leads) {
    const skills = lead.required_skills ?? [];
    if (lead.category && skills.length > 0) {
      matchesByLead[lead.id] = rankExperts(publicExperts, {
        category: lead.category,
        requiredSkills: skills,
        aiRelevant: lead.ai_relevant,
      }).slice(0, 3);
    } else {
      matchesByLead[lead.id] = [];
    }
  }

  return (
    <AdminLeadsTable
      leads={leads}
      storage={storage}
      protectedMode={isAdminProtected()}
      matchesByLead={matchesByLead}
    />
  );
}
