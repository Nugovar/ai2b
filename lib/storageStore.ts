// Chat file/photo persistence with a graceful base64 fallback.
// If Supabase is configured, uploads go to the `chat-uploads` Storage bucket and
// we return a public URL. Otherwise (or on any failure) we return a base64
// `data:` URL so vision still works and the chat never crashes - exactly the
// same "never lose the turn" philosophy as lib/leadStore.ts. The base64 form is
// not persisted anywhere, so it won't show up later in the admin panel.
import { getSupabaseAdmin, isSupabaseServerConfigured } from "@/lib/supabaseServer";
import type { Attachment } from "@/lib/types";

const BUCKET = "chat-uploads";

export interface UploadInput {
  buffer: Buffer;
  name: string;
  type: string;
  size: number;
}

// Keep only a filesystem/URL-safe slice of the original name; drop the rest.
function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  return cleaned || "file";
}

export async function uploadChatFile(file: UploadInput): Promise<Attachment> {
  const isImage = file.type.startsWith("image/");
  const admin = getSupabaseAdmin();

  if (admin && isSupabaseServerConfigured) {
    try {
      const year = new Date().getFullYear();
      const rand = Math.random().toString(36).slice(2, 10);
      const path = `chat/${year}/${Date.now()}-${rand}-${safeName(file.name)}`;

      const { error } = await admin.storage.from(BUCKET).upload(path, file.buffer, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);

      const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) throw new Error("no public URL returned");

      return { url: data.publicUrl, name: file.name, type: file.type, size: file.size, isImage };
    } catch (e) {
      // Bucket missing / DB paused / unreachable -> fall back to base64 so the
      // turn still goes through (vision works, just not persisted).
      console.error(
        "[storageStore] Storage upload FAILED -> base64 data-URL fallback (not persisted). reason:",
        e instanceof Error ? e.message : String(e)
      );
    }
  } else {
    console.warn(
      "[storageStore] Supabase not configured -> using base64 data-URL (not persisted)."
    );
  }

  // Fallback: inline base64 data URL.
  const url = `data:${file.type};base64,${file.buffer.toString("base64")}`;
  return { url, name: file.name, type: file.type, size: file.size, isImage };
}
