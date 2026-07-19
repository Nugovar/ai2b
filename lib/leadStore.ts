// Lead persistence with a graceful in-memory fallback.
// If Supabase is configured, leads go to the `leads` table; otherwise they are
// kept in a module-level array so the demo never crashes. A clear console
// warning is logged when the fallback is used.
import { getSupabaseAdmin, isSupabaseServerConfigured } from "@/lib/supabaseServer";
import type { Lead, PaymentStatus, OutcomeStatus, AiDraftStatus } from "@/lib/types";

export interface StoredLead extends Lead {
  id: string;
  created_at: string;
  status: string;
}

export type LeadStatus = "new" | "in_progress" | "done";

// In-memory store (resets on server restart - fine for a demo).
// Backed by globalThis so the SAME array is shared across all server module
// layers (route handlers vs. server components) and survives dev HMR. Without
// this, a lead written by /api/lead might not be visible to the /admin page.
const globalStore = globalThis as unknown as { __ai2bMemoryLeads?: StoredLead[] };
const memoryLeads: StoredLead[] = (globalStore.__ai2bMemoryLeads ??= []);

export async function saveLead(
  lead: Lead
): Promise<{ ok: boolean; id: string; storage: "supabase" | "memory" }> {
  const admin = getSupabaseAdmin();

  if (admin && isSupabaseServerConfigured) {
    try {
      const { data, error } = await admin
        .from("leads")
        .insert({
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          business_type: lead.business_type ?? null,
          summary: lead.summary ?? null,
          slots: lead.slots ?? null,
          advice: lead.advice ?? null,
          conversation: lead.conversation ?? null,
          category: lead.category ?? null,
          required_skills: lead.required_skills ?? null,
          ai_relevant: lead.ai_relevant ?? false,
          attachments: lead.attachments ?? null,
          status: "new",
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return { ok: true, id: data.id as string, storage: "supabase" };
    } catch (e) {
      // DB paused/unreachable/error -> never lose the lead, fall back to memory.
      console.error(
        "[leadStore] DB UNREACHABLE saving lead -> IN-MEMORY fallback (will not persist). reason:",
        e instanceof Error ? e.message : String(e)
      );
    }
  } else {
    console.warn(
      "[leadStore] Supabase not configured -> saving lead to IN-MEMORY store (will not persist)."
    );
  }

  // Fallback: in-memory.
  const stored: StoredLead = {
    ...lead,
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    status: "new",
  };
  memoryLeads.push(stored);
  return { ok: true, id: stored.id, storage: "memory" };
}

// Exposed for a potential admin/debug view of in-memory leads.
export function getMemoryLeads(): StoredLead[] {
  return memoryLeads;
}

// List all leads, newest first. Reads from Supabase when configured, otherwise
// from the in-memory fallback. Never throws.
export async function listLeads(): Promise<{
  leads: StoredLead[];
  storage: "supabase" | "memory";
}> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { data, error } = await admin
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return { leads: (data ?? []) as StoredLead[], storage: "supabase" };
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE listing leads -> showing IN-MEMORY fallback. reason:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  // Fallback: in-memory, newest first.
  return { leads: [...memoryLeads].reverse(), storage: "memory" };
}

// Delete a lead by id. Returns true on success. Supabase when configured,
// otherwise the in-memory store. Admin-only (callers must verify the gate).
export async function deleteLead(id: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("leads").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE deleting lead. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const idx = memoryLeads.findIndex((l) => l.id === id);
  if (idx >= 0) {
    memoryLeads.splice(idx, 1);
    return true;
  }
  return false;
}

// Update a lead's status. Returns true on success.
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("leads").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE updating status. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const lead = memoryLeads.find((l) => l.id === id);
  if (lead) {
    lead.status = status;
    return true;
  }
  return false;
}

// Assign a lead to an expert (or clear the assignment when expertId is empty).
// Auto-moves a still-"new" lead to "in_progress" so status reflects reality.
export async function assignLeadExpert(
  id: string,
  expertId: string,
  expertName: string
): Promise<boolean> {
  const assigning = Boolean(expertId);
  const patch: Record<string, unknown> = {
    assigned_expert_id: assigning ? expertId : null,
    assigned_expert_name: assigning ? expertName : null,
  };

  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      // Only promote status when assigning and the lead is still "new".
      if (assigning) {
        const { data: cur } = await admin.from("leads").select("status").eq("id", id).single();
        if (cur?.status === "new") patch.status = "in_progress";
      }
      const { error } = await admin.from("leads").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE assigning expert. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const lead = memoryLeads.find((l) => l.id === id);
  if (lead) {
    lead.assigned_expert_id = assigning ? expertId : undefined;
    lead.assigned_expert_name = assigning ? expertName : undefined;
    if (assigning && lead.status === "new") lead.status = "in_progress";
    return true;
  }
  return false;
}

// Update a lead's deal amount (GEL, whole lari). Returns true on success.
export async function updateLeadAmount(id: string, amount: number): Promise<boolean> {
  const safe = Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0;
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("leads").update({ amount: safe }).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE updating amount. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const lead = memoryLeads.find((l) => l.id === id);
  if (lead) {
    lead.amount = safe;
    return true;
  }
  return false;
}

// Update a lead's outcome and/or AI-draft-acceptance signal. Only the provided
// fields are written. Returns true on success.
export async function updateLeadOutcome(
  id: string,
  fields: { outcome?: OutcomeStatus; ai_draft_status?: AiDraftStatus }
): Promise<boolean> {
  const patch: Record<string, string> = {};
  if (fields.outcome) patch.outcome = fields.outcome;
  if (fields.ai_draft_status) patch.ai_draft_status = fields.ai_draft_status;
  if (Object.keys(patch).length === 0) return false;

  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("leads").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE updating outcome. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const lead = memoryLeads.find((l) => l.id === id);
  if (lead) {
    if (fields.outcome) lead.outcome = fields.outcome;
    if (fields.ai_draft_status) lead.ai_draft_status = fields.ai_draft_status;
    return true;
  }
  return false;
}

// Update a lead's payment status. Returns true on success.
export async function updatePaymentStatus(id: string, payment: PaymentStatus): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("leads").update({ payment_status: payment }).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE updating payment. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const lead = memoryLeads.find((l) => l.id === id);
  if (lead) {
    lead.payment_status = payment;
    return true;
  }
  return false;
}
