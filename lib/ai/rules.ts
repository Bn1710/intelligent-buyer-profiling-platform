import type { Prospect, Interaction, Profile } from "../types";
export function profileDraft(prospect: Prospect, interactions: Interaction[]) {
  const joined = interactions.map(i => [i.personality_observations, i.intentions, i.objections, i.lifestyle_notes].join(" ")).join(" ").toLowerCase();
  const family = /family|children|legacy|education/.test(joined);
  const cautious = /risk.averse|risk|preserv|security|safe|analytical|deliberate/.test(joined);
  const investor = /invest|yield|rental|return/.test(joined);
  const unique = (items: string[]) => [...new Set(items.filter(Boolean))].slice(0,8);
  const observations = unique(interactions.map(i => i.personality_observations));
  const intentions = unique(interactions.map(i => i.intentions));
  const lifestyle = unique(interactions.map(i => i.lifestyle_notes));
  return {
    summary: [prospect.name + " has " + interactions.length + " recorded interaction(s).", cautious ? "Notes indicate a cautious, evidence-led decision process." : "Confirm decision preferences in the next conversation.", family ? "Family and long-term legacy are recurring priorities." : "", investor ? "Investment suitability and trade-offs should be discussed using verified figures." : "", "This is an editable evidence-based draft, not an AI assessment."].filter(Boolean).join(" "),
    socio_economic: { tier: "Declared budget: " + (prospect.budget_range || "not recorded"), indicators: [prospect.budget_range ? "Consultant-recorded budget: " + prospect.budget_range : "Ask the prospect to confirm their budget."] },
    investment_objectives: unique([...intentions, ...(cautious && investor ? ["Explore capital preservation priorities; do not promise returns."] : []), ...(family ? ["Long-term provision for family"] : []), ...(!intentions.length ? ["Confirm purchase objective with the prospect."] : [])]),
    behavioral_tendencies: observations.length ? observations : ["Decision preferences need further observation."],
    lifestyle_aspirations: lifestyle.length ? lifestyle : [family ? "Discuss family needs and future use." : "Ask about intended use and preferred amenities."],
    motivations: unique([...(family ? ["Security for children and family legacy"] : []), ...(cautious ? ["Understanding downside risk before committing"] : []), ...intentions, ...(!family && !cautious && !intentions.length ? ["Confirm motivations directly with the prospect."] : [])]),
  };
}
export function strategyDraft(prospect: Prospect, profile: Profile) {
  const evidence = JSON.stringify(profile).toLowerCase();
  const family = /family|children|legacy/.test(evidence);
  const cautious = /risk|preserv|security|analytical|deliberate/.test(evidence);
  return {
    pitch_angle: family && cautious ? "Lead with capital preservation priorities and a home or investment that supports family legacy. Discuss risks and suitability without guaranteeing value." : "Connect AIRA Residence to the prospect's stated priorities: " + profile.investment_objectives.join("; ") + ".",
    talking_points: [
      "Use the declared budget (" + (prospect.budget_range || "confirm in the meeting") + ") to compare total ownership costs, including recurring fees; use verified figures.",
      family ? "Explore how the property fits the children's future, family use and long-term legacy." : "Explore the prospect's intended use and verify which property features meet it.",
      cautious ? "Address objections with documented comparisons and downside scenarios; allow time for due diligence." : "Revisit the recorded concerns and agree what information is still needed.",
    ],
    closing_technique: "Soft, relationship-first close: invite questions, agree one useful next step, and arrange a follow-up with the prospect's chosen decision-makers. Avoid pressure or invented scarcity.",
    cultural_considerations: "Ask about language, communication and family decision preferences directly. " + (prospect.cultural_background ? "The recorded background is " + prospect.cultural_background + "; do not infer beliefs, wealth or personality from it. " : "") + "Confirm financing and ownership questions with qualified advisers.",
  };
}
export const profileConfidence = (count: number) => Math.min(0.9, Number((0.5 + 0.1 * count).toFixed(2)));

