import assert from "node:assert/strict";
const base = process.env.TEST_APP_URL || "http://localhost:3000";
let prospectId;
const values = { name: "Lim Wei · Test " + Date.now(), contact_info: "test@example.com", source: "referral", cultural_background: "Mainland Chinese", budget_range: "2.5M MYR", status: "new" };
async function action(payload, expected = 200) {
 const response = await fetch(base + "/api/actions", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify(payload) });
 const body = await response.json();
 assert.equal(response.status, expected, JSON.stringify(body));
 return body.result ?? body;
}
try {
 const prospect = await action({ action: "save_prospect", values }); prospectId = prospect.id;
 assert.equal(prospect.status, "new");
 const blocked = await action({ action: "generate_profile", id: prospectId }, 400);
 assert.match(blocked.error, /Log at least one interaction/);
 await action({ action: "generate_strategy", id: prospectId }, 400);
 for (const observation of ["Analytical, detail-oriented and risk-averse", "Family-oriented, deliberate decision-maker"]) {
  await action({ action: "save_interaction", values: { prospect_id: prospectId, consultant_name: "Test Consultant", interaction_type: "meeting", personality_observations: observation, intentions: "Investment for children and long-term family legacy", objections: "Price versus competitors; concerned about risk", lifestyle_notes: "Long-term security and urban convenience", mood_after: "neutral" } });
 }
 const profile = await action({ action: "generate_profile", id: prospectId });
 assert.equal(Number(profile.confidence), 0.7);
 assert.equal(profile.review_status, "unreviewed");
 for (const field of ["investment_objectives","behavioral_tendencies","lifestyle_aspirations","motivations"]) assert.ok(profile[field].length > 0, field);
 await action({ action: "generate_strategy", id: prospectId }, 400);
 await action({ action: "review_profile", id: profile.id, review_status: "approved" });
 const strategy = await action({ action: "generate_strategy", id: prospectId });
 assert.ok(strategy.talking_points.length >= 3);
 assert.ok(strategy.pitch_angle && strategy.closing_technique && strategy.cultural_considerations);
 assert.equal(Number(strategy.confidence), 0.665);
 await action({ action: "save_prospect", id: prospectId, values: { ...values, status: "negotiating" } });
 const workspace = await fetch(base + "/api/workspace").then(r => r.json());
 assert.equal(workspace.prospects.find(p => p.id === prospectId).status, "negotiating");
 assert.equal(workspace.interactions.filter(i => i.prospect_id === prospectId).length, 2);
 assert.ok(workspace.audit.some(a => a.action === "generate_profile" && a.target_id === profile.id));
 assert.ok(workspace.audit.some(a => a.action === "generate_strategy" && a.target_id === strategy.id));
 assert.ok(workspace.audit.some(a => a.action === "prospect_status_changed" && a.target_id === prospectId));
 const suggestion = await action({ action: "suggest_status", id: prospectId });
 assert.equal(suggestion.status, "negotiating");
 await action({ action: "save_profile", id: profile.id, prospect_id: prospectId, values: profile }, 400);
 const edited = await action({ action: "save_profile", id: profile.id, prospect_id: prospectId, values: { ...profile, summary: profile.summary + " Consultant review complete." }, confirm_approved_edit: true });
 assert.equal(edited.review_status, "unreviewed");
 await action({ action: "generate_strategy", id: prospectId }, 400);
 await action({ action: "review_profile", id: profile.id, review_status: "approved" });
 await action({ action: "delete_prospect", id: prospectId }, 400);
 const response = await fetch(base + "/api/actions", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://untrusted.example" }, body: JSON.stringify({ action: "delete_prospect", id: prospectId, confirm: true }) });
 assert.equal(response.status, 403);
 console.log("PASS: persisted prospect → two notes → reviewed profile (70%) → strategy (66.5%) → Negotiating, audit, status suggestions, protected edits, prerequisites, delete confirmation and origin checks.");
} finally {
 if (prospectId) {
  await action({ action: "delete_prospect", id: prospectId, confirm: true });
  const workspace = await fetch(base + "/api/workspace").then(r=>r.json());
  assert.ok(!workspace.prospects.some(p=>p.id === prospectId));
  assert.ok(!workspace.interactions.some(i=>i.prospect_id === prospectId));
  assert.ok(!workspace.profiles.some(p=>p.prospect_id === prospectId));
  assert.ok(!workspace.strategies.some(s=>s.prospect_id === prospectId));
  console.log("PASS: test prospect cleanup and cascade deletion; unrelated data preserved.");
 }
}

