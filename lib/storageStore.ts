// Chat file/photo persistence in Supabase Storage.
//
// Primary path: the CLIENT uploads files DIRECTLY to Supabase via a short-lived
// signed upload URL minted here (createSignedUpload). This bypasses Vercel's
// ~4.5MB serverless request-body limit entirely, so large photos/PDFs work and
// the /api/chat body stays tiny (it only carries the resulting public URL).
//
// Fallback path: when Supabase is not configured at all (local demo), the
// legacy uploadChatFile() returns a base64 `data:` URL so vision still works.
// Nothing is persisted in that case - same "never crash" philosophy as
// lib/leadStore.ts.
import { getSupabaseAdmin, isSupabaseServerConfigured } from "@/lib/supabaseServer";
import { MAX_BYTES, isImageType } from "@/lib/uploadLimits";
import type { Attachment } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "chat-uploads";

export interface UploadInput {
  buffer: Buffer;
  name: string;
  type: string;
  size: number;
}

// A signed target the client uploads to directly, plus the final public URL.
export interface SignedUpload {
  path: string;
  token: string;
  publicUrl: string;
  name: string;
  type: string;
  size: number;
  isImage: boolean;
}

// Keep only a filesystem/URL-safe slice of the original name; drop the rest.
function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  return cleaned || "file";
}

function objectPath(name: string): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 10);
  return `chat/${year}/${Date.now()}-${rand}-${safeName(name)}`;
}

// Create the public bucket once per server instance (idempotent). Cached so we
// don't hit the API on every upload. "already exists" is a success.
let bucketReady: Promise<void> | null = null;
function ensureBucket(admin: SupabaseClient): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { error } = await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_BYTES,
      });
      if (error && !/exist/i.test(error.message)) {
        // Couldn't create AND it's not an "already exists" race - surface it so
        // the caller can fall back, but don't cache the failure.
        throw new Error(error.message);
      }
    })().catch((e) => {
      bucketReady = null;
      throw e;
    });
  }
  return bucketReady;
}

// Mint a one-time signed upload URL for the client to PUT the file to directly.
// Returns null when Supabase isn't configured (caller uses the base64 path).
export async function createSignedUpload(
  name: string,
  type: string,
  size: number
): Promise<SignedUpload | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseServerConfigured) return null;

  await ensureBucket(admin);
  const path = objectPath(name);

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "could not sign upload");

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(data.path ?? path);
  if (!pub?.publicUrl) throw new Error("no public URL");

  return {
    path: data.path ?? path,
    token: data.token,
    publicUrl: pub.publicUrl,
    name,
    type,
    size,
    isImage: isImageType(type),
  };
}

// Base64 fallback (no Supabase). Returns an inline data-URL attachment so vision
// still works; not persisted. Kept for local/demo use by /api/upload.
export async function uploadChatFile(file: UploadInput): Promise<Attachment> {
  const isImage = isImageType(file.type);
  const admin = getSupabaseAdmin();

  if (admin && isSupabaseServerConfigured) {
    try {
      await ensureBucket(admin);
      const path = objectPath(file.name);
      const { error } = await admin.storage.from(BUCKET).upload(path, file.buffer, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) throw new Error("no public URL returned");
      return { url: data.publicUrl, name: file.name, type: file.type, size: file.size, isImage };
    } catch (e) {
      console.error(
        "[storageStore] upload FAILED -> base64 data-URL fallback (not persisted). reason:",
        e instanceof Error ? e.message : String(e)
      );
    }
  } else {
    console.warn("[storageStore] Supabase not configured -> base64 data-URL (not persisted).");
  }

  const url = `data:${file.type};base64,${file.buffer.toString("base64")}`;
  return { url, name: file.name, type: file.type, size: file.size, isImage };
}
