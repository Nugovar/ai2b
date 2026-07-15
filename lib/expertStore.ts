// Experts directory access. Reads from Supabase (SECRET key, server-only) when
// configured, otherwise from an in-memory fallback seed so the demo works even
// before the SQL is run / if Supabase is unreachable.
//
// PRIVACY: phone/social/notes are INTERNAL. `toPublicExpert` strips them; only
// the admin (server-rendered, behind the gate) ever sees the full record.
//
// DESIGNERS are the first seeded category; the same table/flow extends to
// legal / development / marketing / business consulting later.
import { getSupabaseAdmin, isSupabaseServerConfigured } from "@/lib/supabaseServer";
import type { Expert, PublicExpert } from "@/lib/types";

// In-memory fallback seed (mirrors supabase/experts.sql).
const FALLBACK_DESIGNERS: Expert[] = [
  {
    id: "seed-nino", name: "ნინო კაპანაძე", category: "დიზაინი/ბრენდინგი",
    seniority: "senior", years_experience: 9,
    skill_scores: { logo: 9, branding: 9, poster: 5, social_media: 6, business_card: 7, ui_ux: 4, illustration: 5 },
    ai_skill: 6, tools: ["Illustrator", "Photoshop", "InDesign"], overall_rating: 9.0,
    available: true, city: "თბილისი",
    phone: "+995 599 10 00 01", social: "@nino.brand", notes: "ძლიერი ლოგო/ბრენდინგში; პრემიუმ კლიენტები.",
    email: "nino@ai2b.ge", login_code: "NINO-4821",
  },
  {
    id: "seed-giorgi", name: "გიორგი მჭედლიძე", category: "დიზაინი/ბრენდინგი",
    seniority: "middle", years_experience: 6,
    skill_scores: { logo: 6, branding: 5, poster: 9, social_media: 9, business_card: 6, ui_ux: 4, illustration: 6 },
    ai_skill: 5, tools: ["Photoshop", "Illustrator", "After Effects", "Canva"], overall_rating: 8.2,
    available: true, city: "თბილისი",
    phone: "+995 599 10 00 02", social: "@giorgi.posters", notes: "სოც. მედია და პოსტერები; სწრაფი მიწოდება.",
    email: "giorgi@ai2b.ge", login_code: "GIORGI-7304",
  },
  {
    id: "seed-tamar", name: "თამარ ბერიძე", category: "დიზაინი/ბრენდინგი",
    seniority: "senior", years_experience: 10,
    skill_scores: { logo: 8, branding: 8, poster: 7, social_media: 8, business_card: 7, ui_ux: 7, illustration: 7 },
    ai_skill: 9, tools: ["Figma", "Photoshop", "Illustrator", "After Effects"], overall_rating: 9.2,
    available: true, city: "ბათუმი",
    phone: "+995 599 10 00 03", social: "@tamar.designs", notes: "ყველა მიმართულება; AI-workflow-ის ლიდერი გუნდში.",
    email: "tamar@ai2b.ge", login_code: "TAMAR-1592",
  },
  {
    id: "seed-luka", name: "ლუკა გელაშვილი", category: "დიზაინი/ბრენდინგი",
    seniority: "junior", years_experience: 2,
    skill_scores: { logo: 5, branding: 4, poster: 6, social_media: 6, business_card: 5, ui_ux: 4, illustration: 5 },
    ai_skill: 8, tools: ["Figma", "Canva", "Photoshop"], overall_rating: 7.0,
    available: true, city: "თბილისი",
    phone: "+995 599 10 00 04", social: "@luka.ai.design", notes: "ჯუნიორი, იაფი; ძალიან კარგად იყენებს AI ხელსაწყოებს.",
    email: "luka@ai2b.ge", login_code: "LUKA-6647",
  },
  {
    id: "seed-ana", name: "ანა ხურციძე", category: "დიზაინი/ბრენდინგი",
    seniority: "middle", years_experience: 5,
    skill_scores: { logo: 5, branding: 6, poster: 5, social_media: 6, business_card: 4, ui_ux: 9, illustration: 9 },
    ai_skill: 6, tools: ["Figma", "Procreate", "Illustrator"], overall_rating: 8.5,
    available: true, city: "ქუთაისი",
    phone: "+995 599 10 00 05", social: "@ana.uiux", notes: "UI/UX და ილუსტრაცია; პროდუქტ-დიზაინის გამოცდილება.",
    email: "ana@ai2b.ge", login_code: "ANA-3178",
  },
];

