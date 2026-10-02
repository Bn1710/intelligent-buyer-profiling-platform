"use client";
import { useState, type FormEvent } from "react";
import type { Workspace } from "@/lib/types";
import styles from "./team-panel.module.css";

export default function TeamPanel({ data, refresh }: { data: Workspace; refresh: () => Promise<void> }) {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState("");
 const [notice, setNotice] = useState("");
 const [code, setCode] = useState("");
 if (!data.user) return null;
 const team = data.teams.find(t => t.id === data.activeTeamId);
 const manager = team?.role === "owner" || team?.role === "admin";
 async function run(payload: Record<string, unknown>, message: string) {
  if (busy) return false;
  setBusy(true); setError(""); setNotice("");
  try {
   const response = await fetch("/api/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
   const body = await response.json();
   if (!response.ok) throw new Error(body.error || "Team change failed.");
   if (payload.action === "create_invite") setCode(body.result.code);
   if (["switch_team", "create_team", "join_team"].includes(String(payload.action))) setCode("");
   await refresh(); setNotice(message); return true;
  } catch (e) { setError(e instanceof Error ? e.message : "Please retry."); return false; }
  finally { setBusy(false); }
 }
 async function form(e: FormEvent<HTMLFormElement>, action: string, message: string) {
  e.preventDefault(); const element = e.currentTarget;
  if (await run({ action, ...Object.fromEntries(new FormData(element)) }, message)) element.reset();
 }
 return <section className={styles.panel} aria-label="Team workspace">
  <div className={styles.switcher}><label>Team workspace<select value={data.activeTeamId ?? ""} disabled={busy} onChange={e => void run({ action: "switch_team", team_id: e.target.value }, "Team switched.")}>{data.teams.map(t => <option key={t.id} value={t.id}>{t.name} · {t.role}</option>)}</select></label><p>{manager ? "Full team pipeline · manage lead assignments below." : "My assigned leads · your team’s other leads stay private."}</p></div>
  <details><summary>Teams & members</summary><div className={styles.body}>
   <form onSubmit={e => void form(e, "create_team", "Team created.")}><label>New team name<input name="name" required maxLength={80} placeholder="e.g. KL Sales" /></label><button disabled={busy}>Create team</button></form>
   <form onSubmit={e => void form(e, "join_team", "Joined team.")}><label>Invitation code<input name="code" required autoComplete="off" placeholder="Paste the code from your team owner" /></label><button disabled={busy}>Join team</button></form>
   {manager && <>
    <form onSubmit={e => void form(e, "rename_team", "Team renamed.")}><label>Rename current team<input name="name" required maxLength={80} defaultValue={team?.name} key={team?.id} /></label><button disabled={busy}>Rename</button></form>
    <form onSubmit={e => void form(e, "create_invite", "Invitation created. Share the code privately.")}><label>Invite role<select name="role"><option value="member">Consultant · assigned leads</option>{team?.role === "owner" && <option value="admin">Admin · full pipeline & member management</option>}</select></label><button disabled={busy}>Create invitation</button></form>
    {code && <div className={styles.invite}><strong>Single-use invitation · expires in 7 days</strong><label>Copy and share this code<input readOnly value={code} onFocus={e => e.currentTarget.select()} /></label><p>The code is shown only now. Share it with the intended teammate.</p></div>}
   </>}
   <div><h3>Current members</h3>{data.members.map(member => <div className={styles.member} key={member.user_id}><div><strong>{member.display_name || member.user_id}</strong><small>{member.role}</small></div>{manager && member.role !== "owner" && member.user_id !== data.user?.id && (team?.role === "owner" || member.role === "member") && <form onSubmit={e => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); void run({ action: "update_member", user_id: member.user_id, ...values }, "Member role updated."); }}>{team?.role === "owner" && <><label>Access<select name="role" defaultValue={member.role}><option value="member">Consultant</option><option value="admin">Admin</option></select></label><button disabled={busy}>Save role</button></>}<button type="button" disabled={busy} onClick={() => { if (window.confirm("Remove this member’s access to this team? Reassign their leads first.")) void run({ action: "remove_member", user_id: member.user_id, confirm: true }, "Member removed."); }}>Remove</button></form>}</div>)}</div>
   {manager && <div><h3>Invitations</h3>{data.invites.length ? data.invites.map(invite => <div className={styles.member} key={invite.id}><span>{invite.role} · {invite.used_at ? "Used" : invite.revoked_at ? "Revoked" : new Date(invite.expires_at) < new Date() ? "Expired" : "Pending"}</span>{!invite.used_at && !invite.revoked_at && (team?.role === "owner" || invite.role === "member") && <button disabled={busy} onClick={() => void run({ action: "revoke_invite", id: invite.id }, "Invitation revoked.")}>Revoke</button>}</div>) : <p>No invitations yet.</p>}</div>}
  </div></details>
  {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
 </section>;
}
