import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COST, lineageBases, weakBases } from '@/lib/network';
import { discoveryBases } from '@/lib/ingest';
import { RESEARCH } from '@/lib/research';

const tabs = ['Path', 'Lineage', 'Evidence & review', 'Building a network'] as const;
const list = (s: Set<string> | readonly string[]) => [...s].map(b => b.replaceAll('_', ' ')).join(', ');

export function MethodDocs({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Path');
  return <div className="docs-backdrop" onClick={onClose}><article className="docs-sheet glass" role="dialog" aria-modal="true" aria-label="How it works" onClick={e => e.stopPropagation()}>
    <header><h2>How it works</h2><Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X /></Button></header>
    <div className="docs-tabs" role="tablist">{tabs.map(t => <Button key={t} role="tab" size="sm" variant={tab === t ? 'secondary' : 'ghost'} aria-selected={tab === t} onClick={() => setTab(t)}>{t}</Button>)}</div>
    {tab === 'Path' && <>
      <p>Path looks for routes from you to a destination that you would miss by looking only at your direct contacts. Every route must start through one of your confirmed direct contacts, then follows recorded links. Cheaper routes rely on stronger, better-sourced links.</p>
      <h3>Cost of one link</h3>
      <pre>{`cost(link) = ${COST.base}
  + (10 − strength) / 10
  + ${COST.weakBasis}   if basis ∈ {${list(weakBases)}}
  + ${COST.sharedAppointment}   if basis = shared appointment
  + ${COST.noSource}   if the link has no source URL
  + ${COST.unreviewed}   if the link is still unreviewed
  + ${COST.lowConfidence} / ${COST.mediumConfidence}   for low / medium confidence
  + ${COST.institutionalHop}   if it only passes through an institution
  + ${COST.provisional}  if either end is a provisional person`}</pre>
      <h3>Finding routes</h3>
      <pre>{`queue ← [ [you] ]
while queue not empty:
  take the cheapest partial route
  if it ends at the destination: keep it
  if it has ${COST.maxHops} links already: drop it
  extend it along every recorded link
    (links touching you only if they are direct-contact links)
keep the cheapest route per direct contact
show the best ${COST.routes}`}</pre>
      <p>Faded records around a route are nearby context. Fading means “not on this route”, not “weaker evidence”.</p>
    </>}
    {tab === 'Lineage' && <>
      <p>Lineage explores academic family only: {list(lineageBases)}. Shared fields, venues or institutions never count as a step.</p>
      <pre>{`depth[root] ← 0
breadth-first from root over academic links:
  depth[next] ← depth[current] + 1
lay out one band per depth
  place the PhD chair directly below its parent
  place committee members and coauthors beside it
show a branch's deeper rows only when you open it`}</pre>
      <p>A hop is one recorded relationship step. It is not a generation and does not mean someone was anyone’s advisor.</p>
      <h3>Cross-branch discovery</h3>
      <p>For a person, we check for recorded academic links into another branch’s researched packet, never routing through you or that branch’s own contact. If there are none, we say so.</p>
      <h3>Nobel laureates</h3>
      <p>People with a sourced Nobel distinction glow on the map. Their record shows how many academic hops away they are.</p>
      <h3>Counting hops</h3>
      <p>Hops are always counted from you: you are hop 0, your direct contacts hop 1, their advisors, committee members and coauthors hop 2, and those people’s recorded academic links hop 3. A branch can only be opened deeper when such links are actually recorded; otherwise its record says “End of recorded branch”.</p>
    </>}
    {tab === 'Evidence & review' && <ul>
      <li><b>Sourced</b>: the link has at least one public URL. Links without a URL always show as unverified.</li>
      <li><b>Private attestation</b> (lock): you vouch for it yourself; it is not public.</li>
      <li><b>Unreviewed</b>: found by a tool or assistant. Kept dashed and penalised in routes until you approve it.</li>
      <li><b>Rejected</b> findings are remembered and never re-imported.</li>
      <li><b>Cleanup</b> removes unlinked records, exact duplicate links and repeated sources. It never merges links with different descriptions.</li>
    </ul>}
    {tab === 'Building a network' && <>
      <p>Open <b>Your data</b> → <b>Start from a bio</b>. Write a short bio and list people you know. Either let the research assistant search the web, or copy the prompt into your own agent and paste its reply.</p>
      <pre>{`for each named contact:
  search for coauthors, PhD advisor, committee
  keep a finding only if it cites a public URL
findings → preview → you approve or reject each one`}</pre>
      <p>Allowed link types for findings: {list(discoveryBases)}.</p>
      <h3>What gets searched, and with what</h3>
      <p>Firecrawl searches public web pages and retrieves their text with search + scrape. Queries look for publication author lists (DOI, DBLP, OpenAlex, RePEc and arXiv), university pages, CVs and dissertation committee records. These are search candidates, not a guarantee that every index is queried or accessible. No logins or Academic Tree scraping.</p>
      <pre>{`up to ${RESEARCH.contacts} named contacts per run\n  ${RESEARCH.queriesPerContact} queries per contact; ${RESEARCH.resultsPerQuery} results per query\n  retrieve at most ${RESEARCH.pages} source pages\nAI extracts claims from retrieved text only\n  require a literal excerpt naming both people\n  attach actual source URL + retrieval date + accessibility check\n  stage as low-confidence, unreviewed findings\nowner checks identity and relationship before approval`}</pre>
      <p>A fetched page and matching names do not verify a relationship. The quoted passage stays with its dated source, while accessibility is stored separately. Different claims stay separate. Alexandria is Firecrawl’s tool-discovery index, not an academic evidence database; this pipeline uses web search and does not execute Alexandria tools.</p>
      <p>Using your own agent (for example one with Firecrawl search and scraping) works the same way: copy the prompt, paste the reply, and its findings arrive unreviewed with the tool name recorded.</p>
    </>}
  </article></div>;
}
