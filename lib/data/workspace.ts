import { teamContext } from "./teams";
import type { Workspace } from "@/lib/types";
export async function loadWorkspace(): Promise<Workspace> {
  const { db,user,teams,activeTeamId } = await teamContext();
  const scope = (table: string) => {
    const q = db.from(table).select("*");
    return (activeTeamId ? q.eq("tenant_id",activeTeamId) : q.is("tenant_id",null)).order("created_at", { ascending: false });
  };
  const manager = teams.find(t => t.id === activeTeamId)?.role;
  const [prospects,interactions,profiles,strategies,audit,members,invites] = await Promise.all([
    scope("prospects"),scope("interactions"),scope("prospect_profiles"),scope("strategies"),scope("audit_logs").limit(100),
    activeTeamId ? db.from("team_members").select("*").eq("team_id",activeTeamId).order("created_at") : Promise.resolve({data:[],error:null}),
    activeTeamId && (manager === "owner" || manager === "admin") ? db.from("team_invites").select("id,team_id,role,created_by,expires_at,used_at,revoked_at,created_at").eq("team_id",activeTeamId).order("created_at",{ascending:false}).limit(30) : Promise.resolve({data:[],error:null}),
  ]);
  for (const r of [prospects,interactions,profiles,strategies,audit,members,invites]) if(r.error) throw new Error(r.error.message);
  return { prospects:prospects.data ?? [],interactions:interactions.data ?? [],profiles:profiles.data ?? [],strategies:strategies.data ?? [],audit:audit.data ?? [],teams,activeTeamId,members:members.data ?? [],invites:invites.data ?? [],aiEnabled:!!process.env.OPENAI_API_KEY,user:user ? { id:user.id,email:user.email ?? "Consultant",role:manager ?? "consultant" } : null };
}
