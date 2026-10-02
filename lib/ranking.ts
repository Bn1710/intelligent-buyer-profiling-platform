import type { Prospect, Profile } from "./types";
export function prospectScore(prospect: Prospect, profiles: Profile[]) {
 const priority = { negotiating: 3, engaged: 2, new: 1, "closed-won": 0, "closed-lost": 0 }[prospect.status];
 const latest = profiles.find(p => p.prospect_id === prospect.id);
 return priority * Number(latest?.confidence ?? 0.5);
}
export function isPriorityProspect(prospect: Prospect, profile?: Profile) {
 // Highlight only a declared budget; never infer wealth from cultural background.
 const budget = declaredBudgetLowerBound(prospect.budget_range ?? "");
 return budget !== null && budget >= 2_000_000 && Number(profile?.confidence ?? 0) >= 0.7 && !prospect.status.startsWith("closed");
}

function declaredBudgetLowerBound(value: string): number | null {
 // Amounts are MYR in this workspace. Accept RM/MYR explicitly, but never
 // mistake their letters for magnitude suffixes or convert other currencies.
 const text = value.trim().toLowerCase().replace(/^(?:myr|rm)\s*/, "").replace(/\s*(?:myr|rm)$/, "");
 const number = "((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)";
 const unit = "\\s*(million|thousand|m|k)?";
 const match = text.match(new RegExp("^" + number + unit + "(?:\\s*(?:[-–—]|to)\\s*" + number + unit + ")?\\s*\\+?$"));
 if (!match) return null;
 const multiplier = (suffix?: string) => suffix === "m" || suffix === "million" ? 1_000_000 : suffix === "k" || suffix === "thousand" ? 1_000 : 1;
 const amount = (digits: string, suffix?: string) => Number(digits.replaceAll(",", "")) * multiplier(suffix);
 // Shorthand such as "2–3M" shares its suffix only when both numbers have
 // a comparable scale (within a factor of ten). For ambiguous mixed scales
 // such as "500000–2M" in either direction, keep the bare amount in MYR.
 // Use the smaller bound so a range crossing the threshold is not highlighted.
 const first = amount(match[1]);
 const second = match[3] ? amount(match[3]) : 0;
 const sharedUnit = first > 0 && second > 0 && Math.max(first, second) / Math.min(first, second) <= 10;
 const lower = amount(match[1], match[2] ?? (sharedUnit ? match[4] : undefined));
 const result = match[3] ? Math.min(lower, amount(match[3], match[4] ?? (sharedUnit ? match[2] : undefined))) : lower;
 return Number.isFinite(result) ? result : null;
}

