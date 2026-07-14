// Pure metrics computation over the leads dataset. No I/O, no Date.now() inside
// (the caller passes `now`) so it stays deterministic and testable. The admin
// dashboard renders whatever this returns.
import type { StoredLead } from "@/lib/leadStore";
import type { PaymentStatus } from "@/lib/types";

export interface BreakdownRow {
  label: string;
  count: number;
}

export interface Metrics {
  total: number;
  last30: number; // leads created in the last 30 days
  funnel: {
    captured: number; // all leads
    assigned: number; // handed to an expert
    done: number; // task completed
    paid: number; // payment received
  };
  paidConversion: number; // paid / total, 0..1
  revenueCollected: number; // sum(amount) where paid
  revenueOutstanding: number; // sum(amount) where invoiced
  pipelineValue: number; // sum(amount) assigned but not yet paid
  byCategory: BreakdownRow[]; // desc by count
  byExpert: BreakdownRow[]; // assignments per expert, desc
  paymentSplit: Record<PaymentStatus, number>;
  aiRelevant: number; // count of AI-relevant tasks
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isAssigned(l: StoredLead): boolean {
  return Boolean(l.assigned_expert_id) || l.status === "in_progress";
}

function amt(l: StoredLead): number {
  return Number.isFinite(l.amount) ? Number(l.amount) : 0;
}

export function computeMetrics(leads: StoredLead[], now: number): Metrics {
  const paymentSplit: Record<PaymentStatus, number> = { unpaid: 0, invoiced: 0, paid: 0 };
  const catMap = new Map<string, number>();
  const expertMap = new Map<string, number>();

  let last30 = 0;
  let assigned = 0;
  let done = 0;
  let paid = 0;
  let revenueCollected = 0;
  let revenueOutstanding = 0;
  let pipelineValue = 0;
  let aiRelevant = 0;

  for (const l of leads) {
    const created = new Date(l.created_at).getTime();
    if (Number.isFinite(created) && now - created <= 30 * DAY_MS) last30++;

    const pay = (["unpaid", "invoiced", "paid"] as PaymentStatus[]).includes(
      l.payment_status as PaymentStatus
    )
      ? (l.payment_status as PaymentStatus)
      : "unpaid";
    paymentSplit[pay]++;

    const a = amt(l);
    if (pay === "paid") {
      paid++;
      revenueCollected += a;
    } else if (pay === "invoiced") {
      revenueOutstanding += a;
    }

    if (isAssigned(l)) {
      assigned++;
      if (pay !== "paid") pipelineValue += a;
    }
    if (l.status === "done") done++;
    if (l.ai_relevant) aiRelevant++;

    const cat = (l.category || l.business_type || "—").trim() || "—";
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);

    if (l.assigned_expert_name) {
      expertMap.set(l.assigned_expert_name, (expertMap.get(l.assigned_expert_name) ?? 0) + 1);
    }
  }

  const toRows = (m: Map<string, number>): BreakdownRow[] =>
    Array.from(m.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

  const total = leads.length;

  return {
    total,
    last30,
    funnel: { captured: total, assigned, done, paid },
    paidConversion: total > 0 ? paid / total : 0,
    revenueCollected,
    revenueOutstanding,
    pipelineValue,
    byCategory: toRows(catMap),
    byExpert: toRows(expertMap),
    paymentSplit,
    aiRelevant,
  };
}
