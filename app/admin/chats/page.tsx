// Admin chats register. Server-rendered list of every saved chat session,
// gated by the httpOnly admin cookie like the other admin pages.
import { listChatSessions } from "@/lib/chatStore";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";
import AdminChatsTable from "@/components/AdminChatsTable";
import AdminLogin from "@/components/AdminLogin";

// Always render fresh (sessions change at runtime).
export const dynamic = "force-dynamic";

export default async function AdminChatsPage() {
  if (!isAdminRequestAuthorized()) {
    return <AdminLogin />;
  }

  const { sessions, storage } = await listChatSessions();
  return <AdminChatsTable sessions={sessions} storage={storage} />;
}
