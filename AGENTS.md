<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep the supplied graph in validated client-side JSON with stable edge IDs derived from original order; this preserves claims and parallel relationships without introducing a backend.
- Use Cytoscape for the freeform canvas, cumulative Path expansion with hop-ranked kind clusters and a non-recursive ghost ring, and legal-edge BFS levels for Lineage; mode-specific graph logic stays independent of presentation and left-to-right progress does not establish relationship direction.
- Treat all graph links as undirected traversal unless a claim explicitly establishes direction; root-relative lineage levels are relationship hops, not generations or advisor claims.
- Keep all canvas colors and glass styling in global semantic tokens; Cytoscape reads these tokens at runtime to match HTML controls.
- Anchor the selection halo to Cytoscape rendered node coordinates on pan, zoom, position, and resize events; this keeps presentation-only motion aligned without modifying graph data.

- Store committee as a distinct lineage-legal basis and PhD institution as a Path-only factual basis; this preserves chair/committee distinctions without counting universities as lineage hops.
- Append imported edges without reordering the seed, preserve prior evidence on in-place upgrades, and retain URL accessibility checks separately from reported confidence; this keeps edge IDs stable and accessibility distinct from claim verification.
- Gate every Augusto-rooted traversal through the four explicit ego-gateway edges; affiliations remain factual evidence but never imply first-degree social proximity.
- Keep both Path destinations in the graph and permanent destination controls, and distinguish relevance ghosts from evidence weakness; exploration must not hide goals or promote unsupported claims.
- Render Lineage from explicit cumulative node expansion with bounded context previews, legal-edge BFS bands and chair-prioritized placement; this keeps hop depth honest while enabling multi-branch exploration.
- Intercept horizontal-dominant wheel gestures only for canvas panning and leave vertical zoom and pinch to Cytoscape; this prevents sideways trackpad motion from changing scale.
- Express the interface through the tokenized Trail cartography system with map details confined to presentation; this keeps graph meaning and evidence semantics independent from visual styling.
- Store major distinctions as optional sourced node metadata and render them only in the relevant view; this preserves evidence provenance without changing graph traversal semantics.

- Preserve Path viewport scale and existing node positions on selections, target picks and expansions, fitting active routes only explicitly or on mode changes; this prevents evidence exploration from sacrificing readability.
- Clear expansion state on mode changes and keep ranked routes collapsible; this prevents stale branches and protects canvas space.
- Dock the itinerary and evidence record outside a dedicated canvas region, with rendered-coordinate accessible hit targets; this protects graph space and reliable selection.
- Bound cross-branch discovery to recorded legal links into tagged packets, excluding ego and the Capra gateway; this avoids presenting a shared origin as an advisor connection.
- Derive closed cartographic superlevel contours from visible non-ghost hop geometry behind Cytoscape; this gives elevation a recorded relationship meaning without modifying traversal or evidence.
- Anchor contour labels to their own hop entry and bound their rendered text to the visible canvas; this prevents hull extrema and zoom from detaching or clipping labels.
- Keep private-attestation markers non-interactive below node hit targets; this preserves reliable person selection while evidence remains inspectable through relationships.
- Frame an expanded Lineage parent, immediate recorded children, root, and first-hop gateways within the unobscured canvas, excluding context previews; this reveals new depth without losing the shared origin or fitting ghosts.
- Stagger direct-gateway labels at every scale and suppress clipped off-route labels; this preserves readable names without changing graph placement or evidence.
- Wrap inspector actions and temporarily collapse the narrow itinerary while a record is open; this avoids horizontal overflow and competing panels while retaining itinerary state.
- Anchor narrow private-attestation markers to visible relationship endpoints with fixed rendered offsets; this keeps visual-only provenance attached during pan and zoom.
- Render narrow Path waypoints in vertical itinerary order and use a bounded draggable record sheet; this protects readable labels and selected-node visibility without fitting the whole graph on selection.
