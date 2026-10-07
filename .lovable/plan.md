# Correct ego distance and complete direct-neighbor research

## Goal
Make the canvas unmistakably show that Augusto’s only direct people are Monica Capra, Raymond Duch, Eitel Lauría, and Erik Johnston. Keep institutional and project facts inspectable without letting them masquerade as first-hop social connections.

## Path experience
- Add Augusto → Raymond Duch as a **private, user-attested direct relationship**. Label it honestly, with no fabricated public URL or advisor claim.
- Treat the four named people as the only first-hop gateways from Augusto when calculating routes to SFI and DeepMind.
- Preserve Augusto’s lab, university, and project facts as supporting affiliations, but exclude them from social-hop path traversal. The Emilio Pantoja edge will remain evidence in the graph but will not be presented as one of Augusto’s confirmed direct gateways.
- Re-rank target routes through the four gateways and show explicit numbered stages: **You → direct contact → bridge(s) → target**.
- Give each trajectory its own horizontal lane, show hop count prominently, and visually subordinate affiliations and weak overlaps so a multi-hop path cannot resemble a direct target connection.
- Replace the ambiguous overview with a first-degree view centered on the four direct contacts; target routes appear after choosing SFI or DeepMind.
- Keep every edge selectable, with claim, source status, confidence, and private-attestation labeling visible in the evidence sheet.

## Lineage experience
- Default to Augusto with exactly the four direct contacts at depth 1.
- Show each person’s Grok-researched lineage as a collapsible branch beneath them; do not continue into advisor-of-advisor or coauthor-of-coauthor expansion.
- Ingest the already supplied Duch packet: Rochester institution, CESS, and six coauthors; preserve the unresolved advisor/committee gap visibly.
- Keep the merged Lauría and Johnston packets, including Carlos C. Rodriguez, Judith Olson’s chair role, committee members, research groups, coauthors, and the Scott Page bridge.
- Keep PhD institutions informational and Path-only for distance; lineage depth continues to use advisor, committee, research-group, joint-project, and coauthorship evidence only.
- Improve branch labels and collapse controls so the selected person’s expansion is clear without the current dense fan of lines.

## Evidence and data safeguards
- Add an explicit edge role distinguishing a confirmed ego gateway from an affiliation or ordinary graph relationship.
- Preserve stable edge ordering/IDs where existing edges are upgraded; append new imported edges.
- Keep blocked or timed-out sources attached and lower displayed confidence rather than deleting URLs.
- Add regression checks proving Augusto has exactly four direct gateways, target paths start through one of them, Duch has no invented advisor, and expansions stop at the requested roots.

## Validation
- Walk Path naturally in overview, SFI, and DeepMind states; inspect each trajectory and evidence packet.
- Walk Lineage from Augusto into all four branches, including focus, collapse, and breadcrumb behavior.
- Verify desktop and mobile readability, selection glow alignment, JSON export, reduced motion, and a clean app build.

## Technical details
- Update the validated client-side graph schema and seed JSON; no backend or scraping.
- Separate traversal eligibility from factual edge storage, then derive hop depth for canvas classes and labels.
- Keep Cytoscape, the single-page canvas, current glass design tokens, and independent Path/Lineage layout logic.
