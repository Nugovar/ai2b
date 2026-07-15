// Shared types for the AI2Business chat + leads flow.

export type Role = "user" | "assistant" | "system";

// A file or photo the user attached to a chat message. `url` is a Supabase
// Storage public URL when storage is configured, or a base64 `data:` URL in the
// in-memory fallback (so vision still works without Supabase).
export interface Attachment {
  url: string;
  name: string;
  type: string; // MIME type, e.g. "image/png" or "application/pdf"
  size: number; // bytes
  isImage: boolean; // type.startsWith("image/")
}

export interface ChatMessage {
  role: Role;
  content: string;
  // Files/photos attached to this message (user messages only).
  attachments?: Attachment[];
}

export type Phase = "discovery" | "advice" | "conversion";

// Machine-readable control signal the model emits alongside its prose.
// The server parses it out of the raw completion and never leaks it to the UI text.
export interface ChatControl {
  phase: Phase;
  // Filled context slots, e.g. { business_type: "კაფე", location: "თბილისი" }
  slots: Record<string, string>;
  // When true, the UI should render the lead-capture form.
  showLeadForm: boolean;
  // Optional quick-reply chips suggested by the model for its current turn.
  chips?: string[];
  // Expert-matching task signal (filled once the task is clear). The model
  // emits the expert category + the skills the task requires, plus whether the
  // task specifically calls for AI-driven work.
  category?: string;
  required_skills?: string[];
  ai_relevant?: boolean;
}

export interface ChatApiResponse {
  // Clean assistant text with the control JSON stripped out.
  reply: string;
  control: ChatControl;
}

// Lead captured during the conversion phase.
export interface Lead {
  name: string;
  phone: string;
  email: string;
  business_type?: string;
  summary?: string;
  // All structured context slots collected during discovery.
  slots?: Record<string, string>;
  // The concrete advice the bot gave before the handoff offer.
  advice?: string;
  // Full transcript (user + bot) for this lead.
  conversation?: ChatMessage[];
  // All files/photos the user attached anywhere in the conversation.
  attachments?: Attachment[];
  // Expert-matching task signal captured with the lead (drives admin ranking).
  category?: string;
  required_skills?: string[];
  ai_relevant?: boolean;
  // Assignment + payment workflow (set from the admin panel, not the chat).
  assigned_expert_id?: string;
  assigned_expert_name?: string; // denormalized for display
  payment_status?: PaymentStatus;
  amount?: number; // deal value in GEL (whole lari), set in the admin panel
  // Outcome tracking (closes the input -> action -> outcome loop).
  outcome?: OutcomeStatus;
  // The north-star signal: how usable the AI's brief/advice (the "draft") was
  // when the expert executed the task. Recorded in admin during Phase 1 (manual);
  // becomes expert-reported once experts are in the loop.
  ai_draft_status?: AiDraftStatus;
}

// Payment lifecycle for an assigned task.
export type PaymentStatus = "unpaid" | "invoiced" | "paid";

// Business outcome of a captured lead/task (beyond the workflow status).
export type OutcomeStatus = "pending" | "won" | "lost";

// How the AI's brief/advice performed as an execution "draft". This is the
// metric that decides software- vs agency-margined (AI-draft acceptance rate):
//   accepted = expert used it essentially as-is (software-margined signal)
//   edited   = expert reworked it significantly (partial)
//   rejected = useless, expert started from scratch (agency-margined signal)
export type AiDraftStatus = "unset" | "accepted" | "edited" | "rejected";

// ============================================================================
// Experts directory (skill-based matching). DESIGNERS are the first test
// category; the same shape extends to legal / development / marketing /
// business consulting later (different category + skill keys).
// ============================================================================

export type Seniority = "junior" | "middle" | "senior";

// Internal admin-only fields (phone/social/notes) live here but must NEVER be
// included in any client/chat payload. See PublicExpert for the safe shape.
export interface Expert {
  id: string;
  name: string;
  category: string;
  seniority: Seniority;
  years_experience: number;
  skill_scores: Record<string, number>; // 0-10 per skill
  ai_skill: number; // 0-10, SEPARATE strategic dimension (not a skill, not a tool)
  tools: string[]; // professional apps only (no AI image generators)
  overall_rating: number; // 0-10, tiebreaker only
  available: boolean;
  city?: string;
  // INTERNAL — admin only, never sent to client/chat:
  phone?: string;
  social?: string;
  notes?: string;
  // Expert-portal login (admin-provisioned). `login_code` is the per-expert
  // secret the expert enters with their email to sign in; both are INTERNAL and
  // never leave the server / never appear in any client/chat payload.
  email?: string;
  login_code?: string;
}

// Client/chat-safe expert shape: internal contact + login fields stripped.
export type PublicExpert = Omit<Expert, "phone" | "social" | "notes" | "email" | "login_code">;

// Designer skill taxonomy (the keys used in skill_scores for this category).
export const DESIGNER_SKILLS = [
  "logo",
  "branding",
  "poster",
  "social_media",
  "business_card",
  "ui_ux",
  "illustration",
] as const;
export type DesignerSkill = (typeof DESIGNER_SKILLS)[number];
