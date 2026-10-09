import { z } from 'zod';
import { discoveryBases, normalizeLabel, normalizeUrl, type Finding } from '@/lib/ingest';

export const RESEARCH = { contacts: 4, queriesPerContact: 2, resultsPerQuery: 3, pages: 12, textPerPage: 10000, findings: 24 } as const;
export const researchBriefSchema = z.object({ owner:z.string().max(200), bio:z.string().max(6000), people:z.string().min(1).max(2000), destinations:z.string().max(1000), depth:z.union([z.literal(1),z.literal(2)]).default(1) });
export type ResearchSource = { url:string; title:string; markdown:string; status:number|null; retrieved_at:string };
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