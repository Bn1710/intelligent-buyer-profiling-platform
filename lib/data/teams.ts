import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";
export const TEAM_COOKIE = "aira-team";
export async function teamContext() {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError && user) throw new Error(authError.message);
  if (!user) return { db, user: null, teams: [] as Team[], activeTeamId: null as string | null };
  const { data: personalId, error: personalError } = await db.rpc("ensure_personal_team");
  if (personalError) throw new Error(personalError.message);
  const [{ data: rows, error }, { data: memberships, error: memberError }] = await Promise.all([
    db.from("teams").select("*").order("created_at"),
    db.from("team_members").select("team_id,role").eq("user_id", user.id),
  ]);
  if (error || memberError) throw new Error(error?.message ?? memberError?.message);
  const teams: Team[] = (rows ?? []).map(t => ({ ...t, role: memberships?.find(m => m.team_id === t.id)?.role ?? "member" }));
  const selected = (await cookies()).get(TEAM_COOKIE)?.value;
  const activeTeamId = teams.some(t => t.id === selected) ? selected! : personalId as string;
  return { db, user, teams, activeTeamId };
}
export async function selectTeam(teamId: string) {
  const { teams } = await teamContext();
  if (!teams.some(t => t.id === teamId)) throw new Error("Team not found or inaccessible.");
  (await cookies()).set(TEAM_COOKIE, teamId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}
export async function activeTenantId() { return (await teamContext()).activeTeamId; }
