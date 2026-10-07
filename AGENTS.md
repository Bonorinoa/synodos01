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
- Use Cytoscape for the freeform canvas, deterministic horizontal ranked-path unions for Path, and legal-edge BFS levels for Lineage; mode-specific graph logic stays independent of presentation and left-to-right progress does not establish relationship direction.
- Treat all graph links as undirected traversal unless a claim explicitly establishes direction; root-relative lineage levels are relationship hops, not generations or advisor claims.
- Keep all canvas colors and glass styling in global semantic tokens; Cytoscape reads these tokens at runtime to match HTML controls.
- Anchor the selection halo to Cytoscape rendered node coordinates on pan, zoom, position, and resize events; this keeps presentation-only motion aligned without modifying graph data.

- Store committee as a distinct lineage-legal basis and PhD institution as a Path-only factual basis; this preserves chair/committee distinctions without counting universities as lineage hops.
- Append imported edges without reordering the seed, preserve prior evidence on in-place upgrades, and retain URL accessibility checks separately from reported confidence; this keeps edge IDs stable and accessibility distinct from claim verification.