// Backed by globalThis so admin mutations to the fallback (e.g. rotating a
// login_code) are visible across route-handler module layers in dev, mirroring
// leadStore's memoryLeads. In production Supabase is the source of truth and
// this array is never the read path.
const fallbackGlobal = globalThis as unknown as { __ai2bFallbackExperts?: Expert[] };
const fallbackExperts: Expert[] = (fallbackGlobal.__ai2bFallbackExperts ??=
  FALLBACK_DESIGNERS.map((e) => ({ ...e })));

// Strip internal admin-only fields for any client/chat-facing use.
export function toPublicExpert(e: Expert): PublicExpert {
  // Intentionally omit phone, social, notes, and the portal login fields.
  const { phone, social, notes, email, login_code, ...pub } = e;
  void phone; void social; void notes; void email; void login_code;
  return pub;
}

// Full records (incl. internal) — ADMIN/SERVER ONLY.
export async function listExperts(): Promise<{
  experts: Expert[];
  storage: "supabase" | "memory";
}> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { data, error } = await admin
        .from("experts")
        .select("*")
        .order("overall_rating", { ascending: false });
      if (error) throw new Error(error.message);
      if (data && data.length > 0) return { experts: data as Expert[], storage: "supabase" };
      // configured but table empty (SQL not run yet) -> show fallback seed
      return { experts: fallbackExperts, storage: "memory" };
    } catch (e) {
      console.error(
        "[expertStore] DB UNREACHABLE listing experts -> showing SEED fallback. reason:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  return { experts: fallbackExperts, storage: "memory" };
}

// Public (internal-stripped) records for matching / lead-detail use.
export async function listPublicExperts(): Promise<PublicExpert[]> {
  const { experts } = await listExperts();
  return experts.map(toPublicExpert);
}

// Look up a single full expert record by id — SERVER ONLY (used by the expert
// portal to resolve the logged-in expert from their auth cookie).
export async function getExpertById(id: string): Promise<Expert | null> {
  const { experts } = await listExperts();
  return experts.find((e) => e.id === id) ?? null;
}

// Update an expert's portal-login fields (admin-provisioned). Only the provided
// fields are written. Returns true on success. SERVER ONLY (admin-gated caller).
export async function updateExpertLogin(
  id: string,
  fields: { email?: string; login_code?: string }
): Promise<boolean> {
  const patch: Record<string, string | null> = {};
  if (fields.email !== undefined) patch.email = fields.email.trim() || null;
  if (fields.login_code !== undefined) patch.login_code = fields.login_code.trim() || null;
  if (Object.keys(patch).length === 0) return false;

  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("experts").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[expertStore] DB UNREACHABLE updating expert login. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  // In-memory fallback: mutate the seed record so the demo reflects the change
  // for the life of the process.
  const target = fallbackExperts.find((x) => x.id === id);
  if (target) {
    if (fields.email !== undefined) target.email = fields.email.trim() || undefined;
    if (fields.login_code !== undefined) target.login_code = fields.login_code.trim() || undefined;
    return true;
  }
  return false;
}

// Resolve a portal login: match email (case-insensitive, trimmed) AND the
// exact login_code. Returns the full expert on success, else null. SERVER ONLY.
export async function findExpertByLogin(
  email: string,
  code: string
): Promise<Expert | null> {
  const e = (email || "").trim().toLowerCase();
  const c = (code || "").trim();
  if (!e || !c) return null;
  const { experts } = await listExperts();
  return (
    experts.find(
      (x) =>
        (x.email || "").trim().toLowerCase() === e &&
        (x.login_code || "").trim() === c
    ) ?? null
  );
}
