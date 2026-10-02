import type { Prospect, Interaction } from "@/lib/types";
import { profileSchema } from "@/lib/validation";
import { profileDraft, profileConfidence } from "./rules";
import { structuredOutput } from "./llm";
export async function buildProfile(prospect: Prospect, interactions: Interaction[]) {
  if (!interactions.length) throw new Error("Log at least one interaction before generating a profile.");
  try {
    const generated = await structuredOutput(profileSchema, 'Return {summary:string,socio_economic:{tier:string,indicators:string[]},investment_objectives:string[],behavioral_tendencies:string[],lifestyle_aspirations:string[],motivations:string[]}. Include all five dimensions; label missing evidence as unknown.', { prospect, interactions });
    return { ...(generated?.value ?? profileDraft(prospect, interactions)), source: generated?.source ?? "rules-assisted-manual-draft", confidence: profileConfidence(interactions.length) };
  } catch {
    return { ...profileDraft(prospect, interactions), source: "rules-assisted-manual-draft:ai-unavailable", confidence: profileConfidence(interactions.length) };
  }
}

