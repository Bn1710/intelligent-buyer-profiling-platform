export const statuses = ["new", "engaged", "negotiating", "closed-won", "closed-lost"] as const;
export const cultures = ["Malay", "Malay-Chinese", "Malay-Indian", "Mainland Chinese"] as const;
export const sources = ["walk-in", "referral", "social", "press"] as const;
export type Status = typeof statuses[number];
export type Review = "unreviewed" | "approved" | "rejected";
export type Prospect = { id: string; user_id: string | null; name: string; contact_info: string | null; source: string | null; cultural_background: string | null; budget_range: string | null; status: Status; created_at: string };
export type Interaction = { id: string; prospect_id: string; consultant_name: string | null; interaction_type: string; personality_observations: string; intentions: string; objections: string; lifestyle_notes: string; mood_after: string; created_at: string };
export type Profile = { id: string; prospect_id: string; summary: string; socio_economic: { tier: string; indicators: string[] }; investment_objectives: string[]; behavioral_tendencies: string[]; lifestyle_aspirations: string[]; motivations: string[]; source: string; confidence: number; review_status: Review; created_at: string };
export type Strategy = { id: string; prospect_id: string; profile_id: string; pitch_angle: string; talking_points: string[]; closing_technique: string; cultural_considerations: string; source: string; confidence: number; review_status: Review; created_at: string };
export type Audit = { id: string; actor: string; action: string; target_id: string; target_type: string; metadata: Record<string, unknown>; created_at: string };
export type Workspace = { prospects: Prospect[]; interactions: Interaction[]; profiles: Profile[]; strategies: Strategy[]; audit: Audit[]; aiEnabled: boolean; user: { id: string; email: string; role: string } | null };


