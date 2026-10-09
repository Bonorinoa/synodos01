import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { NetworkExplorer } from '@/components/network-explorer';

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'Synodos — Academic Family Tree & Network Paths' },
    { name: 'description', content: 'Map your academic family tree: sourced advisor, committee and co-author links, honest paths to people you want to reach, and evidence you can check.' },
    { property: 'og:title', content: 'Synodos — Academic Family Tree & Network Paths' },
    { property: 'og:description', content: 'Map your academic family tree with sourced links and trace honest paths through your own network.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { property: 'og:url', content: 'https://synodos01.lovable.app/' },
  ], links: [{ rel: 'canonical', href: 'https://synodos01.lovable.app/' }] }),
  component: Index,
});

function Index() {
  // Networks live in this browser's storage, so the canvas renders only on the client.
  return <ClientOnly fallback={<div className="network-app" aria-busy="true"/>}><NetworkExplorer/></ClientOnly>;
}
