# Synodos

> σύνοδος — Greek for "journeying together."

Synodos is an evidence-gated explorer for academic and professional networks. It maps who connects to whom on a single pan-and-zoom canvas, and every link is backed by a recorded source. It never invents relationships.

Live app: https://synodos01.lovable.app

## Features

- **Path mode**: shows routes from you to a destination you choose, drawn as hop terraces. Each step is ranked by evidence strength.
- **Lineage mode**: lets you explore academic connections (advisors, committees, co-authors) by relationship hop.
- **People summary** (`/people`): every person in a tree or list, with their hop, the contact they were reached through, and their co-authors.
- **Evidence inspector**: shows each link's sources, quotes, confidence and review status.
- **Research** (invited testers only): bounded 1–3 hop searches using OpenAlex, Firecrawl and Grok. Deterministic rules decide what gets accepted.
- **Your own network**: a wizard that builds a network around you from contacts you name.
- **Sharing**: read-only share links. "Handshake" badges mark people two networks have in common, matched only by identical catalog IDs.
- **Privacy**: account saving and external research are optional and off by default.

## Getting started

Requirements: Node.js 20+ (or Bun).

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev        # http://localhost:8080
```

### Scripts

| Command          | Purpose                    |
| ---------------- | -------------------------- |
| `npm run dev`    | Start the dev server       |
| `npm run build`  | Production build           |
| `npm test`       | Run the Vitest suite       |
| `npm run lint`   | ESLint                     |
| `npm run format` | Prettier                   |

### Environment

The browser client reads `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` from `.env`. These are publishable values. Research also needs server-side secrets (`XAI_API_KEY`, a Firecrawl connection). Never commit those. Without them, the explorer still works fully on the bundled seed network.

## Project layout

```text
src/
  routes/        TanStack Start file routes (/, /people, /shared/$token)
  components/    Canvas, inspector, guides, command panel, wizards
  lib/           Graph logic (network.ts), ingestion, research, sync, privacy
  data/          Seed network and recorded research findings
  test/          Vitest suites
supabase/        Database migrations
docs/            Tester readiness and methodology notes
```

Architecture rules are in [`AGENTS.md`](AGENTS.md) and [`src/components/AGENTS.md`](src/components/AGENTS.md).

## Built with

TanStack Start · React 19 · TypeScript · Tailwind CSS v4 · Cytoscape · shadcn/ui · Vitest

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
