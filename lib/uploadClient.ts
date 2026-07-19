// Shared browser-side file upload. Same two-path strategy the chat uses:
// primary = mint signed URLs (POST /api/upload-url) and upload DIRECTLY to
// Supabase Storage from the browser (bypasses Vercel's ~4.5MB body limit);
// fallback = POST the bytes to /api/upload for a base64 data-URL when Supabase
// isn't configured. Extracted so the expert portal reuses it verbatim.
//
// (ChatProvider keeps its own inline copy to avoid churn on the live chat; this
// module is the canonical version for new call sites.)
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { Attachment } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

interface SignedUploadResp {
  ok: boolean;
  mode?: "signed" | "fallback";
  uploads?: {
    path: string;
    token: string;
    publicUrl: string;
    name: string;
    type: string;
    size: number;
    isImage: boolean;
  }[];
  error?: string;
}

// Throws on failure so the caller can surface a localized error.
export async function uploadFiles(
  files: File[],
  lang: Lang,
  errMsg: string
): Promise<Attachment[]> {
  const res = await fetch(`/api/upload-url?lang=${lang}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    }),
  });
  const data = (await res.json()) as SignedUploadResp;
  if (!data.ok) throw new Error(data.error ?? errMsg);

  // Direct-to-Supabase signed upload.
  if (data.mode === "signed" && data.uploads) {
    const sb = getSupabaseBrowser();
    if (!sb) throw new Error(errMsg);
    const out: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const u = data.uploads[i];
      const { error } = await sb.storage
        .from("chat-uploads")
        .uploadToSignedUrl(u.path, u.token, files[i], { contentType: files[i].type });
      if (error) throw new Error(errMsg);
      out.push({ url: u.publicUrl, name: u.name, type: u.type, size: u.size, isImage: u.isImage });
    }
    return out;
  }

  // Fallback: base64 via the server (small files; demo without Supabase).
  const form = new FormData();
  files.forEach((f) => form.append("file", f));
  const fb = await fetch(`/api/upload?lang=${lang}`, { method: "POST", body: form });
  const fbData = (await fb.json()) as { ok: boolean; attachments?: Attachment[]; error?: string };
  if (!fbData.ok || !fbData.attachments) throw new Error(fbData.error ?? errMsg);
  return fbData.attachments;
}
