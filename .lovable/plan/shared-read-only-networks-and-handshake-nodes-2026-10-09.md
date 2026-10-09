# Shared read-only networks and handshake nodes

## What you get
- **Share link**: In the command panel, "Share this network" creates a private link. You can turn it off any time; turning it off stops all future views.
- **Signed-in friends only**: Anyone opening the link must sign in with Google first. You see a list of who opened it. They don't need to be on your tester list just to view.
- **Read-only view**: Your network opens in its own separate view, labeled "Viewing Augusto's network · read-only". Their own networks are never touched, merged or overwritten. Editing, research, review and saving are hidden. Path and Lineage both work, and evidence and sources can be inspected.
- **Handshakes**: If the viewer has their own network, people who appear in both get a handshake badge. Two records count as the same person only when both point to the same academic catalog (OpenAlex) entry; matching names alone don't count. A "Where our circles meet" list shows each handshake person with their hop distance from each of you. No new links are created from a handshake.
- **Honest gaps**: Many current records don't have a catalog ID yet, so they can't form handshakes. The view says so instead of guessing. New research saves catalog IDs, and IDs only get added to existing people when a catalog search finds an exact match.

## Steps
1. Add an optional catalog ID to people: research saves the OpenAlex author ID it already uses, and the person record shows it.
2. Backend: a share-links table (owner, network, random token, on/off, created), plus a log of who opened each link. Only the owner can create links or turn them off. A sign-in-required lookup returns the network snapshot for a valid, active token and records the viewer.
3. A new shared-view page that opens from the link, prompts sign-in when needed, and loads the snapshot into a read-only explorer that is never written to local storage or account saving.
4. Handshake matching that compares catalog IDs between the shared snapshot and the viewer's active network, plus the badge on the canvas and the "Where our circles meet" list.
5. Share controls in the command panel: create/copy link, turn it off, and see who opened it.
6. Add a note to the privacy choices: sharing is off by default and you choose to share each network yourself.
7. Tests: read-only view never saves, handshakes need catalog IDs that match exactly, links that are turned off stop working, and non-owners can't create links. Then check the flow while signed in.

## Technical details
- Tables: `network_shares(id, owner_id, network_id, token unique, active bool default true, created_at)` and `network_share_views(share_id, viewer_id, viewed_at)`, both with GRANTs and RLS. Owners can read and change only their own rows. Viewers get no direct table access.
- `get_shared_network(_token text)` is a security-definer function. It requires `auth.uid()`, checks that the link is active, inserts a view row, and returns `networks.data` for the owner and network.
- The route is `/shared/$token`, client-only, and requests the snapshot through a server function that requires sign-in. Head metadata is noindex.
- Read-only mode is a provider flag that blocks artifact saves, cloud-sync pushes and research. The artifact is held in memory only.
- `catalog_id` is optional on nodes (`openalex:A…`). Handshake = intersection of the two networks' catalog_id sets. Graph traversal stays exactly the same.
