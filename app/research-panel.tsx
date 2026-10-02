"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import type { Prospect, ProspectSource, Profile } from "@/lib/types";
import { researchIsCurrent } from "@/lib/research";
import styles from "./research-panel.module.css";
type Command = (payload:Record<string,unknown>,message:string)=>Promise<unknown>;
export default function ResearchPanel({prospect,sources,busy,command,confirm}:{prospect:Prospect;sources:ProspectSource[];busy:boolean;command:Command;confirm:(run:()=>Promise<void>)=>void}) {
 const [name,setName]=useState(prospect.name); const [company,setCompany]=useState("");const [location,setLocation]=useState("");
 const [editing,setEditing]=useState<ProspectSource|null|undefined>(); const [verification,setVerification]=useState("unverified");
 const [formError,setFormError]=useState("");
 const opener=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(editing===undefined && opener.current?.isConnected){opener.current.focus();opener.current=null;}},[editing]);
 const query=[name.trim() ? '"'+name.trim()+'"' : "",company.trim(),location.trim()].filter(Boolean).join(" ");
 const selected=sources.filter(s=>s.include_in_profile).length;
 function edit(source?:ProspectSource){opener.current=document.activeElement as HTMLElement;setEditing(source ?? null);setVerification(source?.verification ?? "unverified");setFormError("");}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const entries=Object.fromEntries(new FormData(event.currentTarget));
  if(verification === "verified" && entries.include_in_profile === "on" && !editing?.include_in_profile && selected>=20){setFormError("Select up to 20 sources. Exclude another source first.");return;}
  try{await command({action:"save_source",id:editing?.id,values:{...entries,prospect_id:prospect.id,published_date:entries.published_date || null,include_in_profile:verification === "verified" && entries.include_in_profile === "on"}},"Research source saved. Selected evidence changes require fresh profile review.");setEditing(undefined);}
  catch(e){setFormError(e instanceof Error?e.message:"Source could not be saved.");}
 }
 return <section className={"panel "+styles.panel} aria-label="Research and sources">
  <div className="panel-heading"><div><span className="eyebrow">RESEARCH & SOURCES</span><h2>Context you can trace <span className="muted">({sources.length})</span></h2></div><button className="secondary" disabled={busy} onClick={()=>edit()}>＋ Add source</button></div>
  <p>Save relevant public professional information, confirm the person, then choose what may inform a profile. Search results are possible matches, not verified evidence.</p>
  <details className={styles.discovery}><summary>Find public information</summary><div className={styles.searchFields}><label>Name to search<input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label><label>Company or organisation<input value={company} onChange={e=>setCompany(e.target.value)} maxLength={120} placeholder="Optional identity clue"/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)} maxLength={120} placeholder="e.g. Kuala Lumpur"/></label></div>
   <div className={styles.links}>{query ? <><a href={"https://www.google.com/search?q="+encodeURIComponent(query)} target="_blank" rel="noopener noreferrer">Public web ↗</a><a href={"https://www.google.com/search?q="+encodeURIComponent(query+" interview biography company")+"&tbm=nws"} target="_blank" rel="noopener noreferrer">News & interviews ↗</a><a href={"https://www.bing.com/search?q="+encodeURIComponent(query+" site:linkedin.com/in/")} target="_blank" rel="noopener noreferrer">Professional profiles ↗</a></> : <p>Enter a name to create search links.</p>}</div><p className="small muted">These links open external search results. This app does not scrape pages or claim to find every available source. Copy a useful link and a short excerpt into Add source.</p>
  </details>
  {editing !== undefined && <form key={editing?.id ?? "new"} className={styles.editor} onSubmit={submit} aria-label={editing ? "Edit research source" : "Add research source"}>
   <h3>{editing ? "Edit source" : "Add a source"}</h3>
   <label>Public HTTPS link<input name="url" type="url" required maxLength={2048} defaultValue={editing?.url} placeholder="https://company.example/bio" autoFocus/></label>
   <div className={styles.searchFields}><label>Title<input name="title" required maxLength={240} defaultValue={editing?.title}/></label><label>Publisher<input name="publisher" maxLength={200} defaultValue={editing?.publisher}/></label><label>Publication date<input name="published_date" type="date" defaultValue={editing?.published_date ?? ""}/></label></div>
   <label>Short excerpt<textarea name="excerpt" rows={4} maxLength={5000} defaultValue={editing?.excerpt} placeholder="Paste the relevant passage, not the entire article."/></label>
   <label>Why it matters to the next conversation<textarea name="relevance" rows={2} maxLength={2000} defaultValue={editing?.relevance} placeholder="What context or question does this suggest?"/></label>
   <div className={styles.searchFields}><label>Identity match<select name="verification" value={verification} onChange={e=>setVerification(e.target.value)}><option value="unverified">Unverified</option><option value="verified">Verified same person</option><option value="uncertain">Uncertain match</option><option value="wrong_person">Wrong person</option></select></label><label>Why this is the same person<textarea name="identity_note" maxLength={1000} rows={2} required={verification === "verified"} defaultValue={editing?.identity_note} placeholder="Name, employer and other details match information the prospect provided."/></label></div>
   <label className={styles.checkbox}><input name="include_in_profile" type="checkbox" disabled={verification!=="verified"} defaultChecked={editing?.include_in_profile}/>Use this verified evidence in the next profile</label>
   <p className="small muted">Only verified selected sources are used. Research adds context; it does not increase the interaction-based confidence score or establish budget or purchase intentions.</p>
   {formError && <p role="alert" className="error">{formError}</p>}<div className="record-actions"><button className="primary" disabled={busy}>Save source</button><button type="button" disabled={busy} onClick={()=>setEditing(undefined)}>Cancel</button></div>
  </form>}
  <p className="small muted">{selected} selected for profiling · {sources.filter(s=>s.verification === "uncertain").length} uncertain matches</p>
  {!sources.length && <p className="inline-empty">No sources saved yet. Start with a company biography, professional profile or relevant interview.</p>}
  <div className={styles.cards}>{sources.map(s=><article key={s.id} className={styles.source}><header><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a><span className="badge">{s.verification.replaceAll("_"," ")}</span></header><p className="small muted">{s.publisher || s.url.split("/")[2]} · {s.published_date || "Publication date unknown"} · saved {new Date(s.created_at).toLocaleDateString("en-MY")}</p>{s.excerpt && <blockquote>{s.excerpt}</blockquote>}{s.relevance && <p><strong>Relevance:</strong> {s.relevance}</p>}{s.identity_note && <p className="small"><strong>Identity match:</strong> {s.identity_note}</p>}<p className="small">{s.include_in_profile ? "Selected for the next profile" : "Excluded from profiling"}</p><div className="record-actions"><button disabled={busy} onClick={()=>edit(s)}>Edit / verify</button><button disabled={busy || s.verification!=="verified" || !s.excerpt || !s.relevance || (!s.include_in_profile && selected>=20)} onClick={()=>void command({action:"save_source",id:s.id,values:{...s,include_in_profile:!s.include_in_profile}},s.include_in_profile?"Source excluded. Regenerate the profile to refresh evidence.":"Source selected. Regenerate the profile to include it.").catch(()=>{})}>{s.include_in_profile ? "Exclude from profile" : "Use in profile"}</button><button disabled={busy} onClick={()=>confirm(async()=>{await command({action:"delete_source",id:s.id,prospect_id:prospect.id,confirm:true},"Source deleted. Historical profile citations remain available.");})}>Delete source</button></div></article>)}</div>
 </section>;
}
export function ProfileResearch({profile,sources}:{profile:Profile;sources:ProspectSource[]}) {
 const snapshots=profile.research_sources ?? [];
 const stale=!researchIsCurrent(profile,sources);
 if(!snapshots.length && !stale)return null;
 return <div className={styles.evidence}>{stale && <p className="error">Research evidence changed. Regenerate this profile, or edit it with current evidence, before approval.</p>}<h4>Research citations · {snapshots.length}</h4><p className="small muted">Exact saved versions used in this profile. Research is context to verify in conversation.</p>{snapshots.map(s=><div key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a><p className="small">{s.publisher} · {s.published_date || "Undated"} · version {s.revision}</p>{(profile.research_claims ?? []).filter(c=>c.source_id === s.id).map((c,i)=><p key={i}><strong>{c.dimension === "conversation_question" ? "Question to confirm" : "Professional context"}:</strong> {c.statement}</p>)}<details><summary>Source excerpt & relevance</summary><blockquote>{s.excerpt}</blockquote><p>{s.relevance}</p></details></div>)}</div>;
}
