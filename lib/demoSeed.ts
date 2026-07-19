// Demo data for co-founder / investor walkthroughs. Loaded into the in-memory
// store ONLY when AI2B_DEMO=1 (see lib/config.ts DEMO_MODE + leadStore). In demo
// mode the app ignores Supabase entirely, so this never touches real data — it's
// a self-contained, fully-working sandbox where every admin feature (assign,
// payment, amount, outcome, AI-draft rating, deliverables) is already populated.
//
// Assignments reference the seeded designer ids from lib/expertStore
// (seed-nino / seed-giorgi / seed-tamar / seed-ana). Dates are fixed strings so
// the seed is deterministic (no churn across runs).
import type { StoredLead } from "@/lib/leadStore";
import type { StoredChatSession } from "@/lib/chatStore";
import type { StoredAiEvent } from "@/lib/aiEvents";

export const DEMO_LEADS: StoredLead[] = [
  {
    id: "demo-1",
    created_at: "2026-07-14T09:12:00.000Z",
    status: "done",
    name: "ნინი ბერიძე",
    phone: "+995 599 21 33 44",
    email: "nini@brew.ge",
    business_type: "კაფე",
    category: "დიზაინი/ბრენდინგი",
    required_skills: ["logo", "branding"],
    ai_relevant: false,
    summary: "ახალი specialty-კაფის ლოგო + ბრენდბუქი.",
    advice:
      "მინიმალისტური wordmark + მარცვლის ნიშანი; თბილი პალიტრა (ყავისფერი/კრემისფერი); მენიუსა და ჭიქებზე გამოსაყენებელი ვერსიები. ბრენდბუქი: ლოგოს ვარიაციები, ფერები, ტიპოგრაფია.",
    assigned_expert_id: "seed-nino",
    assigned_expert_name: "ნინო კაპანაძე",
    payment_status: "paid",
    amount: 1200,
    outcome: "won",
    ai_draft_status: "accepted",
    deliverables: [
      { url: "https://example.com/demo/brew-logo.png", name: "brew-logo-final.png", type: "image/png", size: 482000, isImage: true },
      { url: "https://example.com/demo/brew-brandbook.pdf", name: "brew-brandbook.pdf", type: "application/pdf", size: 1840000, isImage: false },
    ],
  },
  {
    id: "demo-2",
    created_at: "2026-07-13T14:40:00.000Z",
    status: "done",
    name: "გიორგი ტატიშვილი",
    phone: "+995 555 88 12 90",
    email: "g.tati@fitzone.ge",
    business_type: "ფიტნეს-სტუდია",
    category: "დიზაინი/ბრენდინგი",
    required_skills: ["social_media", "poster"],
    ai_relevant: true,
    summary: "სოც. მედია პაკეტი — 12 პოსტის შაბლონი Instagram-ისთვის.",
    advice:
      "ერთიანი grid-ესთეტიკა; 3 შაბლონის ტიპი (აქცია / განრიგი / მოტივაცია); მუქი ფონი + ენერგიული აქცენტი. AI-workflow-ით სწრაფი ვარიაციები.",
    assigned_expert_id: "seed-giorgi",
    assigned_expert_name: "გიორგი მჭედლიძე",
    payment_status: "paid",
    amount: 650,
    outcome: "won",
    ai_draft_status: "edited",
    deliverables: [
      { url: "https://example.com/demo/fit-templates.pdf", name: "instagram-templates.pdf", type: "application/pdf", size: 2200000, isImage: false },
    ],
  },
  {
    id: "demo-3",
    created_at: "2026-07-12T11:05:00.000Z",
    status: "done",
    name: "ანა კვარაცხელია",
    phone: "+995 598 44 22 10",
    email: "ana@lumebeauty.ge",
    business_type: "სილამაზის სალონი",
    category: "დიზაინი/ბრენდინგი",
    required_skills: ["ui_ux", "illustration"],
    ai_relevant: false,
    summary: "ჯავშნის landing-გვერდის UI-კონცეფცია.",
    advice:
      "ერთ-გვერდიანი landing: hero + სერვისები + ჯავშნის ფორმა; რბილი პასტელი; მობილურ-პირველი. ილუსტრირებული აქცენტები სექციებისთვის.",
    assigned_expert_id: "seed-ana",
    assigned_expert_name: "ანა ხურციძე",
    payment_status: "invoiced",
    amount: 900,
    outcome: "pending",
    ai_draft_status: "rejected",
  },
  {
    id: "demo-4",
    created_at: "2026-07-14T16:20:00.000Z",
    status: "in_progress",
    name: "დავით ლომიძე",
    phone: "+995 577 30 99 15",
    email: "davit@greenmarket.ge",
    business_type: "ონლაინ მაღაზია",
    category: "დიზაინი/ბრენდინგი",
    required_skills: ["logo", "business_card"],
    ai_relevant: false,
    summary: "ეკო-პროდუქტების მაღაზიის ლოგო + სავიზიტო.",
    advice:
      "ბუნებრივი, ორგანული ფორმა; მწვანე პალიტრა; ლოგო + სავიზიტოს ორმხრივი დიზაინი. მინიმალიზმი, გადამუშავებადი მასალის ესთეტიკა.",
    assigned_expert_id: "seed-tamar",
    assigned_expert_name: "თამარ ბერიძე",
    payment_status: "unpaid",
    amount: 750,
    outcome: "pending",
    ai_draft_status: "unset",
  },
  {
    id: "demo-5",
    created_at: "2026-07-15T08:02:00.000Z",
    status: "new",
    name: "მარიამ ჩხაიძე",
    phone: "+995 591 12 45 78",
    email: "mariam@dolce.ge",
    business_type: "საკონდიტრო",
    category: "დიზაინი/ბრენდინგი",
    required_skills: ["branding", "poster"],
    ai_relevant: false,
    summary: "საკონდიტროს ბრენდინგი + სადღესასწაულო პოსტერები.",
    advice:
      "ელეგანტური, ხელნაწერი-ტიპოგრაფიის ლოგო; ოქროსფერი აქცენტი; სეზონური პოსტერების სერია. პრემიუმ განცდა.",
    payment_status: "unpaid",
    amount: 0,
    outcome: "pending",
    ai_draft_status: "unset",
  },
  {
    id: "demo-6",
    created_at: "2026-07-15T10:35:00.000Z",
    status: "new",
    name: "ლევან გოგიჩაიშვილი",
    phone: "+995 574 66 00 21",
    email: "levan@urbancuts.ge",
    business_type: "ბარბერშოპი",
    category: "Marketing",
    required_skills: ["social_media"],
    ai_relevant: true,
    summary: "Instagram-ის კონტენტ-სტრატეგია + პირველი კამპანია.",
    advice:
      "ლოკალური targeting; before/after Reels; მუდმივი posting-გრაფიკი. AI-ით hook-ების და caption-ების ვარიაციები.",
    payment_status: "unpaid",
    amount: 0,
    outcome: "pending",
    ai_draft_status: "unset",
  },
  {
    id: "demo-7",
    created_at: "2026-07-11T13:50:00.000Z",
    status: "done",
    name: "სოფო მელაძე",
    phone: "+995 596 77 88 33",
    email: "sopo@petshop.ge",
    business_type: "ცხოველების მაღაზია",
    category: "დიზაინი/ბრენდინგი",
    required_skills: ["logo", "illustration"],
    ai_relevant: false,
    summary: "მხიარული ლოგო + ილუსტრირებული პერსონაჟი.",
    advice:
      "მეგობრული talismani (ცხოველი); ნათელი ფერები; ლოგო + პერსონაჟის რამდენიმე პოზა შეფუთვისთვის და სოც. მედიისთვის.",
    assigned_expert_id: "seed-ana",
    assigned_expert_name: "ანა ხურციძე",
    payment_status: "paid",
    amount: 820,
    outcome: "won",
    ai_draft_status: "accepted",
    deliverables: [
      { url: "https://example.com/demo/pet-mascot.png", name: "mascot-poses.png", type: "image/png", size: 690000, isImage: true },
    ],
  },
  {
    id: "demo-8",
    created_at: "2026-07-10T09:25:00.000Z",
    status: "done",
    name: "ირაკლი ნადირაძე",
    phone: "+995 599 03 14 27",
    email: "irakli@techsupport.ge",
    business_type: "IT სერვისი",
    category: "დიზაინი/ბრენდინგი",
    required_skills: ["logo", "ui_ux"],
    ai_relevant: false,
    summary: "B2B ბრენდის ლოგო + პრეზენტაციის შაბლონი.",
    advice:
      "სანდო, ტექნოლოგიური wordmark; ლურჯი პალიტრა; slide-master შაბლონი გაყიდვების დეკებისთვის.",
    assigned_expert_id: "seed-tamar",
    assigned_expert_name: "თამარ ბერიძე",
    payment_status: "invoiced",
    amount: 1400,
    outcome: "lost",
    ai_draft_status: "edited",
  },
];

