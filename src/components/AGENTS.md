## Search
- Use cmdk for keyboard search navigation while keeping graph data entirely client-side; this provides predictable arrow-key selection.
- Anchor the selection halo to Cytoscape rendered node coordinates on pan, zoom, position, and resize events; this keeps presentation-only motion aligned without modifying graph data.
- Anchor contour labels to their own hop entry and bound their rendered text to the visible canvas; this prevents hull extrema and zoom from detaching or clipping labels.
- Keep private-attestation markers non-interactive below node hit targets; this preserves reliable person selection while evidence remains inspectable through relationships.
