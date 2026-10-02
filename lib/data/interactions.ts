import { createClient } from "@/lib/supabase/server";
import type { Interaction } from "@/lib/types";
export async function getInteractions(prospectId: string): Promise<Interaction[]> {
  const db = await createClient();
  const { data, error } = await db.from("interactions").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function saveInteraction(values: Omit<Interaction, "id" | "created_at"> & { user_id?: string | null }, id?: string): Promise<Interaction> {
  const db = await createClient();
  if (id) {
    const { data: existing, error } = await db.from("interactions").select("prospect_id").eq("id", id).single();
    if (error || existing?.prospect_id !== values.prospect_id) throw new Error("Interaction does not belong to this prospect.");
  }
  const query = id ? db.from("interactions").update(values).eq("id", id) : db.from("interactions").insert(values);
  const { data, error } = await query.select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteInteraction(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("interactions").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Interaction not found or inaccessible.");
}

