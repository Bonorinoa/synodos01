# Augusto Network — guided product redesign

## Product goal
Turn the current technical graph explorer into a calm, guided experience that answers one question at a time:

- **Path:** “Who could help me reach this dream institution, and what relationship-building journey does that imply?”
- **Lineage:** “What academic world surrounds this person, and what credible discoveries can I make from it?”

The redesign will preserve the single canvas, current graph, evidence packets, four direct gateways, Path/Lineage rules, and all honesty constraints. It will not add, remove, or upgrade any relationship.

## Experience model
Use three levels of progressive disclosure:

1. **Choose a mission** — select a destination in Path or a direct connection in Lineage.
2. **Follow one story** — show one active route or branch clearly; keep alternatives available but quiet.
3. **Verify when needed** — reveal evidence, provenance, confidence, and caveats in a dedicated detail layer rather than showing everything at once.

Only one contextual surface will be prominent at a time. Opening a person or relationship will reduce the guide to a small contextual breadcrumb instead of competing with it.

## Path redesign
- Begin with a focused destination prompt for Google DeepMind or Santa Fe Institute, then reveal the canvas around the chosen mission.
- Automatically foreground the strongest eligible route while grouping alternatives under “Other ways in.” Keep route ranking evidence-aware but avoid presenting algorithmic cost as a user-facing score.
- Reframe each route as a clear sequence: **You → direct connection → bridge(s) → destination**.
- Add honest, lightweight progress based only on exploration state: routes inspected, stops reviewed, and evidence checked. Never imply that a relationship or introduction has occurred.
- Give each active route a compact mission summary: number of steps, direct gateway, evidence coverage, and any weak/private links.
- Keep off-route context discoverable but visually quiet. Selecting a stop should preserve the route and open its details without collapsing the map.
- Replace technical copy such as “ranked paths,” “ghosts,” and “core only” with plain language while retaining the underlying behavior.

## Lineage redesign
- Start from the four direct connections as clear branch choices rather than exposing the full academic network immediately.
- Reveal one depth at a time, keeping Augusto and the direct gateways as orientation anchors.
- Explain once, at first expansion, that distance means recorded relationship hops—not generations, mentorship, or personal closeness.
- Treat advisor, committee, coauthor, research-group, and joint-project relationships as visibly distinct facts without implying direction where the evidence does not.
- Add session-level exploration progress such as “2 of 4 branches explored,” without scoring fame or relationship strength.
- Make sourced distinctions such as Nobel recognition useful discovery landmarks, not achievements or implied access.
- Collapse cross-branch discovery behind a deliberate action. Preserve the honest empty states and Talking to Machines as the only recorded non-ego Capra–Duch bridge.

## Evidence and records
- Redesign the inspector into two clear layers:
  - **Overview:** identity, why this node matters in the current route/branch, and the primary Expand/Focus action.
  - **Evidence:** confidence, claim, basis, URLs, source accessibility, private attestation, and full relationship list.
- Keep evidence available within one action, but collapsed until requested so casual exploration is not overwhelmed.
- Use consistent plain-language statuses: **Public sources**, **Private attestation**, **No source URL**, **Source unavailable**, and **Provisional**.
- Never translate missing URLs or high graph strength into “verified.”

## Visual direction: Signal Lab
- Use the selected palette through semantic tokens: cool white `#F6F7F5`, charcoal `#26312F`, evidence teal `#3D7772`, and active signal red `#B85243`.
- Retain a separate restrained target color only where destinations or sourced distinction markers require it; do not broaden the palette.
- Use **Space Mono** for the wordmark, mission labels, hop readouts, and compact data; retain **Geist** for body copy and longer evidence text.
- Move from floating glass-card accumulation to a restrained signal-console language: one active surface, fine rules, compact pixel/space details, stable alignment, and generous empty canvas.
- Preserve shape-based node identity and evidence-based line styling. Color continues to communicate evidence, active route, and destination—not node type.
- Give Path a directional, sequential rhythm and Lineage a branching, depth-oriented rhythm so the modes feel different before the user reads the toggle.
- Use motion only for orientation: route reveal, branch expansion, camera easing, and record transitions. Respect reduced motion.

## Chrome and responsive behavior
- Keep a single compact top bar with brand, mode, current mission, and search.
- Combine counts, explanation, and legend into one low-priority “About this view” disclosure.
- Keep canvas tools minimal and secondary; no new dashboard or persistent settings rail.
- Desktop: full-bleed graph with one contextual side surface.
- Mobile: canvas-first, one context row below the header, and a bottom record sheet; guide and record never compete at full size.
- Preserve keyboard search, pan/zoom, explicit Fit, JSON export, stable selection framing, and readable hit targets.

## Implementation sequence
1. **Product shell:** simplify persistent chrome, introduce mission-first empty states, and establish mutually exclusive guide/record presentation.
2. **Path flow:** rebuild destination selection, primary-route storytelling, alternative-route disclosure, and honest exploration progress.
3. **Lineage flow:** rebuild branch entry, progressive depth reveal, contextual teaching, and branch exploration progress.
4. **Evidence layer:** reorganize the existing inspector into overview and evidence disclosure without changing its data.
5. **Visual system:** apply Signal Lab tokens, Space Mono + Geist typography, mode-specific composition, and restrained transitions.
6. **Responsive refinement:** verify the complete flows at desktop, compact desktop, 500px, and 390px widths.

## Technical guardrails
- Keep `src/data/network.json`, stable edge IDs, ranking/traversal semantics, evidence packets, and graph counts unchanged.
- Keep Cytoscape and the current client-side architecture; no database, scraping, ingestion pipeline, or backend work in this redesign.
- Build progress from in-session interface state only. Do not persist or claim real-world outreach progress.
- Keep Path and Lineage graph logic independent from presentation.
- Preserve private/unpublished status, no-index metadata, reduced-motion behavior, and all current evidence-regression tests.

## Validation
- A new user can choose a destination and understand the first recommended route without opening a legend.
- A user can distinguish direct connection, bridge, destination, and evidence quality without reading technical terms.
- A user can expand one Lineage branch and understand hop depth without mistaking it for generations or advisor direction.
- Opening records never obscures the active route or expanded branch.
- Path and Lineage remain usable at 1280px, 1024px, 500px, and 390px.
- Search, route alternatives, branch expansion, evidence inspection, mobile sheet, zoom/pan, Fit, export, and graph invariants all pass verification.
