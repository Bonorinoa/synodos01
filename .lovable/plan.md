# Pixel Observatory redesign

## Goal
Keep the single-canvas, evidence-first network experience while shifting its mood from military/space instrumentation to a playful, mature pixel observatory. Apply the selected direction consistently to both Path and Lineage, with special attention to graph flow and information popups.

## Visual system
- Replace the current blue-charcoal theme with the selected Ink & Coral palette: deep ink `#15171A`, mist blue `#84C7D0`, coral `#F08080`, and restrained gold `#F1D58A`, expressed through semantic design tokens.
- Use Space Mono for headings, labels, and compact readouts; use Rubik for body copy and evidence descriptions.
- Introduce sparse, curated pixel background motifs: a low-contrast grid, small botanical/topographic tile clusters, stepped corner marks, and subtle depth bands. Keep the graph more prominent than the decoration.
- Replace soft sci-fi glass and pill-heavy styling with crisp observatory rails, squared pixel details, fine borders, minimal stepped shadows, and restrained translucency.

## Canvas and graph flow
- Restyle Cytoscape nodes as a coherent pixel symbol family while preserving distinct person, lab, institution, university, direct-contact, target, candidate, ghost, and confidence states.
- Keep Lineage’s cortex/tree layering quiet at overview scale; strengthen the visual hierarchy between root, four direct branches, visible descendants, and collapsed context without increasing label size.
- Keep Path’s left-to-right journey, persistent destinations, ranked paths, ghost ring, and node expansion behavior unchanged, but express stages with clearer pixel-era landmarks and calmer connectors.
- Refine selection feedback into a restrained stepped pulse around the chosen node; retain reduced-motion behavior.
- Preserve horizontal-wheel panning, vertical zoom, touch/pinch behavior, viewport persistence, and all evidence semantics.

## Controls and navigation
- Recompose the top area as a compact observatory rail with the wordmark, mode switch, and search aligned as one system rather than floating military-style instruments.
- Restyle breadcrumbs, target controls, legends, counters, and canvas tools with compact square geometry and clearer grouping.
- Improve visual flow by reducing competing overlays and reserving coral for active focus, blue for navigable structure, and gold for destinations or exceptional evidence markers.

## Information popup redesign
- Turn node and relationship popups into a layered evidence console with a strong header, compact identity metadata, clearly separated evidence records, source status, relationship actions, and endpoint navigation.
- Preserve every existing field and action: profiles, evidence notes, source links, blocked/unreachable status, confidence, private attestation, strongest bridges, Path expand/collapse, and Lineage focus/collapse.
- Make source quality and verification status scannable without inventing “verified” claims; the visual treatment must continue distinguishing sourced, blocked, low-confidence, and URL-free evidence.
- Keep desktop as a right-side console and mobile as a dismissible bottom sheet with safe scrolling and no graph zoom reset.

## Responsive and quality checks
- Tune the selected desktop composition for compact desktop and mobile without shrinking text below legible sizes or allowing overlays to collide.
- Verify Path overview, each target journey, cumulative expansion, ghost context, Lineage root/collapse/focus, search, evidence inspection, canvas controls, and JSON export.
- Visually inspect desktop, compact desktop, and mobile for clipped text, overlap, excessive decoration, weak contrast, popup readability, and graph visibility.
- Confirm the current tests still pass and the preview reports no build or runtime errors.

## Technical notes
- Keep graph data and traversal logic unchanged; this is a presentation and interaction-flow redesign.
- Define palette, pixel ornament, borders, and shadows as global semantic tokens; Cytoscape continues resolving those tokens at runtime.
- Update the root font links to Space Mono and Rubik, then apply the selected prototype’s structure through the existing React controls and Cytoscape canvas rather than replacing the app shell.
