import { createClient } from "@/lib/supabase/server";
import { getProspect } from "@/lib/data/prospects";
import { getInteractions } from "@/lib/data/interactions";
import { researchForProfile } from "@/lib/data/research";
import { buildProfile } from "@/lib/ai/profile";
import { buildStrategy } from "@/lib/ai/strategy";
import type { Profile } from "@/lib/types";
export async function generate_profile(prospectId: string) {
  const prospect = await getProspect(prospectId);
  const interactions = await getInteractions(prospectId);
  const research = await researchForProfile(prospectId);
  const result = await buildProfile(prospect, interactions, research);
  const db = await createClient();
  const { data, error } = await db.from("prospect_profiles").insert({ ...result, prospect_id: prospectId, user_id: prospect.user_id, review_status: "unreviewed" }).select().single();
  if (error) throw new Error("Profile could not be saved: " + error.message);
  return data;
}
export async function generate_strategy(prospectId: string) {
  const prospect = await getProspect(prospectId);
  const db = await createClient();
  const { data: profile, error: lookup } = await db.from("prospect_profiles").select("*").eq("prospect_id", prospectId).eq("review_status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lookup) throw new Error(lookup.message);
  if (!profile) throw new Error("Approve a profile first.");
  const result = await buildStrategy(prospect, profile as Profile);
  const { data, error } = await db.from("strategies").insert({ ...result, prospect_id: prospectId, profile_id: profile.id, user_id: prospect.user_id, review_status: "unreviewed" }).select().single();
  if (error) throw new Error("Strategy could not be saved: " + error.message);
  return data;
}
export async function suggest_status(prospectId: string) {
  await getProspect(prospectId);
  const db = await createClient();
  const { data, error } = await db.rpc("suggest_status", { p_id: prospectId });
  if (error) throw new Error(error.message);
  return data;
}
