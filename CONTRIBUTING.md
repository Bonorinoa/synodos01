# Contributing to Synodos

Thanks for helping out. Synodos shows how people are connected, so accuracy matters more than features.

## Ground rules

1. **Never invent relationships.** Every edge needs a recorded basis. A link without a URL stays unverified, low-confidence, and thin/dashed on the canvas.
2. **Links are undirected** unless the claim itself states a direction (for example, a PhD advisor).
3. **Hops are relationship hops**, not generations. Committee membership counts toward lineage. A shared PhD institution counts only in Path mode.
4. **The owner reviews.** Automated checks may accept a sourced claim, but they never raise its confidence. Uploaded links stay pending.
5. **Do not scrape Google Scholar or Academic Tree.** Use OpenAlex or the sources already permitted.
6. **Privacy stays opt-in.** Optional features are off by default and versioned, and consents are never bundled together.
7. **Never commit secrets.** Only publishable keys belong in the repo.

## Development

```sh
npm install
npm run dev
npm test
npm run lint
```

Please read [`AGENTS.md`](AGENTS.md) and [`src/components/AGENTS.md`](src/components/AGENTS.md) before you change graph logic or the canvas. They record decisions that are easy to break by accident.

### Conventions

- Routing: use TanStack Router file routes only, in `src/routes`. Never edit `routeTree.gen.ts`.
- Styling: use the semantic tokens in `src/styles.css`. Don't hardcode colors.
- Server logic: use `createServerFn`. Read `process.env` only inside handlers.
- Do not hand-edit generated files in `src/integrations/supabase/`.
- Respect reduced motion in every animation.
- Keep graph logic (`src/lib/network.ts`) separate from presentation code.

## Pull requests

1. Branch from `main` and keep each PR focused on one change.
2. Add or update tests in `src/test/` for any logic change.
3. Make sure `npm test`, `npm run lint` and `npm run build` all pass.
4. Describe what changed and why, with screenshots for UI work.
5. If you touch `src/data/`, list the source behind every new or changed edge.

## Reporting issues

Please include steps to reproduce, the expected and actual behavior, and your browser. If you're reporting a wrong relationship, name the edge and the source that contradicts it.
