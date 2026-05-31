// Robustly extract the trailing control JSON block from a model completion.
// Tolerates: ```json fences, bare ``` fences, raw trailing {...}, missing JSON.
// Returns the cleaned user-facing text plus a normalized ChatControl.
import type { ChatControl, Phase } from "@/lib/types";

const DEFAULT_CONTROL: ChatControl = {
  phase: "discovery",
  slots: {},
  showLeadForm: false,
  chips: [],
};

function normalizePhase(value: unknown): Phase {
  return value === "advice" || value === "conversion" ? value : "discovery";
}

export function normalizeControl(raw: unknown): ChatControl {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CONTROL };
  const obj = raw as Record<string, unknown>;

  const slots: Record<string, string> = {};
  if (obj.slots && typeof obj.slots === "object") {
    for (const [k, v] of Object.entries(obj.slots as Record<string, unknown>)) {
      if (v != null && String(v).trim()) slots[k] = String(v);
    }
  }

  let chips: string[] = [];
  if (Array.isArray(obj.chips)) {
    chips = obj.chips
      .filter((c) => typeof c === "string" && c.trim())
      .map((c) => (c as string).trim())
      .slice(0, 4);
  }

  // Expert-matching task signal (optional).
  let required_skills: string[] | undefined;
  if (Array.isArray(obj.required_skills)) {
    required_skills = obj.required_skills
      .filter((s) => typeof s === "string" && s.trim())
      .map((s) => (s as string).trim());
  }
  const category =
    typeof obj.category === "string" && obj.category.trim() ? obj.category.trim() : undefined;

  return {
    phase: normalizePhase(obj.phase),
    slots,
    showLeadForm: obj.showLeadForm === true,
    chips,
    category,
    required_skills,
    ai_relevant: obj.ai_relevant === true,
  };
}

export function parseControl(rawText: string): {
  reply: string;
  control: ChatControl;
} {
  if (!rawText) return { reply: "", control: { ...DEFAULT_CONTROL } };

  let reply = rawText;
  let control: ChatControl = { ...DEFAULT_CONTROL };

  // 1) Try a fenced ```json ... ``` (or bare ```) block — prefer the LAST one.
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  const fenceMatches: RegExpExecArray[] = [];
  let fm: RegExpExecArray | null;
  while ((fm = fenceRegex.exec(rawText)) !== null) {
    fenceMatches.push(fm);
  }
  if (fenceMatches.length > 0) {
    const last = fenceMatches[fenceMatches.length - 1];
    const candidate = last[1].trim();
    const parsed = tryParse(candidate);
    if (parsed) {
      control = normalizeControl(parsed);
      // remove that fenced block from the visible text
      reply = rawText.replace(last[0], "").trim();
      return { reply: cleanup(reply), control };
    }
  }

  // 2) Fall back to the last bare {...} object in the text.
  const lastBrace = rawText.lastIndexOf("{");
  if (lastBrace !== -1) {
    const candidate = rawText.slice(lastBrace).trim();
    const parsed = tryParse(candidate);
    if (parsed && ("phase" in (parsed as object) || "slots" in (parsed as object))) {
      control = normalizeControl(parsed);
      reply = rawText.slice(0, lastBrace).trim();
      return { reply: cleanup(reply), control };
    }
  }

  // 3) No parseable control — return text as-is with defaults.
  return { reply: cleanup(reply), control };
}

function tryParse(s: string): unknown | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function cleanup(s: string): string {
  // strip leftover empty fences / trailing whitespace
  return s.replace(/```(?:json)?\s*```/gi, "").trim();
}
