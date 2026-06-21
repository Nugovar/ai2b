// Server-side chat file/photo upload endpoint. Accepts multipart/form-data with
// one or more `file` fields, validates type + size, then persists each via the
// storage store (Supabase Storage if configured, base64 data-URL fallback). The
// SECRET key lives only on the server (see lib/supabaseServer.ts).
import { NextRequest, NextResponse } from "next/server";
import { uploadChatFile } from "@/lib/storageStore";
import { getDict, type Lang } from "@/lib/i18n";
import type { Attachment } from "@/lib/types";

export const runtime = "nodejs";

// Keep these in sync with the client-side checks in components/ChatBody.tsx.
const MAX_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_FILES = 4;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function POST(req: NextRequest) {
  // Language only drives the error copy; default to Georgian.
  const langParam = req.nextUrl.searchParams.get("lang");
  const lang: Lang = langParam === "en" ? "en" : "ka";
  const t = getDict(lang).chat;

  try {
    const form = await req.formData();
    const files = form.getAll("file").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: t.attachUploadError }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ ok: false, error: t.attachTooMany }, { status: 400 });
    }

    for (const f of files) {
      if (!ALLOWED.has(f.type)) {
        return NextResponse.json({ ok: false, error: t.attachBadType }, { status: 400 });
      }
      if (f.size > MAX_BYTES) {
        return NextResponse.json({ ok: false, error: t.attachTooLarge }, { status: 400 });
      }
    }

    const attachments: Attachment[] = [];
    for (const f of files) {
      const buffer = Buffer.from(await f.arrayBuffer());
      attachments.push(
        await uploadChatFile({ buffer, name: f.name, type: f.type, size: f.size })
      );
    }

    return NextResponse.json({ ok: true, attachments }, { status: 200 });
  } catch (err) {
    console.error("[api/upload] error:", err);
    return NextResponse.json({ ok: false, error: t.attachUploadError }, { status: 500 });
  }
}
