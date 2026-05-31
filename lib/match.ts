// Deterministic, explainable expert ranking for a specific task.
//
// HYBRID design: the MODEL picks the task's `category` + `required_skills` (and
// whether `ai_relevant`); this CODE does the ranking. Pure function, no I/O.
//
// DESIGNERS are the first test category, but nothing here is designer-specific:
// it works for any category whose experts use numeric skill_scores.
import type { PublicExpert, Seniority } from "@/lib/types";

export interface TaskSpec {
  category: string;
  requiredSkills: string[];
  aiRelevant?: boolean;
  city?: string; // optional future geo filter
}

export interface RankedExpert {
  expert: PublicExpert;
  taskScore: number; // average over required skills (+ ai_skill if aiRelevant)
  allAvg: number; // average across ALL of the expert's skill_scores
  // Echoed so the client can render an explainable reason in either language.
  requiredSkills: string[];
  aiRelevant: boolean;
  // When this expert tied another on taskScore, the MACHINE KEY of the criterion
  // that decided its rank (the client maps it to a localized label):
  // all_avg | ai_skill | overall_rating | seniority | years
  tieBreakBy?: string;
}

const SENIORITY_RANK: Record<Seniority, number> = { junior: 1, middle: 2, senior: 3 };

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function allSkillsAvg(e: PublicExpert): number {
  return avg(Object.values(e.skill_scores ?? {}));
}

// Score a single expert against the task.
export function taskScoreFor(e: PublicExpert, task: TaskSpec): number {
  const skillVals = task.requiredSkills.map((s) => Number(e.skill_scores?.[s] ?? 0));
  const parts = task.aiRelevant ? [...skillVals, Number(e.ai_skill ?? 0)] : skillVals;
  return avg(parts);
}

// Ordered comparison: returns negative if a should rank ABOVE b.
// Order: taskScore, then allAvg, then ai_skill, then overall_rating, then
// seniority, then years_experience. Returns the deciding criterion too.
function compare(
  a: PublicExpert,
  b: PublicExpert,
  task: TaskSpec
): { cmp: number; by: string } {
  const ats = taskScoreFor(a, task);
  const bts = taskScoreFor(b, task);
  if (ats !== bts) return { cmp: bts - ats, by: "task_score" };

  const aAll = allSkillsAvg(a);
  const bAll = allSkillsAvg(b);
  if (aAll !== bAll) return { cmp: bAll - aAll, by: "all_avg" };

  if (a.ai_skill !== b.ai_skill) return { cmp: b.ai_skill - a.ai_skill, by: "ai_skill" };

  if (a.overall_rating !== b.overall_rating)
    return { cmp: b.overall_rating - a.overall_rating, by: "overall_rating" };

  const aSen = SENIORITY_RANK[a.seniority] ?? 0;
  const bSen = SENIORITY_RANK[b.seniority] ?? 0;
  if (aSen !== bSen) return { cmp: bSen - aSen, by: "seniority" };

  if (a.years_experience !== b.years_experience)
    return { cmp: b.years_experience - a.years_experience, by: "years" };

  return { cmp: 0, by: "" };
}

export function rankExperts(experts: PublicExpert[], task: TaskSpec): RankedExpert[] {
  // 1) Filter by category + availability (+ city if provided).
  const pool = experts.filter(
    (e) =>
      e.category === task.category &&
      e.available !== false &&
      (!task.city || !e.city || e.city === task.city)
  );

  // 2) Sort deterministically with the ordered tie-break chain.
  const sorted = [...pool].sort((a, b) => compare(a, b, task).cmp);

  // 3) Build explainable rows (language-neutral; the client renders the text).
  return sorted.map((e, i) => {
    const ts = round1(taskScoreFor(e, task));
    const all = round1(allSkillsAvg(e));

    // If this expert tied the one ranked just above on task score, record the
    // machine key of the criterion that broke the tie.
    let tieBreakBy: string | undefined;
    if (i > 0) {
      const prev = sorted[i - 1];
      if (taskScoreFor(prev, task) === taskScoreFor(e, task)) {
        const { by } = compare(prev, e, task);
        if (by) tieBreakBy = by;
      }
    }

    return {
      expert: e,
      taskScore: ts,
      allAvg: all,
      requiredSkills: task.requiredSkills,
      aiRelevant: Boolean(task.aiRelevant),
      tieBreakBy,
    };
  });
}
