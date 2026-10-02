# Intelligence Layer

## Messy Inputs
Consultant free-text observations, partial contact info, cultural-background labels, budget ranges in varied formats, subjective mood assessments.

## Auto-Structure Schema (Profile output JSON)
```json
{
  "socio_economic": { "tier": "high-net-worth", "indicators": ["budget 2M+ MYR"] },
  "investment_objectives": ["capital preservation", "rental yield"],
  "behavioral_tendencies": ["risk-averse", "deliberate decision-maker"],
  "lifestyle_aspirations": ["family legacy", "urban convenience"],
  "motivations": ["security for children", "status signaling"],
  "confidence": 0.78
}
```

## Events to Track
- Profile generated (prospect_id, interaction_count, confidence)
- Strategy generated (prospect_id, profile_id)
- Profile reviewed (approved/rejected)
- Prospect status changed

## Scoring Rules (v1, rule-based)
- Profile confidence = base 0.5 + 0.1 × interaction_count (cap 0.9)
- Strategy confidence = profile.confidence × 0.95
- If interaction_count = 0, block profile generation, prompt consultant to log first.

## What Gets Ranked
Prospect list sorted by: status priority (negotiating > engaged > new) × profile confidence. Highlight high-value, high-confidence prospects.

## v1 vs Later
- **v1:** LLM-generated profiles + strategies from stored data; rule-based confidence.
- **Later:** social-media enrichment feeds, behavioral pattern matching across prospects, consultant performance scoring.
