import { z } from 'zod';
import { discoveryBases, normalizeLabel, normalizeUrl, type Finding } from '@/lib/ingest';

export const RESEARCH = { contacts: 4, queriesPerContact: 2, resultsPerQuery: 3, pages: 12, textPerPage: 10000, findings: 24 } as const;
export const researchBriefSchema = z.object({ owner:z.string().max(200), bio:z.string().max(6000), people:z.string().min(1).max(2000), destinations:z.string().max(1000), depth:z.union([z.literal(1),z.literal(2),z.literal(3)]).default(1) });
/** "Name (Institution, field)" → name plus a disambiguation hint used only in search queries. */
export function parseContact(raw:string){const m=raw.trim().match(/^([^()]+?)\s*\(([^)]*)\)\s*$/);return m?.[1]&&m[2]?{name:m[1].trim(),hint:m[2].trim()}:{name:raw.trim(),hint:''};}
export type ResearchSource = { url:string; title:string; markdown:string; status:number|null; retrieved_at:string };
/** Conservative automatic acceptance: authoritative source, contiguous full identities, explicit role, no hedging. */
export function passesAutomaticChecks(finding: Finding): boolean {
  // Co-authorship read from an OpenAlex author list is a catalog fact; owner chose to auto-accept it as co-author only.
  if (finding.basis === 'coauthorship') return finding.sources.some(source => {
    try { if (new URL(source.url).hostname !== 'api.openalex.org' || !source.excerpt || !source.accessible) return false; } catch { return false; }
    // Each listed author must contain every token of the named person (catalog names may add initials).
    const authors = (source.excerpt.split(' — authors: ')[1] ?? '').split(', ').map(a => normalizeLabel(a).split(' '));
    const has = (name: string) => { const want = normalizeLabel(name).split(' ').filter(Boolean); return want.length > 1 && authors.some(a => want.every(t => a.includes(t))); };
    return has(finding.from.label) && has(finding.to.label);
  });
  if (!['phd_advisor', 'committee'].includes(finding.basis)) return false;
  return finding.sources.some(source => {
    if (!source.accessible || source.status === null || source.status === undefined || source.status < 200 || source.status >= 300 || !source.checked_at || !source.excerpt) return false;
    const host = new URL(source.url).hostname.toLowerCase();
    if (!/(\.edu|\.ac\.[a-z]{2})$/.test(host) && host !== 'iza.org' && host !== 'www.iza.org') return false;
    const quote = normalizeLabel(source.excerpt);
    const fullName = (name: string) => new RegExp(`(?:^| )${normalizeLabel(name)}(?: |$)`).test(quote);
    if (!fullName(finding.from.label) || !fullName(finding.to.label) || /\b(possibly|perhaps|might|alleged|uncertain)\b/.test(quote)) return false;
    // Advisor must be adjacent to its named person, not simply occur somewhere on a CV.
    const to = normalizeLabel(finding.to.label);
    return finding.basis === 'phd_advisor'
      ? new RegExp(`\\b(?:advisor|adviser|supervisor) ${to}(?: |$)`).test(quote) && /\b(ph d|phd|doctoral|dissertation)\b/.test(quote)
      : new RegExp(`\\b(?:committee member|committee chair) ${to}(?: |$)`).test(quote);
  });
}
export const extractionSchema = {
  type:'object', additionalProperties:false, required:['findings'], properties:{findings:{type:'array',items:{
    type:'object',additionalProperties:false,required:['from','to','basis','claim','sources'],properties:{
      from:{type:'string'},to:{type:'string'},basis:{type:'string',enum:[...discoveryBases]},claim:{type:'string'},
      sources:{type:'array',items:{type:'object',additionalProperties:false,required:['index','excerpt'],properties:{index:{type:'integer'},excerpt:{type:'string'}}}},
    },
  }}},
};
const extractedSchema = z.object({findings:z.array(z.object({from:z.string().min(1),to:z.string().min(1),basis:z.enum(discoveryBases),claim:z.string().min(1),sources:z.array(z.object({index:z.number().int(),excerpt:z.string().min(20)})).min(1)})).max(RESEARCH.findings)});

/** Only fetched sources with a literal, name-bearing excerpt may enter the review queue. This is not approval. */
export function groundFindings(raw:unknown,sources:ResearchSource[],contacts:string[],date:string) {
  const extracted=extractedSchema.parse(raw);let dropped=0;
  const findings:Finding[]=[];
  const words=(name:string)=>normalizeLabel(name).split(' ').filter(w=>w.length>2);
  const mentions=(text:string,name:string)=>words(name).length>0&&words(name).every(word=>normalizeLabel(text).split(' ').includes(word));
  for(const item of extracted.findings){
    if(!contacts.some(name=>normalizeLabel(name)===normalizeLabel(item.from))||normalizeLabel(item.from)===normalizeLabel(item.to)){dropped++;continue;}
    const grounded=item.sources.flatMap(ref=>{
       const source=sources[ref.index];if(!source||!source.markdown||(source.status===null||source.status<200||source.status>=400))return [];
      const normalized=normalizeLabel(source.markdown),quote=normalizeLabel(ref.excerpt);
      if(!normalized.includes(quote)||!mentions(ref.excerpt,item.from)||!mentions(ref.excerpt,item.to))return [];
      return [{url:source.url,title:source.title,retrieved_at:source.retrieved_at,excerpt:ref.excerpt,checked_at:date,status:source.status,accessible:true}];
    });
    if(!grounded.length){dropped++;continue;}
    findings.push({from:{label:item.from,kind:'person'},to:{label:item.to,kind:'person'},basis:item.basis,claim:item.claim,sources:grounded});
  }
  return {file:{format:'network-findings',version:1,source_tool:'Firecrawl search + scrape / Lovable AI extraction',retrieved_at:date,findings},dropped,cited:[...new Set(findings.flatMap(f=>f.sources.map(s=>normalizeUrl(s.url))))]};
}