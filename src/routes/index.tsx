import { createFileRoute } from "@tanstack/react-router";
import { NetworkExplorer } from '@/components/network-explorer';

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'Augusto Network — Evidence & Lineage Canvas' },
    { name: 'description', content: 'A private, evidence-gated canvas for Augusto’s academic and social relationships, target paths, and intellectual lineage.' },
    { property: 'og:title', content: 'Augusto Network — Evidence & Lineage Canvas' },
    { property: 'og:description', content: 'Explore verifiable relationships, inspect their sources, and trace honest paths through Augusto’s network.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: Index,
});

function Index() {
  return <NetworkExplorer/>;
}
