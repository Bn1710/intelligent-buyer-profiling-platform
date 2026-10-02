import type { Prospect, Profile } from "@/lib/types";
import { strategySchema } from "@/lib/validation";
import { strategyDraft } from "./rules";
import { structuredOutput } from "./llm";
export async function buildStrategy(prospect: Prospect, profile: Profile) {
  if (profile.review_status !== "approved") throw new Error("Approve a profile first.");
  try {
    const generated = await structuredOutput(strategySchema, 'Return {pitch_angle:string,talking_points:string[] (at least three),closing_technique:string,cultural_considerations:string}. Use an ethical, relationship-first approach grounded in the approved profile.', { prospect, profile });
    return { ...(generated?.value ?? strategyDraft(prospect, profile)), source: generated?.source ?? "rules-assisted-manual-draft", confidence: Number((Number(profile.confidence) * 0.95).toFixed(3)) };
  } catch {
    return { ...strategyDraft(prospect, profile), source: "rules-assisted-manual-draft:ai-unavailable", confidence: Number((Number(profile.confidence) * 0.95).toFixed(3)) };
  }
}

