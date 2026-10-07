# Flag Nobel laureates in Lineage

## Goal
Add a restrained, evidence-backed Nobel distinction to people in the Lineage view without changing graph relationships, hop counts, or Path behavior.

## Plan
1. Audit the people currently present in the graph against NobelPrize.org’s official laureate records. Demis Hassabis is already confirmed as a 2024 Chemistry laureate; no award will be inferred from an employer, collaborator, or institution.
2. Extend person records with optional structured award metadata: prize, year, motivation, and official source URL. Leave all non-laureates unchanged.
3. In Lineage only, mark laureate nodes with a small warm-gold pixel laurel/crown signal that remains legible at normal zoom and does not compete with targets, direct contacts, or evidence strength.
4. Add an accessible label and a compact “Nobel laureate” chip in the information panel, with the prize details and official NobelPrize.org source. The marker will not imply that the award is part of the relationship evidence.
5. Add regression checks for schema validation, mode-specific display, preserved lineage depth/edges, and the confirmed laureate metadata; then visually verify desktop and mobile Lineage views at low and close zoom.

## Technical details
- Keep the award metadata in the existing validated client-side graph JSON.
- Use existing semantic gold/target tokens and Cytoscape classes; no new traversal or ranking logic.
- Keep the marker exclusive to person nodes with an official Nobel source.
