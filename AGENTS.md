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
- Keep canvas colors and glass in global semantic tokens read by Cytoscape; HTML and canvas stay consistent.
- Anchor the selection halo to Cytoscape rendered node coordinates on pan, zoom, position, and resize events; this keeps presentation-only motion aligned without modifying graph data.

- Store committee as a distinct lineage-legal basis and PhD institution as a Path-only factual basis; this preserves chair/committee distinctions without counting universities as lineage hops.
- Append imported edges without reordering the seed, preserve prior evidence on in-place upgrades, and retain URL accessibility checks separately from reported confidence; this keeps edge IDs stable and accessibility distinct from claim verification.
- Gate every Augusto-rooted traversal through the four explicit ego-gateway edges; affiliations remain factual evidence but never imply first-degree social proximity.
- Keep both Path destinations in the graph and permanent destination controls, and distinguish relevance ghosts from evidence weakness; exploration must not hide goals or promote unsupported claims.
- Render Lineage from explicit cumulative node expansion with bounded context previews, legal-edge BFS bands and chair-prioritized placement; this keeps hop depth honest while enabling multi-branch exploration.
- Intercept horizontal-dominant wheel gestures only for canvas panning and leave vertical zoom and pinch to Cytoscape; this prevents sideways trackpad motion from changing scale.
- Keep Trail cartography presentation-only; styling must not change graph meaning or evidence.
- Store major distinctions as optional sourced node metadata and render them only in the relevant view; this preserves evidence provenance without changing graph traversal semantics.

- Preserve Path scale on target picks; selections may frame recorded neighbors and expansions auto-fit them, excluding ghosts, to keep evidence exploration clear of floating records.
- Clear expansion on mode changes and keep ranked routes collapsible; this prevents stale branches and saves canvas space.
- Float atlas controls and evidence records over a full-bleed canvas, with camera framing in the unobscured region and rendered-coordinate accessible hit targets; this maximizes map space without sacrificing selection.
- Bound cross-branch discovery to recorded legal links into tagged packets, excluding ego and the Capra gateway; this avoids presenting a shared origin as an advisor connection.
- Derive closed cartographic superlevel contours from visible non-ghost hop geometry behind Cytoscape; this gives elevation a recorded relationship meaning without modifying traversal or evidence.
- Anchor contour labels to their own hop entry and bound their rendered text to the visible canvas; this prevents hull extrema and zoom from detaching or clipping labels.
- Keep private-attestation markers non-interactive below node hit targets; this preserves reliable person selection while evidence remains inspectable through relationships.
- Frame an expanded Lineage parent, immediate recorded children, root, and first-hop gateways within the unobscured canvas, excluding context previews; this reveals new depth without losing the shared origin or fitting ghosts.
- Reserve wrapped label lanes for narrow gateway bands and selected trails, and suppress clipped off-route labels; this preserves readable names without changing graph placement or evidence.
- Wrap inspector actions and temporarily collapse the narrow itinerary while a record is open; this avoids horizontal overflow and competing panels while retaining itinerary state.
- Anchor narrow attestation markers to visible endpoints with fixed rendered offsets; provenance stays attached during pan and zoom.
- Render narrow Path waypoints in vertical itinerary order and use a bounded draggable record sheet; this protects readable labels and selected-node visibility without fitting the whole graph on selection.

- Encode node kind through shapes with destination-only diamonds and zoom-clamped size hierarchy; this prevents decorative color from implying evidence quality.
- Render one depth-sorted hop label per band without relationship-type assumptions; this preserves honest distance labels.

- Frame selection and expansion against actual record bounds; observe sheet resizes and exclude peripheral Path context so trails and hop rows stay readable without canvas reflow.
