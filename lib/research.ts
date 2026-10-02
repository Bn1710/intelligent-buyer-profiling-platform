import { z } from "zod";
import type { ProspectSource, ResearchSnapshot, Profile } from "./types";
export function publicSourceUrl(value: string) {
 try {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && !url.username && !url.password && host.includes(".") && !host.includes(":") && !/^\d+(?:\.\d+){3}$/.test(host) && !/(^|\.)(localhost|local|internal|test|invalid)$/.test(host);
 } catch { return false; }
}
export const sourceSchema = z.object({
 prospect_id: z.string().uuid(), url: z.string().trim().max(2048).refine(publicSourceUrl, "Use a public HTTPS link without credentials."),
 title: z.string().trim().min(1).max(240), publisher: z.string().trim().max(200).default(""),
 identity_note:z.string().trim().max(1000).default(""),
 published_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
 excerpt: z.string().trim().max(5000).default(""), relevance: z.string().trim().max(2000).default(""),
 verification: z.enum(["unverified","verified","uncertain","wrong_person"]).default("unverified"),
 include_in_profile: z.boolean().default(false),
}).refine(v=>v.verification!=="verified" || !!v.identity_note,"Record why this is the same person before verification.").refine(v => !v.include_in_profile || (v.verification === "verified" && !!v.excerpt && !!v.relevance), "Verify identity and add an excerpt and relevance before selecting this source.");
export function sourceSnapshot(s: ProspectSource): ResearchSnapshot {
 return { id:s.id, revision:s.revision, url:s.url, title:s.title, publisher:s.publisher, identity_note:s.identity_note, published_date:s.published_date, excerpt:s.excerpt, relevance:s.relevance };
}
export function eligibleSources(sources: ProspectSource[]) { return sources.filter(s=>s.verification === "verified" && s.include_in_profile); }
export function researchIsCurrent(profile:Profile,sources:ProspectSource[]) {
 const snapshots=profile.research_sources ?? [];const selected=eligibleSources(sources);
 return snapshots.length===selected.length && snapshots.every(s=>selected.some(current=>current.id === s.id && current.revision === s.revision));
}
