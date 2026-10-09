# Onboarding, Methodology Docs, Nobel Highlight, Branch Fix, and Research Agent

## 1. Guided tutorial (first visit + replay)
- A short step-by-step walkthrough (about 6 steps) that points at real parts of the screen: the Path / Lineage toggle, choosing a destination, the route itinerary, opening a record and its evidence, the Lineage branches, and Your data.
- Each step shows a soft spotlight on its target, with Back / Next / Skip and a "3 of 6" counter. It works by keyboard (arrows, Esc) and fits on phones, where the card sits as a bottom card.
- Runs once per browser on first visit. A "?" button in the top bar replays it, which counts as one icon, not a new menu.
- Steps that need a state (for example a destination being picked) set it up themselves and put things back when the tour ends.

## 2. "How it works" docs window
- Opened from the same "?" button ("Take the tour" / "How it works") and from "About this view".
- It is a large glass window with tabs: **Path**, **Lineage**, **Evidence & review**, **Building a network**.
- Each tab gives a plain explanation, then a pseudo-algorithm in monospace that matches the real logic:
  - Path: the edge cost for each relationship type, the penalty for unreviewed links, the ego-gateway rule, top-3 routes, and how the faded context ring works.
  - Lineage: which relationship types count, breadth-first hop levels, why hops are not generations, chair-first placement, and how cross-branch discovery works.
  - Evidence: confidence, private attestations, the pending → reviewed / rejected states, and what cleanup does.
- The text is written from the real code values so it can't drift. Each value shown comes from the same constants the app uses.

## 3. Nobel laureate highlight
- Any person with a sourced Nobel distinction gets a soft, slowly pulsing ochre glow ring on the canvas in both modes. The star badge is kept. The glow follows pan and zoom the same way the selection halo does.
- A small chip, "1 Nobel laureate in this network", focuses the laureate when clicked. It appears only when at least one exists.
- In Lineage, the laureate's record shows "N hops from you" (or "Not reachable through recorded links"), computed from legal edges only.
- Respects reduced-motion settings, where the ring is static. It never makes a link look stronger.

## 4. Branch buttons fix ("Lauría pops back up")
- Look into it first: the cause is unconfirmed. The likely suspects are that expanding a branch also adds its parent chain (the root, other gateways) to the expanded set, and that collapse removes only one id. Together these would re-open siblings and inflate "N of 4 explored".
- Fix: track the branch expansion per gateway, so collapsing removes that branch's whole subtree and the count only includes gateways.
- Audit the related state for the same kind of bug: mode switches, the destination picker, and the "Hide provisional" toggle resetting selection. Check that buttons don't trigger twice through canvas taps.
- Add a test that reproduces it: expand Lauría → collapse → expand Capra, and Lauría stays collapsed.

## 5. Build a network from a bio (replaces file-first upload)
In Your data, a new "Start from a bio" flow sits as the main option. File upload moves to an "Advanced" section.
- Inputs: a paragraph-long bio, plus named people and institutions (for example "my advisor X, coauthor Y, dream places DeepMind, SFI").
- **Option A, copy an agent prompt:** builds a ready prompt containing your bio, the names, our findings-file format, and strict rules (a source URL and retrieval date for every link, never invent anything). Paste it into Claude, Grok, or similar, then drop the reply back in. It stays fully in the browser.
- **Option B, research it for me:** an in-app AI researcher drafts findings with sources, which go through the existing import preview. Everything lands as **unreviewed**, so nothing joins your map until you approve it.
  - Requires turning on Lovable Cloud, used here only to run the AI call; your networks stay stored in this browser. It uses Lovable AI credits per run.
  - Honest limits: the AI may only report links it can cite with a URL. Links without a URL are dropped and listed. Every URL is shown so you can check it.

## 6. "Where do you want to go?" card: no overlap, destinations you choose
- The big centred card currently covers the graph. It becomes a compact glass card pinned top-left under the stats line, and the camera frames the graph in the clear space beside it. On phones it becomes a short card at the bottom with the graph framed above it.
- Destinations are your own input, not fixed buttons. The card has a field: "Type a place you'd love to work or collaborate with…".
  - If the place matches a record in your network, it becomes a destination.
  - If not, it is added as a new destination with no links yet, marked "No recorded path yet". It can also be passed to the research agent (section 5) to look for ways in.
- Your saved destinations show as small removable chips. The top-bar picker lists the same ones.
- Destinations are saved in this browser with the network.

## Technical details
- New pieces: tour component (spotlight via target selectors and a `data-tour` attribute, localStorage flag `an:tour-done`), docs dialog, Nobel glow layer next to the existing halo overlay, and a `bio-research` panel in the workspace.
- The research agent is a `createServerFn` on Lovable Cloud using the AI Gateway (default model, streaming, strict JSON schema output matching `findingsFileSchema`). Results are validated with the existing `parseFindings` → `ingestFindings` and pass through staging. 402 and 429 errors are shown in plain language.
- The prompt generator is a pure function shared by both options, so they ask for identical rules.
- Lineage expansion state changes from a flat `Set` to per-branch tracking; tests are added in `network.test.ts`.
- Graph data, evidence, and traversal rules stay unchanged; the only new top-bar control is a single "?" icon.
- AGENTS.md: add rules for the tour/docs-from-constants approach and for server-side research producing only pending findings.
