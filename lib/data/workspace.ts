import { createClient } from "@/lib/supabase/server";
import { listProspects } from "./prospects";
import type { Workspace } from "@/lib/types";
export async function loadWorkspace(): Promise<Workspace> {
  const db = await createClient();
  const [prospects, interactions, profiles, strategies, audit] = await Promise.all([
    listProspects(),
    db.from("interactions").select("*").order("created_at", { ascending: false }),
    db.from("prospect_profiles").select("*").order("created_at", { ascending: false }),
    db.from("strategies").select("*").order("created_at", { ascending: false }),
    db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  for (const result of [interactions, profiles, strategies, audit]) if (result.error) throw new Error(result.error.message);
  return { prospects, interactions: interactions.data ?? [], profiles: profiles.data ?? [], strategies: strategies.data ?? [], audit: audit.data ?? [], aiEnabled: !!process.env.OPENAI_API_KEY };
}

