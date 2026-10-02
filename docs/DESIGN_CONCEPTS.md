# AIRA workspace design concepts

Open `/design/aira-workspace.html` on the deployed app, or open `public/design/aira-workspace.html` directly in a browser. This standalone prototype does not read or write the production database. Its fictional data and local changes reset on reload.

The preview controls switch between two concepts and desktop/phone layouts:

- **Concierge:** a calm navy, paper and gold workspace with generous spacing and a visible next action for each prospect.
- **Team Operations:** a more compact pipeline with an explicit review queue, consultant ownership and stronger operational hierarchy.

Both concepts include the prospect workflow Observe → Review → Strategy, team switching, a members view, search and status filtering. The phone previews replace tables with cards, use full-width form fields and expose a bottom navigation bar and prominent next action. Forms, assignment changes, sample observations, profile approval, strategy preparation and status changes update only the local mockup.

The Owner/Consultant preview toggle illustrates the agreed permission model: owners and admins see all team leads; consultants see only their assigned leads. Owner mode includes consultant assignment. The member list uses the supported owner, admin and consultant labels; the backend calls consultants `member`. Personal workspace is included in the team selector to illustrate retained private work.

The design examples use evidence-based drafts and human approval. Confidence describes evidence coverage rather than predictive accuracy. Cultural notes follow stated preferences instead of inferring behaviour from identity.

Browser verification covered both desktop concepts, the phone list/detail workflow, assigned-lead filtering, owner reassignment, entering and displaying a new observation, profile approval and the strategy approval gate. Screenshots of both concepts were exported alongside the standalone deliverable.
