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
    phone: "+995 599 10 00 01", social: "@nino.brand", notes: "ძლიერი ლოგო/ბრენდინგში; პრემიум კლიენტები.",
  },
  {
    id: "seed-giorgi", name: "გიორგი მჭედლიძე", category: "დიზაინი/ბრენდინგი",
    seniority: "middle", years_experience: 6,
    skill_scores: { logo: 6, branding: 5, poster: 9, social_media: 9, business_card: 6, ui_ux: 4, illustration: 6 },
    ai_skill: 5, tools: ["Photoshop", "Illustrator", "After Effects", "Canva"], overall_rating: 8.2,
    available: true, city: "თბილისი",
    phone: "+995 599 10 00 02", social: "@giorgi.posters", notes: "სოც. მედია და პოსტერები; სწრაფი მიწოდება.",
  },
  {
    id: "seed-tamar", name: "თამარ ბერიძე", category: "დიზაინი/ბრენდინგი",
    seniority: "senior", years_experience: 10,
    skill_scores: { logo: 8, branding: 8, poster: 7, social_media: 8, business_card: 7, ui_ux: 7, illustration: 7 },
    ai_skill: 9, tools: ["Figma", "Photoshop", "Illustrator", "After Effects"], overall_rating: 9.2,
    available: true, city: "ბათუმი",
    phone: "+995 599 10 00 03", social: "@tamar.designs", notes: "ყველა მიმართულება; AI-workflow-ის ლიდერი გუნდში.",
  },
  {
    id: "seed-luka", name: "ლუკა გელაშვილი", category: "დიზაინი/ბრენდინგი",
    seniority: "junior", years_experience: 2,
    skill_scores: { logo: 5, branding: 4, poster: 6, social_media: 6, business_card: 5, ui_ux: 4, illustration: 5 },
    ai_skill: 8, tools: ["Figma", "Canva", "Photoshop"], overall_rating: 7.0,
    available: true, city: "თბილისი",
    phone: "+995 599 10 00 04", social: "@luka.ai.design", notes: "ჯუნიორი, იაფი; ძალიან კარგად იყენებს AI ხელსაწყოებს.",
  },
  {
    id: "seed-ana", name: "ანა ხურციძე", category: "დიზაინი/ბრენდინგი",
    seniority: "middle", years_experience: 5,
    skill_scores: { logo: 5, branding: 6, poster: 5, social_media: 6, business_card: 4, ui_ux: 9, illustration: 9 },
    ai_skill: 6, tools: ["Figma", "Procreate", "Illustrator"], overall_rating: 8.5,
    available: true, city: "ქუთაისი",
    phone: "+995 599 10 00 05", social: "@ana.uiux", notes: "UI/UX და ილუსტრაცია; პროდუქტ-დიზაინის გამოცდილება.",
  },
];

// Strip internal admin-only fields for any client/chat-facing use.
export function toPublicExpert(e: Expert): PublicExpert {
  // Intentionally omit phone, social, notes.
  const { phone, social, notes, ...pub } = e;
  void phone; void social; void notes;
  return pub;
}

// Full records (incl. internal) — ADMIN/SERVER ONLY.
export async function listExperts(): Promise<{
  experts: Expert[];
  storage: "supabase" | "memory";
}> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    const { data, error } = await admin
      .from("experts")
      .select("*")
      .order("overall_rating", { ascending: false });
    if (error) {
      console.error("[expertStore] Supabase list failed, falling back to seed:", error.message);
    } else if (data && data.length > 0) {
      return { experts: data as Expert[], storage: "supabase" };
    } else {
      // configured but table empty (SQL not run yet) -> show fallback seed
      return { experts: FALLBACK_DESIGNERS, storage: "memory" };
    }
  }
  return { experts: FALLBACK_DESIGNERS, storage: "memory" };
}

// Public (internal-stripped) records for matching / lead-detail use.
export async function listPublicExperts(): Promise<PublicExpert[]> {
  const { experts } = await listExperts();
  return experts.map(toPublicExpert);
}
