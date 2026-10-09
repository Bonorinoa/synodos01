import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { edges, egoId, graph, nodeById, isPending, type NetworkEdge } from '@/lib/network';

type Row = { id: string; hop: number | null; parent: string | null; coauthors: string[]; others: { id: string; basis: string }[] };

/** Hop tree over all recorded links; Augusto is reached only through ego-gateway edges. */
function buildRows(): Row[] {
  const usable = (e: NetworkEdge) => (e.source !== egoId && e.target !== egoId) || e.evidence.ego_gateway === true;
  const depth = new Map([[egoId, 0]]); const parent = new Map<string, string>(); const queue = [egoId];
  for (let i = 0; i < queue.length; i++) { const cur = queue[i]!; for (const e of edges) { if (!usable(e)) continue; const next = e.source === cur ? e.target : e.target === cur ? e.source : null; if (next && !depth.has(next)) { depth.set(next, depth.get(cur)! + 1); parent.set(next, cur); queue.push(next); } } }
  return graph.nodes.filter(n => n.kind === 'person').map(n => {
    const mine = edges.filter(e => e.evidence.basis !== undefined && (e.source === n.id || e.target === n.id) && e.evidence.review_status !== 'rejected');
    const other = (e: NetworkEdge) => (e.source === n.id ? e.target : e.source);
    return { id: n.id, hop: depth.get(n.id) ?? null, parent: parent.get(n.id) ?? null,
      coauthors: mine.filter(e => e.evidence.basis === 'coauthorship').map(other),
      others: mine.filter(e => e.evidence.basis !== 'coauthorship' && nodeById.get(other(e))?.kind === 'person').map(e => ({ id: other(e), basis: e.evidence.basis.replaceAll('_', ' ') + (isPending(e) ? ' · pending' : '') })) };
  });
}

const name = (id: string) => nodeById.get(id)?.label ?? id;

export function PeopleSummary() {
  const rows = useMemo(buildRows, []);
  const [view, setView] = useState<'tree' | 'list'>('tree');
  const [q, setQ] = useState('');
  const byId = new Map(rows.map(r => [r.id, r]));
  const children = (id: string) => rows.filter(r => r.parent === id).sort((a, b) => name(a.id).localeCompare(name(b.id)));
  const match = (r: Row) => !q || `${name(r.id)} ${r.coauthors.map(name).join(' ')}`.toLowerCase().includes(q.toLowerCase());
  const Detail = ({ r }: { r: Row }) => <>
    {r.coauthors.length > 0 && <p><b>Co-authors:</b> {r.coauthors.map(name).join(', ')}</p>}
    {r.others.length > 0 && <p><b>Other links:</b> {r.others.map(o => `${name(o.id)} (${o.basis})`).join(', ')}</p>}
  </>;
  const Branch = ({ id }: { id: string }) => { const r = byId.get(id); const kids = children(id); return <li>
    <details open={(r?.hop ?? 0) < 1}><summary><span className="hop-tag">{r?.hop === 0 ? 'You' : `Hop ${r?.hop}`}</span>{name(id)}{kids.length > 0 && <small> · {kids.length}</small>}</summary>
      {r && <div className="people-detail"><Detail r={r} /></div>}
      {kids.length > 0 && <ul>{kids.map(k => <Branch key={k.id} id={k.id} />)}</ul>}
    </details></li>; };
  const unreached = rows.filter(r => r.hop === null);
  const sorted = [...rows].filter(match).sort((a, b) => (a.hop ?? 99) - (b.hop ?? 99) || name(a.id).localeCompare(name(b.id)));
  return <main className="people-page">
    <header><Link to="/">← Back to map</Link><h1>People summary</h1><p>{rows.length} people. Hops count recorded links from you, starting through your four direct contacts. A hop is a relationship step, not a generation.</p>
      <div className="people-controls"><button aria-pressed={view === 'tree'} onClick={() => setView('tree')}>Tree</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>{view === 'list' && <input placeholder="Filter by name…" value={q} onChange={e => setQ(e.target.value)} />}</div></header>
    {view === 'tree' ? <><ul className="people-tree"><Branch id={egoId} /></ul>{unreached.length > 0 && <section><h2>Not connected to you yet</h2><ul className="people-tree">{unreached.map(r => <li key={r.id}><b>{name(r.id)}</b><div className="people-detail"><Detail r={r} /></div></li>)}</ul></section>}</>
      : <table className="people-table"><thead><tr><th>Person</th><th>Hop</th><th>Reached via</th><th>Co-authors</th></tr></thead><tbody>{sorted.map(r => <tr key={r.id}><td>{name(r.id)}</td><td>{r.hop ?? '—'}</td><td>{r.parent ? name(r.parent) : '—'}</td><td>{r.coauthors.map(name).join(', ') || '—'}</td></tr>)}</tbody></table>}
  </main>;
}
