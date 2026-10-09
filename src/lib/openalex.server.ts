import { normalizeLabel, type Finding } from '@/lib/ingest';

/** OpenAlex: open scholarly catalog (Google Scholar has no sanctioned API). Co-authorship is read from author lists, never inferred. */
const BASE = 'https://api.openalex.org';
const MAILTO = 'mailto=research@synodos.app';
/** Catalog display name → the name used in this network, so one person never becomes two nodes. */
export const catalogAliases = new Map<string, string>();
export const OPENALEX = { worksPerAuthor: 50, coauthorsPerAuthor: 6, minSharedWorks: 1 } as const;

type Author = { id: string; display_name: string; works_count: number; last_known_institutions?: { display_name: string }[]; affiliations?: { institution: { display_name: string } }[] };
type Work = { id: string; doi?: string | null; display_name?: string; publication_year?: number; authorships: { author: { id: string; display_name: string } }[] };

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}${MAILTO}`);
  if (!response.ok) { const body = await response.text(); throw new Error(`OpenAlex request failed [${response.status}]: ${body.slice(0, 200)}`); }
  return response.json() as Promise<T>;
}

/** Exact-name match only; a hint must match an institution when several namesakes exist, otherwise the person is skipped as ambiguous. */
export async function resolveAuthor(name: string, hint: string): Promise<Author | null> {
  const { results } = await get<{ results: Author[] }>(`/authors?search=${encodeURIComponent(name)}&per-page=10`);
  // Fragmentary records (a handful of works) are usually split namesake profiles, not the person.
  const compact = (v: string) => normalizeLabel(v).replace(/ /g, '');
  const tokens = (v: string) => normalizeLabel(v).split(' ').filter(Boolean);
  const exactOnly = results.filter(a => compact(a.display_name) === compact(name) && a.works_count >= 5);
  // A catalog variant with extra initials ("C. Mónica Capra") counts only when the affiliation hint confirms it.
  const variants = hint ? results.filter(a => a.works_count >= 5 && tokens(name).every(t => tokens(a.display_name).includes(t))) : [];
  const insts = (a: Author) => normalizeLabel([...(a.last_known_institutions ?? []).map(i => i.display_name), ...(a.affiliations ?? []).map(x => x.institution.display_name)].join(' '));
  const hintWords = normalizeLabel(hint).split(' ').filter(w => w.length > 3);
  const byHint = (list: Author[]) => hintWords.length ? list.filter(a => hintWords.some(w => insts(a).includes(w))) : list;
  const hinted = byHint(exactOnly).length ? byHint(exactOnly) : byHint(variants);
  if (hinted.length === 1) return hinted[0]!;
  // Several namesakes: accept the dominant record only when it clearly outweighs the rest.
  const sorted = [...hinted].sort((a, b) => b.works_count - a.works_count);
  if (sorted.length > 1 && sorted[0]!.works_count >= 5 * Math.max(1, sorted[1]!.works_count)) return sorted[0]!;
  return null;
}

export async function coauthorFindings(name: string, hint: string, date: string, trace: string[]): Promise<Finding[]> {
  const author = await resolveAuthor(name, hint);
  if (!author) { trace.push(`OpenAlex: no unambiguous author record for “${name}” — skipped`); return []; }
  catalogAliases.set(normalizeLabel(author.display_name), name);
  const id = author.id.split('/').pop();
  const { results } = await get<{ results: Work[] }>(`/works?filter=author.id:${id}&sort=publication_year:desc&per-page=${OPENALEX.worksPerAuthor}&select=id,doi,display_name,publication_year,authorships`);
  const shared = new Map<string, { name: string; works: Work[]; id: string }>();
  for (const work of results) {
    // Large consortium papers say nothing about a working relationship.
    if (work.authorships.length > 12) continue;
    for (const { author: co } of work.authorships) {
      if (co.id === author.id || !co.display_name) continue;
      const entry = shared.get(co.id) ?? { name: co.display_name, works: [], id: co.id };
      entry.works.push(work); shared.set(co.id, entry);
    }
  }
  const top = [...shared.values()].filter(e => e.works.length >= OPENALEX.minSharedWorks).sort((a, b) => b.works.length - a.works.length).slice(0, OPENALEX.coauthorsPerAuthor);
  trace.push(`OpenAlex: ${author.display_name} → ${results.length} works, ${top.length} co-authors kept`);
  return top.map(entry => ({
    from: { label: name, kind: 'person' as const, catalog_id: `openalex:${id}` },
    to: { label: catalogAliases.get(normalizeLabel(entry.name)) ?? entry.name, kind: 'person' as const, catalog_id: `openalex:${entry.id.split('/').pop()}` },
    basis: 'coauthorship' as const,
    claim: `Co-authored ${entry.works.length} indexed work${entry.works.length > 1 ? 's' : ''}, e.g. “${entry.works[0]!.display_name ?? 'untitled'}” (${entry.works[0]!.publication_year ?? 'n.d.'}).`,
    sources: entry.works.slice(0, 2).map(work => ({
      url: work.id.replace('https://openalex.org/', 'https://api.openalex.org/works/'),
      title: work.display_name ?? 'OpenAlex work',
      retrieved_at: date, checked_at: date, status: 200, accessible: true,
      // Literal record text: title plus the author list as stored in OpenAlex.
      excerpt: `${work.display_name ?? ''} — authors: ${work.authorships.map(a => a.author.display_name).join(', ')}`,
    })),
  }));
}
