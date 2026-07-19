// ============================================================================
// Feature flags.
//
// MARKETING_ONLY — TEMPORARY: present the public product as marketing-only.
// When true it changes (and ONLY these, all reversible by flipping to false):
//   1. The chat's initial quick-reply chips -> marketing sub-topics
//      (lib/i18n.ts `chat.marketingChips`, selected in components/ChatProvider).
//   2. The chatbot scope -> marketing only, politely deferring other needs
//      (system-prompt addendum applied in app/api/chat/route.ts).
//   3. The landing "Services" section -> Marketing active, other 4 categories
//      shown as "coming soon" (components/Services.tsx), and a marketing hero
//      badge (components/Hero.tsx).
//
// It does NOT touch the experts directory, the other categories' data, the
// admin, or the matching engine — those stay intact for when we re-expand.
//
// To restore the full 5-category experience: set MARKETING_ONLY = false.
// ============================================================================
export const MARKETING_ONLY = true;

// DEMO_MODE — set AI2B_DEMO=1 to run a fully self-contained walkthrough build:
// the server IGNORES Supabase (getSupabaseAdmin returns null) and uses the
// in-memory store seeded with lib/demoSeed, so every admin feature works and is
// pre-populated with realistic data. Off by default; production never sets it,
// so real data is never affected. Used by the `ai2b-demo` launch config.
export const DEMO_MODE = process.env.AI2B_DEMO === "1";
