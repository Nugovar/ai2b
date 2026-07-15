// Expert portal entry. Server-rendered and gated by the per-expert httpOnly
// cookie: unauthenticated visitors get the login form; authed experts get their
// own task feed (only leads assigned to them, client PII stripped).
import { getAuthedExpert } from "@/lib/expertAuth";
import { listLeadsForExpert } from "@/lib/leadStore";
import ExpertLogin from "@/components/ExpertLogin";
import ExpertPortal from "@/components/ExpertPortal";

// Always render fresh (auth cookie + tasks change at runtime).
export const dynamic = "force-dynamic";

export default async function ExpertPage() {
  const expert = await getAuthedExpert();
  if (!expert) {
    return <ExpertLogin />;
  }

  const { tasks } = await listLeadsForExpert(expert.id);
  return <ExpertPortal expertName={expert.name} tasks={tasks} />;
}
