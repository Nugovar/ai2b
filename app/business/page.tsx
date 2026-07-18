// Client (business) portal entry. Unauthenticated visitors get the email+phone
// login; authed clients get their own requests (status, advice, payment,
// deliverables) with the expert kept anonymous.
import { getAuthedClient } from "@/lib/clientAuth";
import ClientLogin from "@/components/ClientLogin";
import ClientPortal from "@/components/ClientPortal";

// Always render fresh (auth cookie + request state change at runtime).
export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  const client = await getAuthedClient();
  if (!client) {
    return <ClientLogin />;
  }
  return <ClientPortal email={client.email} requests={client.requests} />;
}