// Demo chat sessions for the admin "Chats" tab: one converted to a lead, one
// dropped off at the advice phase (shows the lost-lead-recovery value).
export const DEMO_CHATS: StoredChatSession[] = [
  {
    id: "demo-chat-converted-1",
    created_at: "2026-07-14T09:02:00.000Z",
    updated_at: "2026-07-14T09:10:00.000Z",
    lang: "ka",
    phase: "conversion",
    lead_captured: true,
    messages: [
      { role: "assistant", content: "გამარჯობა! რაში დაგეხმაროთ?" },
      { role: "user", content: "ახალი კაფე ვხსნი და ლოგო მჭირდება" },
      { role: "assistant", content: "მშვენიერია! როგორი კაფეა და სად?" },
      { role: "user", content: "specialty ყავა, ვაკეში" },
      {
        role: "assistant",
        content:
          "გირჩევთ მინიმალისტურ wordmark-ს მარცვლის ნიშნით, თბილი პალიტრით — პრემიუმ specialty განცდისთვის. დაგაკავშიროთ ბრენდინგის ექსპერტთან?",
      },
      { role: "user", content: "კი, მინდა" },
    ],
  },
  {
    id: "demo-chat-dropped-1",
    created_at: "2026-07-15T11:20:00.000Z",
    updated_at: "2026-07-15T11:26:00.000Z",
    lang: "ka",
    phase: "advice",
    lead_captured: false,
    messages: [
      { role: "assistant", content: "გამარჯობა! რაში დაგეხმაროთ?" },
      { role: "user", content: "სასტუმრო მაქვს ყაზბეგში, ჯავშნები ცოტაა" },
      { role: "assistant", content: "სეზონურად როგორია დატვირთვა და რომელ არხებს იყენებთ?" },
      { role: "user", content: "ძირითადად Booking, სოც. მედია თითქმის არ გვაქვს" },
      {
        role: "assistant",
        content:
          "პირდაპირი ჯავშნების გასაზრდელად: Instagram-ის ვიზუალური პროფილი + გეო-targeted Meta კამპანია + Google Business პროფილის გაძლიერება. ეს Booking-ის საკომისიოსაც შეამცირებს.",
      },
    ],
  },
];

