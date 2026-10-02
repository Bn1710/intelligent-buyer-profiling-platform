import { createClient } from "@/lib/supabase/server";
import type { Interaction } from "@/lib/types";
export async function getInteractions(prospectId: string): Promise<Interaction[]> {
  const db = await createClient();
  const { data, error } = await db.from("interactions").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

