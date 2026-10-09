import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { NetworkExplorer } from '@/components/network-explorer';

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'Network Atlas — Evidence & Lineage Canvas' },
    { name: 'description', content: 'A private, evidence-gated canvas for your academic relationships, discovered connections, target paths, and intellectual lineage.' },
    { property: 'og:title', content: 'Network Atlas — Evidence & Lineage Canvas' },
    { property: 'og:description', content: 'Explore verifiable relationships, inspect their sources, and trace honest paths through your own network.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: Index,
});

function Index() {
  // Networks live in this browser's storage, so the canvas renders only on the client.
  return <ClientOnly fallback={<div className="network-app" aria-busy="true"/>}><NetworkExplorer/></ClientOnly>;
}
