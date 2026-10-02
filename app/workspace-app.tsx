"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { statuses, sources, cultures, type Workspace, type Prospect, type Profile, type Strategy } from "@/lib/types";
import Link from "next/link";

type Section = "Prospects" | "Interactions" | "Profiles" | "Strategies";
type Field = { name: string; label: string; options?: readonly string[]; multiline?: boolean; required?: boolean; placeholder?: string };
type Editor = { kind: "prospect" | "interaction" | "profile" | "strategy"; id?: string; prospectId?: string; values?: Record<string, unknown>; approvedEdit?: boolean };
type Confirm = { title: string; description: string; run: () => Promise<void> };
const prospectFields: Field[] = [
 { name: "name", label: "Prospect name", required: true, placeholder: "e.g. Lim Wei" },
 { name: "contact_info", label: "Contact", placeholder: "Phone or email" },
 { name: "source", label: "Lead source", options: sources },
 { name: "cultural_background", label: "Cultural background", options: cultures },
 { name: "budget_range", label: "Budget range", placeholder: "e.g. 2.5M MYR" },
 { name: "status", label: "Status", options: statuses },
];
const interactionFields: Field[] = [
 { name: "consultant_name", label: "Consultant name", required: true, placeholder: "Your name" },
 { name: "interaction_type", label: "Interaction type", options: ["meeting", "call", "site-visit", "whatsapp"] },
 { name: "personality_observations", label: "Personality observations", multiline: true, placeholder: "What did you observe? Record evidence, not assumptions." },
 { name: "intentions", label: "Purchase intentions", multiline: true, placeholder: "Investment, family home, children's future…" },
 { name: "objections", label: "Objections and concerns", multiline: true, placeholder: "Risks, price comparisons, decision-makers…" },
 { name: "lifestyle_notes", label: "Lifestyle notes", multiline: true, placeholder: "Preferred use, family needs, amenities…" },
 { name: "mood_after", label: "Mood after interaction", options: ["positive", "neutral", "negative"] },
];
const profileFields: Field[] = [
 { name: "summary", label: "Behavioral summary", multiline: true, required: true },
 { name: "tier", label: "Socio-economic context", required: true, placeholder: "Declared budget / unknown" },
 ...["indicators", "investment_objectives", "behavioral_tendencies", "lifestyle_aspirations", "motivations"].map(name => ({ name, label: name.replaceAll("_", " ") + " (one per line)", multiline: true, required: true })),
];
const strategyFields: Field[] = [
 { name: "pitch_angle", label: "Pitch angle", multiline: true, required: true },
 { name: "talking_points", label: "Talking points (at least three, one per line)", multiline: true, required: true },
 { name: "closing_technique", label: "Closing technique", multiline: true, required: true },
 { name: "cultural_considerations", label: "Cultural considerations", multiline: true, required: true },
];
const label = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ");
const date = (value: string) => new Date(value).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });
const confidence = (value: number) => Math.round(Number(value) * 100) + "%";
const lines = (value: unknown) => Array.isArray(value) ? value.join("\n") : String(value ?? "");
const score = (p: Prospect, data: Workspace) => ({ negotiating: 3, engaged: 2, new: 1, "closed-won": 0, "closed-lost": 0 }[p.status]) * Number(data.profiles.find(x => x.prospect_id === p.id)?.confidence ?? 0.5);

function Modal({ title, children, close, busy }: { title: string; children: React.ReactNode; close: () => void; busy: boolean }) {
 const ref = useRef<HTMLDialogElement>(null);
 useEffect(() => { ref.current?.showModal(); }, []);
 return <dialog ref={ref} onCancel={e => { e.preventDefault(); if (!busy) close(); }} aria-label={title} className="modal">
  <header><div><span className="eyebrow">AIRA WORKSPACE</span><h2>{title}</h2></div><button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={close}>×</button></header>
  {children}
 </dialog>;
}
function Badge({ value }: { value: string }) { return <span className={"badge badge-" + value}>{label(value)}</span>; }
function Dimension({ title, values }: { title: string; values: string[] }) { return <div className="dimension"><h4>{title}</h4><ul>{values.map((v,i) => <li key={i}>{v}</li>)}</ul></div>; }
function Attribution({ record }: { record: Profile | Strategy }) {
 return <div className="attribution"><Badge value={record.review_status} /><span>{record.source.startsWith("rules") ? "Evidence-based draft · AI unavailable" : record.source.startsWith("consultant") ? "Consultant entry" : record.source === "demo-seed" ? "Demo example" : "AI · " + record.source}</span><span>Evidence confidence {confidence(record.confidence)}</span><time>{date(record.created_at)}</time></div>;
}

