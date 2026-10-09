import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { SharedNetwork } from "@/components/shared-network";

export const Route = createFileRoute("/shared/$token")({
  head: () => ({ meta: [
    { title: "Shared network — Synodos" },
    { name: "description", content: "A read-only Synodos network shared with you. Sign in to explore it and see where your circles meet." },
    { property: "og:title", content: "A network shared with you — Synodos" },
    { property: "og:description", content: "Explore a friend's academic network read-only and find people you both know." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: SharedPage,
});

function SharedPage() {
  const { token } = Route.useParams();
  return <ClientOnly fallback={<div className="network-app" aria-busy="true"/>}><SharedNetwork token={token}/></ClientOnly>;
}