// Demo AI Activity Log events: 12 distinct simulated users/sessions across all
// 4 event types, so the admin "AI Activity" tab is populated the moment it's
// opened. Reuses DEMO_LEADS ids (routing + expert-feedback events) and
// DEMO_CHATS ids (chat technical events), plus a few new session ids for
// error-path variety. Fixed timestamps, same convention as DEMO_LEADS/DEMO_CHATS.
export const DEMO_AI_EVENTS: StoredAiEvent[] = [
  {
    id: "evt-demo-01",
    created_at: "2026-07-10T09:25:45.000Z",
    type: "match_decision",
    ref_id: "demo-8",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["logo", "ui_ux"], ai_relevant: false },
  },
  {
    id: "evt-demo-02",
    created_at: "2026-07-10T14:05:00.000Z",
    type: "draft_rated",
    ref_id: "demo-8",
    payload: { rating: "edited", expert_id: "seed-tamar" },
  },
  {
    id: "evt-demo-03",
    created_at: "2026-07-11T13:50:35.000Z",
    type: "match_decision",
    ref_id: "demo-7",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["logo", "illustration"], ai_relevant: false },
  },
  {
    id: "evt-demo-04",
    created_at: "2026-07-11T19:20:00.000Z",
    type: "draft_rated",
    ref_id: "demo-7",
    payload: { rating: "accepted", expert_id: "seed-ana" },
  },
  {
    id: "evt-demo-05",
    created_at: "2026-07-12T11:05:25.000Z",
    type: "match_decision",
    ref_id: "demo-3",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["ui_ux", "illustration"], ai_relevant: false },
  },
  {
    id: "evt-demo-06",
    created_at: "2026-07-12T16:45:00.000Z",
    type: "draft_rated",
    ref_id: "demo-3",
    payload: { rating: "rejected", expert_id: "seed-ana" },
  },
  {
    id: "evt-demo-07",
    created_at: "2026-07-13T14:40:20.000Z",
    type: "match_decision",
    ref_id: "demo-2",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["social_media", "poster"], ai_relevant: true },
  },
  {
    id: "evt-demo-08",
    created_at: "2026-07-13T18:10:00.000Z",
    type: "draft_rated",
    ref_id: "demo-2",
    payload: { rating: "edited", expert_id: "seed-giorgi" },
  },
  {
    id: "evt-demo-09",
    created_at: "2026-07-13T20:15:10.000Z",
    type: "chat_error",
    ref_id: "demo-chat-quick-1",
    payload: { error_kind: "timeout", message: "Request timed out after 15000ms", model: "gpt-4o-mini" },
  },
  {
    id: "evt-demo-10",
    created_at: "2026-07-14T09:02:40.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-converted-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1450, tokens_in: 620, tokens_out: 180,
      cost_estimate: 0.000201, lang: "ka", phase: "discovery",
    },
  },
  {
    id: "evt-demo-11",
    created_at: "2026-07-14T09:06:10.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-converted-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1680, tokens_in: 810, tokens_out: 210,
      cost_estimate: 0.000248, lang: "ka", phase: "advice",
    },
  },
  {
    id: "evt-demo-12",
    created_at: "2026-07-14T09:09:50.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-converted-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1120, tokens_in: 960, tokens_out: 140,
      cost_estimate: 0.000228, lang: "ka", phase: "conversion",
    },
  },
  {
    id: "evt-demo-13",
    created_at: "2026-07-14T09:12:30.000Z",
    type: "match_decision",
    ref_id: "demo-1",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["logo", "branding"], ai_relevant: false },
  },
  {
    id: "evt-demo-14",
    created_at: "2026-07-14T15:40:00.000Z",
    type: "draft_rated",
    ref_id: "demo-1",
    payload: { rating: "accepted", expert_id: "seed-nino" },
  },
  {
    id: "evt-demo-15",
    created_at: "2026-07-14T16:20:15.000Z",
    type: "match_decision",
    ref_id: "demo-4",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["logo", "business_card"], ai_relevant: false },
  },
  {
    id: "evt-demo-16",
    created_at: "2026-07-15T08:02:40.000Z",
    type: "match_decision",
    ref_id: "demo-5",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["branding", "poster"], ai_relevant: false },
  },
  {
    id: "evt-demo-17",
    created_at: "2026-07-15T10:30:00.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-urbancuts-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1580, tokens_in: 700, tokens_out: 190,
      cost_estimate: 0.000219, lang: "ka", phase: "discovery",
    },
  },
  {
    id: "evt-demo-18",
    created_at: "2026-07-15T10:33:20.000Z",
    type: "chat_error",
    ref_id: "demo-chat-urbancuts-1",
    payload: { error_kind: "rate_limit", message: "429 Too Many Requests", model: "gpt-4o-mini" },
  },
  {
    id: "evt-demo-19",
    created_at: "2026-07-15T10:35:20.000Z",
    type: "match_decision",
    ref_id: "demo-6",
    payload: { category: "Marketing", required_skills: ["social_media"], ai_relevant: true },
  },
  {
    id: "evt-demo-20",
    created_at: "2026-07-15T11:20:35.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-dropped-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1390, tokens_in: 540, tokens_out: 160,
      cost_estimate: 0.000177, lang: "ka", phase: "discovery",
    },
  },
  {
    id: "evt-demo-21",
    created_at: "2026-07-15T11:25:40.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-dropped-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 2050, tokens_in: 900, tokens_out: 230,
      cost_estimate: 0.000273, lang: "ka", phase: "advice",
    },
  },
];
