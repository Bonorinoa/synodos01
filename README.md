# Synodos

Build a single-page app from first principles: Augusto’s private, evidence-gated social & academic network explorer.

Attached: (1) augusto-network.html — working prototype with NETWORK_DATA, evidence packets, Path vs Lineage modes, P0 honesty chrome. (2) ARCHITECTURE-v2.md — vertical lineage + scale plan. Use these as product/data reference; do NOT clone the prototype’s UI chrome. Redesign beautifully as a freeform canvas SPA.

# Product purpose
Personal tool to map people, labs, and institutions with verifiable relationships. Logical implications (paths to targets, lineage depth, intro plans) will be derived from this graph — so every edge must carry inspectable evidence. Never invent relationships.

# Single-page UX flow (think carefully)
One continuous freeform canvas (infinite pan/zoom), not multi-route dashboard.

1. **Land** — calm empty-ish canvas with Augusto as ego; soft ambient background; glass HUD floating (not a heavy sidebar wall).
2. **Mode pill** (glass): **Path** | **Lineage** — mutually exclusive layouts and legal edge sets.
3. **Path mode** — force or organic canvas layout. Goal: find honest paths to targets (DeepMind, SFI). Highlight only top-ranked paths (≤3). Edge visual weight by basis (coauthorship/joint_project strong; shared_field/venue dashed & thin). Unverified (empty urls) badged and muted.
4. **Lineage mode** — vertical depth levels (Sugiyama/layered): hop distance from selected root. Tree edges (phd_advisor, research_group) vertical; peer coauthorship within a level as cross-links. Expand/collapse, focus-as-root, breadcrumb. Do not mix university-scale shared_institution into lineage distance.
5. **Select node/edge** — glass inspector sheet: blurb, profiles (Scholar/LinkedIn/site), evidence packet (claim, basis chip, clickable URLs), strongest bridges. Selecting is how you “dive deeper,” not page navigation.
6. **Command/palette** (optional Cmd-K): search node, switch mode, fit, export JSON.
7. Mobile: bottom glass sheet + dismiss; preserve zoom; no crazy auto-fit on fullscreen.

# Design preferences (apply from the start)
- Aesthetic: scholarly, calm, cinematic — liquid glass (frosted translucent panels, soft blur, subtle specular borders), deep charcoal/ink canvas, accent mint/teal + warm gold for targets only.
- Freeform canvas as the primary interaction metaphor (pan, zoom, drag nodes gently).
- Typography elegant and readable; sparse chrome; personality without clutter.
- Respect prefers-reduced-motion; mute any ambient audio by default (skip audio in v1).
- Honesty chrome before decoration: weak/unverified edges must never look as strong as coauthorship.

# Data model (hard rules)
- Source of truth: JSON graph (nodes + edges), extract/seed from the attached HTML NETWORK_DATA.
- Node: id, label, kind (person|lab|institution|university), blurb, tags, candidate?, target?, profiles?, evidence_packet {urls, notes}.
- Edge: source, target, strength 1–10, evidence { claim, basis, urls[], institutional_hop? }.
- Allowed bases: coauthorship, joint_project, shared_appointment, shared_institution, shared_venue, shared_field, phd_advisor, research_group.
- Interests/vibes alone NEVER create edges. Empty urls → unverified badge; do not auto-promote.
- Path mode may use all bases (with visual honesty). Lineage mode filters to phd_advisor, research_group, coauthorship, joint_project only.

# Tech
- Lovable default stack (React + Tailwind + shadcn). Prefer a canvas/graph library fit for freeform + later ELK for lineage (e.g. React Flow / cytoscape — pick what fits SPA best).
- Keep v1 client-side with seeded JSON; schema ready for later DB. Private app — no public scrape of Academic Tree.
- SPA only: no multi-page marketing site.

# First milestone to ship in this build
Beautiful glass canvas SPA with: seeded graph from attachment, Path mode working (select, inspect evidence, top paths to DeepMind/SFI), Lineage mode scaffold (filter legal edges + vertical levels if feasible — otherwise clear placeholder that still shows filtered graph honestly), mode toggle, search, export JSON.

Name vibe: something like “Augusto Network” or “Lineage Canvas” — short, private, calm.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://synodos01.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/970e0d42-f2d6-48f5-b8fd-e8c7719f9755).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
