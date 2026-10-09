import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { PeopleSummary } from "@/components/people-summary";

export const Route = createFileRoute("/people")({
  head: () => ({ meta: [
    { title: "People summary — Synodos" },
    { name: "description", content: "Every person in your Synodos network with their hop distance and recorded co-authors, as a tree or list." },
    { property: "og:title", content: "People summary — Synodos" },
    { property: "og:description", content: "Browse your network as a hop tree or a sortable list of people and co-authors." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => <ClientOnly fallback={<div className="people-page"><Link to="/">← Back to map</Link></div>}><PeopleSummary /></ClientOnly>,
});
