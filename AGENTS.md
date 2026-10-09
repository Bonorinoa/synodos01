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
- Share global semantic color/glass tokens between HTML and Cytoscape.

- Store committee as a distinct lineage-legal basis and PhD institution as a Path-only factual basis; this preserves chair/committee distinctions without counting universities as lineage hops.
- Append imported edges without reordering the seed, preserve prior evidence on in-place upgrades, and retain URL accessibility checks separately from reported confidence; this keeps edge IDs stable and accessibility distinct from claim verification.
- Gate every Augusto-rooted traversal through the four explicit ego-gateway edges; affiliations remain factual evidence but never imply first-degree social proximity.
- Keep both Path destinations in the graph and permanent destination controls, and distinguish relevance ghosts from evidence weakness; exploration must not hide goals or promote unsupported claims.
- Render Lineage from explicit cumulative node expansion with bounded context previews, legal-edge BFS bands and chair-prioritized placement; this keeps hop depth honest while enabling multi-branch exploration.
- Store major distinctions as optional sourced node metadata and render them only in the relevant view; this preserves evidence provenance without changing graph traversal semantics.

- Bound cross-branch discovery to recorded legal links into tagged packets, excluding ego and the Capra gateway; this avoids presenting a shared origin as an advisor connection.
- Present exploration as mission → story → evidence, with one prominent contextual surface; this reduces overload without changing graph meaning.
- Methodology docs use shared route-cost and traversal constants.
- Bounded Firecrawl research retains quotes and dated checks; deterministic rules, never AI decisions, govern acceptance. Never execute discovered tools.
- Refresh active browser-network indexes on artifact saves without remounting the canvas; destination edits must preserve exploration state.
- Coordinate graph positions and camera with one interruptible critically damped transition and coalesce overlay updates per animation frame; reduced motion applies instantly.
- Keep the header to mark, mode toggle and one command-panel button; secondary features live in that pane so the map stays uncluttered.
- Separate product identity from artifact titles; share the mark and favicon to preserve user network names.
- Research is authenticated direct Grok over Firecrawl text, ≤3 bounded passes. Deterministic acceptance preserves confidence; snapshots stay pending except explicit owner approval. Never infer ego links.
- Account sync and external research require separate default-off, versioned browser opt-ins per user; research verifies explicit request consent before providers. Invite checks gate both.
- Shared networks are opt-in per-network links read via a sign-in-only definer function into an in-memory read-only view that blocks all saves; handshakes match only identical catalog IDs and add no edges.
