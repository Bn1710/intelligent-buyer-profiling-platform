import type { Prospect, Profile } from "./types";
export function prospectScore(prospect: Prospect, profiles: Profile[]) {
 const priority = { negotiating: 3, engaged: 2, new: 1, "closed-won": 0, "closed-lost": 0 }[prospect.status];
 const latest = profiles.find(p => p.prospect_id === prospect.id);
 return priority * Number(latest?.confidence ?? 0.5);
}
export function isPriorityProspect(prospect: Prospect, profile?: Profile) {
 // Highlight only a declared budget; never infer wealth from cultural background.
 const matches = (prospect.budget_range ?? "").match(/(\d+(?:\.\d+)?)\s*(?:m|million)/i);
 return !!matches && Number(matches[1]) >= 2 && Number(profile?.confidence ?? 0) >= 0.7 && !prospect.status.startsWith("closed");
}