export default function WorkspaceApp() {
 const [data, setData] = useState<Workspace | null>(null);
 const [loadError, setLoadError] = useState("");
 const [error, setError] = useState("");
 const [notice, setNotice] = useState("");
 const [busy, setBusy] = useState(false);
 const [section, setSection] = useState<Section>("Prospects");
 const [selected, setSelected] = useState<string | null>(null);
 const [editor, setEditor] = useState<Editor | null>(null);
 const [confirm, setConfirm] = useState<Confirm | null>(null);
 const [query, setQuery] = useState("");
 const [filter, setFilter] = useState("all");
 const [mobileNav, setMobileNav] = useState(false);
 const load = useCallback(async () => {
  const response = await fetch("/api/workspace", { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error);
  setData(body); setLoadError("");
 }, []);
 useEffect(() => { load().catch(e => setLoadError(e.message)); }, [load]);
 async function command(payload: Record<string, unknown>, success: string) {
  if (busy) return;
  setBusy(true); setError(""); setNotice("");
  try {
   const response = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
   const body = await response.json();
   if (!response.ok) throw new Error(body.error);
   await load(); setNotice(success); return body.result;
  } catch (e) { const message = e instanceof Error ? e.message : "Unable to save. Please retry."; setError(message); throw e; }
  finally { setBusy(false); }
 }
 function openEditor(next: Editor) { setError(""); setEditor(next); }
 async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); if (!editor) return;
  const entries = Object.fromEntries(new FormData(event.currentTarget));
  const values: Record<string, unknown> = { ...entries };
  if (editor.kind === "interaction") values.prospect_id = editor.prospectId;
  if (editor.kind === "profile") {
   values.socio_economic = { tier: values.tier, indicators: String(values.indicators).split("\n").map(x => x.trim()).filter(Boolean) };
   for (const k of ["investment_objectives", "behavioral_tendencies", "lifestyle_aspirations", "motivations"]) values[k] = String(values[k]).split("\n").map(x => x.trim()).filter(Boolean);
   delete values.tier; delete values.indicators;
  }
  if (editor.kind === "strategy") values.talking_points = String(values.talking_points).split("\n").map(x => x.trim()).filter(Boolean);
  try {
   const result = await command({ action: "save_" + editor.kind, id: editor.id, prospect_id: editor.prospectId, confirm_approved_edit: editor.approvedEdit === true, values }, label(editor.kind) + " saved.");
   if (editor.kind === "prospect" && result?.id) setSelected(result.id);
   setEditor(null);
  } catch { /* Keep the form and user inputs open. */ }
 }
 function askDelete(kind: string, id: string, name: string) {
  setError(""); setConfirm({ title: "Delete " + kind + "?", description: kind === "prospect" ? "Delete " + name + " and all their interactions, profiles and strategies? This cannot be undone." : "Permanently delete this " + kind + "? The audit history is retained.",
   run: async () => { await command({ action: "delete_" + kind, id, confirm: true }, label(kind) + " deleted."); if (kind === "prospect") setSelected(null); } });
 }
 function editAnalysis(kind: "profile" | "strategy", record: Profile | Strategy) {
  const next = { kind, id: record.id, prospectId: record.prospect_id, values: record as unknown as Record<string, unknown>, approvedEdit: record.review_status === "approved" };
  if (record.review_status === "approved") setConfirm({ title: "Edit approved " + kind + "?", description: "Saving changes will return this record to unreviewed. Review and approve the edited version before using it.",
   run: async () => { openEditor(next); } });
  else openEditor(next);
 }
 const prospect = data?.prospects.find(p => p.id === selected);
 const interactions = data?.interactions.filter(i => i.prospect_id === selected) ?? [];
 const profiles = data?.profiles.filter(p => p.prospect_id === selected) ?? [];
 const strategies = data?.strategies.filter(s => s.prospect_id === selected) ?? [];
 const approved = profiles.find(p => p.review_status === "approved");
 const fields = editor?.kind === "prospect" ? prospectFields : editor?.kind === "interaction" ? interactionFields : editor?.kind === "profile" ? profileFields : strategyFields;
 const formValues = { ...editor?.values, ...(editor?.kind === "profile" ? (editor.values?.socio_economic as Record<string, unknown> ?? {}) : {}) };
 const filtered = data?.prospects.filter(p => (!query || [p.name,p.contact_info,p.budget_range,p.cultural_background].join(" ").toLowerCase().includes(query.toLowerCase())) && (filter === "all" || p.status === filter)).sort((a,b) => score(b,data) - score(a,data) || b.created_at.localeCompare(a.created_at)) ?? [];
 return <div className="app-shell">
  <aside className={"sidebar " + (mobileNav ? "sidebar-open" : "")}>
   <Link className="brand" href="/" aria-label="AIRA home"><span className="brand-mark">A</span><span>AIRA<span className="brand-sub">RESIDENCE · KL</span></span></Link>
   <div className="workspace-label">CONSULTANT WORKSPACE</div>
   <nav aria-label="Main navigation">{(["Prospects","Interactions","Profiles","Strategies"] as Section[]).map((item,i) => <button key={item} className={section === item ? "nav-item active" : "nav-item"} onClick={() => { setSection(item); setSelected(null); setMobileNav(false); }}><span className="nav-icon">{["◈","◷","◇","↗"][i]}</span>{item}<span className="nav-count">{data ? [data.prospects.length,data.interactions.length,data.profiles.length,data.strategies.length][i] : "—"}</span></button>)}</nav>
   <div className="sidebar-note"><span className="eyebrow">A MORE PERSONAL APPROACH</span><p>Understand the person.<br/>Shape the conversation.</p><span className="small">Built around your observations.</span></div>
   <div className="sidebar-footer"><span className="avatar small-avatar">SC</span><div>Sales consultant<span className="small block">Shared demo workspace</span></div></div>
  </aside>
  <div className="main">
   <header className="topbar"><div><button className="mobile-menu icon-button" aria-label="Toggle navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}>☰</button><span className="breadcrumb">Workspace <span>/</span> {section}{prospect ? " / " + prospect.name : ""}</span></div><span className="demo-indicator"><i/>Demo mode · sample data only</span></header>
   <main className="content">
    <div className="page-heading"><div><span className="eyebrow">{prospect ? "PROSPECT WORKSPACE" : "RELATIONSHIPS, WITH CONTEXT"}</span><h1>{prospect?.name ?? section}</h1><p>{prospect ? "Turn observations into a thoughtful next conversation." : section === "Prospects" ? "Every great conversation starts with understanding." : "Your " + section.toLowerCase() + ", connected to each prospect."}</p></div><button className="primary" disabled={busy || !data} onClick={() => openEditor({ kind: "prospect" })}><span>＋</span> New Prospect</button></div>
    {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}
    {error && !editor && <div className="error" role="alert">{error}</div>}
    {loadError ? <div className="empty-state"><span className="empty-symbol">↻</span><h2>Workspace unavailable</h2><p>{loadError}</p><button className="primary" onClick={() => load().catch(e => setLoadError(e.message))}>Retry</button></div> : !data ? <div className="skeleton" role="status"><div/><div/><div/><p>Loading your prospects…</p></div> : prospect ? <>
     <button className="back-link" onClick={() => setSelected(null)}>← Back to {section.toLowerCase()}</button>
     <div className="detail-overview"><div className="avatar">{prospect.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div className="detail-info"><Badge value={prospect.status}/><p>{prospect.contact_info || "No contact recorded"} · {prospect.cultural_background || "Background not recorded"}</p><span>Budget {prospect.budget_range || "not recorded"} · {label(prospect.source ?? "unknown source")}</span></div><div className="detail-actions"><button className="secondary" disabled={busy} onClick={() => openEditor({ kind: "prospect", id: prospect.id, values: prospect as unknown as Record<string,unknown> })}>Edit prospect</button><button className="danger-link" disabled={busy} onClick={() => askDelete("prospect",prospect.id,prospect.name)}>Delete</button></div></div>
     <div className="workflow" aria-label="Prospect workflow">{["Lead created","Interaction logged","Profile approved","Strategy ready"].map((step,i) => <div className={i === 0 || (i === 1 && interactions.length) || (i === 2 && approved) || (i === 3 && strategies.length) ? "step complete" : "step"} key={step}><span>{i + 1}</span>{step}</div>)}</div>
     <div className="detail-grid"><div className="detail-main">
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">01 · OBSERVE</span><h2>Interaction timeline <span className="muted">({interactions.length})</span></h2></div><button className="secondary" disabled={busy} onClick={() => openEditor({ kind: "interaction", prospectId: prospect.id })}>＋ Log Interaction</button></div>
       {!interactions.length ? <p className="inline-empty">Log your first meeting, call or site visit to start building a profile.</p> : <div className="timeline">{interactions.map(i => <article className="timeline-item" key={i.id}><div className="timeline-dot"/><div className="record-heading"><strong>{label(i.interaction_type)}</strong><Badge value={i.mood_after}/><time>{date(i.created_at)}</time></div><p className="small muted">Recorded by {i.consultant_name}</p><dl>{[["Personality",i.personality_observations],["Intentions",i.intentions],["Objections",i.objections],["Lifestyle",i.lifestyle_notes]].filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><div className="record-actions"><button disabled={busy} onClick={() => openEditor({ kind: "interaction", id: i.id, prospectId: prospect.id, values: i as unknown as Record<string,unknown> })}>Edit note</button><button disabled={busy} onClick={() => askDelete("interaction",i.id,prospect.name)}>Delete note</button></div></article>)}</div>}
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">02 · UNDERSTAND</span><h2>Behavioral profiles</h2></div><button className="primary" disabled={busy || !interactions.length} title={!interactions.length ? "Log at least one interaction before generating a profile." : "Create a new profile from all recorded notes."} onClick={() => command({ action: "generate_profile", id: prospect.id }, "Profile saved. Review the analysis before approving.").catch(()=>{})}>{busy ? "Working…" : "✧ Generate Profile"}</button></div>
       {!interactions.length && <p className="inline-empty">Log at least one interaction before generating a profile.</p>}
       <button className="text-button" disabled={busy} onClick={() => openEditor({ kind: "profile", prospectId: prospect.id })}>Enter profile manually</button>
       {!profiles.length ? <p className="inline-empty">Your observations will inform five dimensions of the buyer profile.</p> : profiles.map(p => <article className="analysis" key={p.id}><Attribution record={p}/><p className="analysis-summary">{p.summary}</p><div className="dimensions"><Dimension title="Socio-economic context" values={[p.socio_economic?.tier ?? "Unknown", ...(p.socio_economic?.indicators ?? [])]}/><Dimension title="Investment objectives" values={p.investment_objectives ?? []}/><Dimension title="Behavioral tendencies" values={p.behavioral_tendencies ?? []}/><Dimension title="Lifestyle aspirations" values={p.lifestyle_aspirations ?? []}/><Dimension title="Motivations" values={p.motivations ?? []}/></div><div className="record-actions"><button className="approve" disabled={busy || p.review_status === "approved"} onClick={() => command({ action: "review_profile", id: p.id, review_status: "approved" }, "Profile approved. You can now generate a strategy.").catch(()=>{})}>Approve profile</button><button disabled={busy || p.review_status === "rejected"} onClick={() => command({ action: "review_profile", id: p.id, review_status: "rejected" }, "Profile rejected.").catch(()=>{})}>Reject</button><button disabled={busy} onClick={() => editAnalysis("profile",p)}>Edit profile</button><button disabled={busy} onClick={() => askDelete("profile",p.id,prospect.name)}>Delete</button></div></article>)}
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">03 · CONNECT</span><h2>Conversation strategies</h2></div><button className="primary" disabled={busy || !approved} title={!approved ? "Approve a profile first." : "Generate from the latest approved profile."} onClick={() => command({ action: "generate_strategy", id: prospect.id }, "Strategy saved. Review it before your next meeting.").catch(()=>{})}>{busy ? "Working…" : "↗ Generate Strategy"}</button></div>
       <button className="text-button" disabled={busy || !approved} onClick={() => openEditor({ kind: "strategy", prospectId: prospect.id })}>Enter strategy manually</button>
       {!approved && <p className="inline-empty">Approve a profile first.</p>}
       {!strategies.length ? <p className="inline-empty">A pitch that reflects the prospect’s priorities, with a thoughtful way forward.</p> : strategies.map(s => <article className="analysis strategy" key={s.id}><Attribution record={s}/><span className="eyebrow">PITCH ANGLE</span><h3>{s.pitch_angle}</h3><Dimension title="Key talking points" values={s.talking_points ?? []}/><Dimension title="Closing technique" values={[s.closing_technique]}/><Dimension title="Cultural considerations" values={[s.cultural_considerations]}/>{!profiles.some(p=>p.id === s.profile_id && p.review_status === "approved") && <p className="error">The source profile is no longer approved. Review a profile and regenerate this strategy.</p>}<div className="record-actions"><button className="approve" disabled={busy || s.review_status === "approved"} onClick={() => command({ action: "review_strategy", id: s.id, review_status: "approved" }, "Strategy approved.").catch(()=>{})}>Approve strategy</button><button disabled={busy || s.review_status === "rejected"} onClick={() => command({ action: "review_strategy", id: s.id, review_status: "rejected" }, "Strategy rejected.").catch(()=>{})}>Reject</button><button disabled={busy} onClick={() => editAnalysis("strategy",s)}>Edit strategy</button><button disabled={busy} onClick={() => askDelete("strategy",s.id,prospect.name)}>Delete</button></div></article>)}
      </section>
     </div><aside className="detail-side"><section className="panel"><span className="eyebrow">NEXT STEP</span><h2>Move the relationship forward</h2><p className="muted">After your next conversation, keep the pipeline current.</p><label className="field">Prospect status<select value={prospect.status} disabled={busy} onChange={e => command({ action: "save_prospect", id: prospect.id, values: { ...prospect, contact_info: prospect.contact_info ?? "", budget_range: prospect.budget_range ?? "", status: e.target.value } }, "Prospect status updated.").catch(()=>{})}>{statuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label><p className="small muted">Changes are saved immediately.</p></section><section className="panel guidance"><span className="eyebrow">CONSULTANT REVIEW</span><h3>Evidence before assumptions.</h3><p>Confidence reflects the number of recorded interactions, not predictive accuracy. Review every draft. Ask about preferences directly.</p>{!data.aiEnabled && <p>AI is not configured. Generation creates an editable evidence-based draft; manual entry remains available.</p>}</section><section className="panel"><span className="eyebrow">ACTIVITY LOG</span><div className="audit">{data.audit.filter(a=>a.target_id === prospect.id || profiles.some(p=>p.id === a.target_id) || strategies.some(s=>s.id === a.target_id) || interactions.some(i=>i.id === a.target_id)).slice(0,12).map(a=><div key={a.id}><strong>{label(a.action)}</strong><span>{date(a.created_at)}</span></div>)}<p className="small muted">Saved changes retain an append-only audit trail.</p></div></section></aside></div>
    </> : <>
     <div className="metrics"><div><span>Active prospects</span><strong>{data.prospects.filter(p=>!p.status.startsWith("closed")).length}</strong><small>Relationships in progress</small></div><div><span>In negotiation</span><strong>{data.prospects.filter(p=>p.status === "negotiating").length}</strong><small>Ready for the next conversation</small></div><div><span>Profiles approved</span><strong>{data.profiles.filter(p=>p.review_status === "approved").length}</strong><small>Reviewed by a consultant</small></div><div><span>Strategies prepared</span><strong>{data.strategies.length}</strong><small>Tailored to individual priorities</small></div></div>
     {section === "Prospects" ? <section className="panel list-panel"><div className="list-toolbar"><div><h2>Your prospects <span className="count">{data.prospects.length}</span></h2><p className="small muted">Prioritized by status and profile confidence</p></div><div className="filters"><input aria-label="Search prospects" placeholder="Search name, budget, background…" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filter by status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></div></div>
      {!filtered.length ? <div className="empty-state"><span className="empty-symbol">◇</span><h2>{data.prospects.length ? "No matching prospects" : "No prospects yet. Create your first prospect."}</h2><p>{data.prospects.length ? "Try another search or status." : "Start with a lead, then add the context that makes your pitch personal."}</p>{!data.prospects.length && <button className="primary" onClick={()=>openEditor({kind:"prospect"})}>New Prospect</button>}</div> : <div className="table-wrap"><table><thead><tr><th>Prospect</th><th>Background / source</th><th>Budget</th><th>Status</th><th>Latest profile</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(p => { const profile = data.profiles.find(x=>x.prospect_id === p.id); return <tr key={p.id}><td><button className="prospect-link" onClick={()=>setSelected(p.id)}><span className="avatar">{p.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><span><strong>{p.name}</strong><small>{p.contact_info || "No contact recorded"}</small></span></button></td><td><span>{p.cultural_background}</span><small>{label(p.source ?? "")}</small></td><td className="budget">{p.budget_range || "Not recorded"}</td><td><Badge value={p.status}/></td><td className="profile-cell">{profile ? <><p>{profile.summary}</p><small>{confidence(profile.confidence)} confidence · {profile.review_status}</small></> : <span className="muted">Awaiting observations</span>}</td><td><button className="row-open" aria-label={"Open " + p.name} onClick={()=>setSelected(p.id)}>↗</button></td></tr>; })}</tbody></table></div>}
     </section> : <section className="panel"><div className="panel-heading"><div><h2>{section}</h2><p className="small muted">Select a record to open its prospect and continue working.</p></div></div><div className="collection">{(section === "Interactions" ? data.interactions : section === "Profiles" ? data.profiles : data.strategies).map(record => { const p = data.prospects.find(p=>p.id === record.prospect_id); return <button className="collection-card" key={record.id} onClick={()=>setSelected(record.prospect_id)}><span className="eyebrow">{p?.name ?? "Prospect"}</span><strong>{"summary" in record ? record.summary : "pitch_angle" in record ? record.pitch_angle : label(record.interaction_type) + " · " + record.personality_observations}</strong><span>{"review_status" in record ? label(record.review_status) + " · " + confidence(record.confidence) : record.consultant_name}</span><time>{date(record.created_at)}</time></button>; })}</div>{!(section === "Interactions" ? data.interactions : section === "Profiles" ? data.profiles : data.strategies).length && <div className="empty-state"><h2>No {section.toLowerCase()} yet</h2><p>Open a prospect to {section === "Interactions" ? "log a conversation" : section === "Profiles" ? "generate or enter a profile" : "prepare a strategy from an approved profile"}.</p><button className="secondary" onClick={()=>setSection("Prospects")}>View prospects</button></div>}</section>}
     <div className="bottom-note"><span>✧</span><p>From first impression to next conversation.<br/><strong>Log observations → review a profile → prepare a strategy.</strong></p></div>
    </>}
   </main><footer className="footer">AIRA Residence · Consultant workspace<span>Demo data only · Kuala Lumpur time</span></footer>
  </div>
  {editor && <Modal title={(editor.id ? "Edit " : "New ") + label(editor.kind)} close={()=>setEditor(null)} busy={busy}><form onSubmit={submit}><div className="form-grid">{fields.map(f=><label className={"field " + (f.multiline ? "full" : "")} key={f.name}>{f.label}{f.options ? <select name={f.name} defaultValue={String(formValues[f.name] ?? f.options[0])}>{f.options.map(o=><option key={o} value={o}>{label(o)}</option>)}</select> : f.multiline ? <textarea name={f.name} required={f.required} maxLength={5000} rows={3} defaultValue={lines(formValues[f.name])} placeholder={f.placeholder}/> : <input name={f.name} required={f.required} maxLength={f.name === "name" ? 120 : 5000} defaultValue={lines(formValues[f.name])} placeholder={f.placeholder}/>}</label>)}</div>{editor.kind === "profile" && <p className="small muted">Manual profiles record 0% confidence until evidence-based generation. Editing returns the record to unreviewed.</p>}{error && <p className="error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setEditor(null)}>Cancel</button><button type="submit" className="primary" disabled={busy}>{busy ? "Saving…" : "Save " + editor.kind}</button></div></form></Modal>}
  {confirm && <Modal title={confirm.title} close={()=>setConfirm(null)} busy={busy}><p className="confirm-description">{confirm.description}</p>{error && <p className="error" role="alert">{error}</p>}<div className="modal-actions"><button className="secondary" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button><button className={confirm.title.startsWith("Delete") ? "danger" : "primary"} disabled={busy} onClick={async()=>{ try { await confirm.run(); setConfirm(null); } catch {} }}>{busy ? "Working…" : confirm.title.startsWith("Delete") ? "Delete permanently" : "Continue editing"}</button></div></Modal>}
 </div>;
}


