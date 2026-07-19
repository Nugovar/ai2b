// Mints short-lived signed upload URLs so the client can upload chat files
// DIRECTLY to Supabase Storage (bypassing Vercel's ~4.5MB body limit). The
// request body here carries only file metadata (name/type/size), never bytes.
// The SECRET key lives only on the server (see lib/supabaseServer.ts).
import { NextRequest, NextResponse } from "next/server";
import { createSignedUpload, type SignedUpload } from "@/lib/storageStore";
import { getDict, type Lang } from "@/lib/i18n";
import { MAX_BYTES, MAX_FILES, isAllowedType } from "@/lib/uploadLimits";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface FileMeta {
  name: string;
  type: string;
  size: number;
}

export async function POST(req: NextRequest) {
  const lang: Lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "ka";
  const t = getDict(lang).chat;

  const rl = rateLimit(`upload-url:${clientIp(req)}`, 15, 60_000); // 15 / min
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: t.rateLimited },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { files?: FileMeta[] };
    const files = Array.isArray(body.files) ? body.files : [];

    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: t.attachUploadError }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ ok: false, error: t.attachTooMany }, { status: 400 });
    }
    for (const f of files) {
      if (!isAllowedType(f.type)) {
        return NextResponse.json({ ok: false, error: t.attachBadType }, { status: 400 });
      }
      if (typeof f.size === "number" && f.size > MAX_BYTES) {
        return NextResponse.json({ ok: false, error: t.attachTooLarge }, { status: 400 });
      }
    }

    // Try to mint signed targets. If Supabase isn't configured, signal the
    // client to use the base64 fallback route instead.
    const first = await createSignedUpload(files[0].name, files[0].type, files[0].size);
    if (first === null) {
      return NextResponse.json({ ok: true, mode: "fallback" }, { status: 200 });
    }

    const uploads: SignedUpload[] = [first];
    for (let i = 1; i < files.length; i++) {
      const u = await createSignedUpload(files[i].name, files[i].type, files[i].size);
      if (u) uploads.push(u);
    }

    return NextResponse.json({ ok: true, mode: "signed", uploads }, { status: 200 });
  } catch (err) {
    console.error("[api/upload-url] error:", err);
    return NextResponse.json({ ok: false, error: t.attachUploadError }, { status: 500 });
  }
}
