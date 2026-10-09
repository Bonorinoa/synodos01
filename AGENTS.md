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
- Store each uploaded or created network as a validated browser-local artifact with an owner id; the bundled seed is only the default, and traversal reads the active artifact.
- Uploads stay pending; deterministic research checks may accept sourced claims, recording automated vs owner review without raising confidence. Keep rejections and differing claims separate.
- Use Cytoscape for the freeform canvas, desktop Path as concentric hop terraces rotated toward the active destination, and legal-edge BFS levels for Lineage; mode-specific graph logic stays independent of presentation and left-to-right progress does not establish relationship direction.
- Treat all graph links as undirected traversal unless a claim explicitly establishes direction; root-relative lineage levels are relationship hops, not generations or advisor claims.
- Keep canvas colors and glass in global semantic tokens read by Cytoscape; HTML and canvas stay consistent.

- Store committee as a distinct lineage-legal basis and PhD institution as a Path-only factual basis; this preserves chair/committee distinctions without counting universities as lineage hops.
- Append imported edges without reordering the seed, preserve prior evidence on in-place upgrades, and retain URL accessibility checks separately from reported confidence; this keeps edge IDs stable and accessibility distinct from claim verification.
- Gate every Augusto-rooted traversal through the four explicit ego-gateway edges; affiliations remain factual evidence but never imply first-degree social proximity.
- Keep both Path destinations in the graph and permanent destination controls, and distinguish relevance ghosts from evidence weakness; exploration must not hide goals or promote unsupported claims.
- Render Lineage from explicit cumulative node expansion with bounded context previews, legal-edge BFS bands and chair-prioritized placement; this keeps hop depth honest while enabling multi-branch exploration.
- Store major distinctions as optional sourced node metadata and render them only in the relevant view; this preserves evidence provenance without changing graph traversal semantics.

- Preserve Path scale on target picks; selections may frame recorded neighbors and expansions auto-fit them, excluding ghosts, to keep evidence exploration clear of floating records.
- Clear expansion on mode changes and keep ranked routes collapsible; this prevents stale branches and saves canvas space.
- Float controls and records over the canvas; frame the unobscured region and keep rendered-coordinate hit targets.
- Bound cross-branch discovery to recorded legal links into tagged packets, excluding ego and the Capra gateway; this avoids presenting a shared origin as an advisor connection.
- Derive closed contours from visible non-ghost hop geometry (terrace circles on desktop Path, superlevel hulls elsewhere); elevation stays a recorded hop meaning.
- Frame an expanded Lineage parent, immediate recorded children, root, and first-hop gateways within the unobscured canvas, excluding context previews; this reveals new depth without losing the shared origin or fitting ghosts.
- Render narrow Path waypoints in vertical itinerary order and use a bounded draggable record sheet; this protects readable labels and selected-node visibility without fitting the whole graph on selection.

- Encode node kind through shapes with destination-only diamonds and zoom-clamped size hierarchy; this prevents decorative color from implying evidence quality.
- Render one depth-sorted hop label per band without relationship-type assumptions; this preserves honest distance labels.

- Frame selection and expansion against record bounds; observe sheet resizes and exclude peripheral Path context.
- Present exploration as mission → story → evidence, with one prominent contextual surface; this reduces overload without changing graph meaning.
- Methodology docs render route-cost and traversal values from shared constants; docs cannot drift from logic.
- Bounded Firecrawl research retains quotes and dated checks; deterministic rules, never AI decisions, govern acceptance. Never execute discovered tools.
- Refresh active browser-network indexes on artifact saves without remounting the canvas; destination edits must preserve exploration state.
- Coordinate graph positions and camera with one interruptible critically damped transition and coalesce overlay updates per animation frame; reduced motion applies instantly.
- Keep the header to mark, mode toggle and one command-panel button; secondary features live in that pane so the map stays uncluttered.
- Separate product identity from artifact titles; share the mark and favicon to preserve user network names.
- Research is authenticated direct Grok over Firecrawl text, ≤3 bounded passes. Deterministic acceptance preserves confidence; snapshots stay pending except explicit owner approval. Never infer ego links.
- Accounts mirror local networks per user (newest wins, saves push); DB invite checks gate storage and paid research.
