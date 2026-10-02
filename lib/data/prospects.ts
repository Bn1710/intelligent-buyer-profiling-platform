import { createClient } from "@/lib/supabase/server";
import type { Prospect } from "@/lib/types";

export async function listProspects(): Promise<Prospect[]> {
  const db = await createClient();
  const { data, error } = await db.from("prospects").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function getProspect(id: string): Promise<Prospect> {
  const db = await createClient();
  const { data, error } = await db.from("prospects").select("*").eq("id", id).single();
  if (error) throw new Error("Prospect not found or inaccessible.");
  return data;
}
export async function saveProspect(values: Partial<Prospect>, id?: string): Promise<Prospect> {
  const db = await createClient();
  const query = id ? db.from("prospects").update(values).eq("id", id) : db.from("prospects").insert(values);
  const { data, error } = await query.select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteProspect(id: string) {
  const db = await createClient();
  const { error, data } = await db.from("prospects").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Prospect not found or inaccessible.");
}

