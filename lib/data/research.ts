import { createClient } from "@/lib/supabase/server";
import { getProspect } from "./prospects";
import type { ProspectSource } from "@/lib/types";
import { eligibleSources, sourceSnapshot } from "@/lib/research";
export async function researchForProfile(prospectId: string) {
 await getProspect(prospectId); const db=await createClient();
 const {data,error}=await db.from("prospect_sources").select("*").eq("prospect_id",prospectId).order("created_at");
 if(error) throw new Error(error.message);
 const selected=eligibleSources((data ?? []) as ProspectSource[]);
 if(selected.length>20) throw new Error("Select at most 20 research sources per profile.");
 return selected.map(sourceSnapshot);
}
