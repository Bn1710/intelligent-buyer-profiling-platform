import { z } from "zod";
import { statuses, cultures, sources } from "./types";
const text = z.string().trim().max(5000).default("");
export const idSchema = z.string().uuid();
export const prospectSchema = z.object({ name: z.string().trim().min(1, "Name is required.").max(120), contact_info: text, source: z.enum(sources), cultural_background: z.enum(cultures), budget_range: text, status: z.enum(statuses) });
export const interactionSchema = z.object({ prospect_id: idSchema, consultant_name: z.string().trim().min(1).max(100), interaction_type: z.enum(["call", "meeting", "site-visit", "whatsapp"]), personality_observations: text, intentions: text, objections: text, lifestyle_notes: text, mood_after: z.enum(["positive", "neutral", "negative"]) }).refine(v => [v.personality_observations, v.intentions, v.objections, v.lifestyle_notes].some(Boolean), "Add at least one observation.");
const list = z.array(z.string().trim().min(1).max(2000)).min(1).max(20);
export const profileSchema = z.object({ summary: z.string().trim().min(1).max(5000), socio_economic: z.object({ tier: z.string().trim().min(1).max(200), indicators: list }), investment_objectives: list, behavioral_tendencies: list, lifestyle_aspirations: list, motivations: list });
export const strategySchema = z.object({ pitch_angle: z.string().trim().min(1).max(5000), talking_points: list.min(3), closing_technique: z.string().trim().min(1).max(5000), cultural_considerations: z.string().trim().min(1).max(5000) });
export const reviewSchema = z.enum(["unreviewed", "approved", "rejected"]);

