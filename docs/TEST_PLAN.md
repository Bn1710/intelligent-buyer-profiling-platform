# Test Plan

## v1 Success Scenario (manual)
1. Open app (no login) → see Prospects list with seed data.
2. Click "New Prospect" → enter: name "Lim Wei", cultural background "Malay-Chinese", budget "2.5M MYR", source "referral" → Save.
3. Verify "Lim Wei" appears in list with status "new".
4. Open prospect detail → click "Log Interaction" → type: "meeting", personality: "analytical, detail-oriented", intentions: "investment for children", objections: "price vs competitors", mood: "neutral" → Save.
5. Verify interaction appears in timeline.
6. Click "Generate Profile" → wait → verify structured analysis appears with confidence score and review_status "unreviewed".
7. Click "Approve" → verify status changes to "approved".
8. Click "Generate Strategy" → verify pitch angle, ≥3 talking points, closing technique, cultural considerations appear.
9. Change prospect status to "Negotiating" → verify list updates.

## Empty/Error Cases
1. **No prospects:** delete all seed rows → verify list shows "No prospects yet. Create your first prospect."
2. **No interactions:** create prospect, immediately click Generate Profile → verify message: "Log at least one interaction before generating a profile."
3. **AI failure:** simulate LLM timeout → verify error toast: "Profile generation failed. You can enter the profile manually." and no crash.
4. **Empty strategy:** prospect with no approved profile → verify "Generate Strategy" is disabled with tooltip "Approve a profile first."
5. **Delete confirm:** click delete on a prospect → verify confirmation dialog appears; cancel returns to list without deletion.

## RLS (post lock-down)
6. Log in as Consultant A, create a prospect → log in as Consultant B → verify B cannot see A's prospect.
