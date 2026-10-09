import { RESEARCH, type ResearchSource } from '@/lib/research';
import { normalizeUrl } from '@/lib/ingest';

type Document = { url?:string; title?:string; markdown?:string; metadata?:{ sourceURL?:string; title?:string; statusCode?:number } };
export async function searchAcademicSources(contacts:{name:string;hint:string}[],bio:string,key:string,date:string,trace:string[]=[]) {
  const sources:ResearchSource[]=[];const seen=new Set<string>();
  const call=async(path:string,body:object)=>{
    const response=await fetch(`https://api.firecrawl.dev/v2/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(body)});
    if(!response.ok){throw new Error(`Firecrawl request failed (${response.status}). No findings were added. Try again later or check the connection.`);}
    const result=await response.json() as {success?:boolean;error?:string;data?:unknown};
    if(result.success===false)throw new Error('Firecrawl could not retrieve sources. No findings were added.');
    return result.data??result;
  };
  const add=(doc:Document)=>{const url=doc.url??doc.metadata?.sourceURL;if(!url)return;try{const u=new URL(url);if(u.protocol!=='https:'&&u.protocol!=='http:')return;if(/(^|\.)academictree\.org$/i.test(u.hostname))return;}catch{return;}
    const canonical=normalizeUrl(url);if(seen.has(canonical)||sources.length>=RESEARCH.pages)return;seen.add(canonical);
    sources.push({url,title:doc.title??doc.metadata?.title??url,markdown:(doc.markdown??'').slice(0,RESEARCH.textPerPage),status:doc.metadata?.statusCode??null,retrieved_at:date});
  };
  // Sequential bounded calls avoid a fan-out crawl and keep names tied to a research scope.
  for(const {name,hint} of contacts.slice(0,RESEARCH.contacts)){
    for(const topic of ['publications coauthors','PhD advisor committee CV']){
      const data=await call('search',{query:`"${name}" ${hint} ${topic} ${hint?'':bio.slice(0,120)} -site:academictree.org`.replace(/\s+/g,' '),limit:RESEARCH.resultsPerQuery,sources:['web'],scrapeOptions:{formats:['markdown'],onlyMainContent:true}});
      const docs=Array.isArray(data)?data:(data as {web?:Document[]}).web??[];
      const before=sources.length;for(const doc of docs)add(doc as Document);trace.push(`Searched “${name}${hint?` (${hint})`:''}” · ${topic.split(' ')[0]} → ${sources.length-before} new pages`);
    }
  }
  // Search results often omit HTTP status; re-read those pages so accessibility is a real dated check, never assumed.
  for(const source of sources.filter(source=>!source.markdown||source.status===null).slice(0,8)){
    try{
    const data=await call('scrape',{url:source.url,formats:['markdown'],onlyMainContent:true}) as Document;
    source.markdown=(data.markdown??source.markdown).slice(0,RESEARCH.textPerPage);source.status=data.metadata?.statusCode??null;
    }catch{trace.push(`Could not re-read ${source.url}`);}
  }
  trace.push(`Read ${sources.filter(s=>s.markdown&&s.status!==null&&s.status<400).length} of ${sources.length} pages with a confirmed status`);
  return sources;
}

export async function readResearchStream(response:Response) {
  if(!response.body)throw new Error('Research returned an empty stream.');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',text='',completed=false;
  const consume=(line:string)=>{if(!line.startsWith('data:'))return;const payload=line.slice(5).trim();if(!payload||payload==='[DONE]')return;
    const event=JSON.parse(payload) as {type?:string;delta?:string;error?:{message?:string};response?:{status?:string;error?:{message?:string}}};
    if(event.type==='error'||event.type==='response.failed')throw new Error(event.error?.message??event.response?.error?.message??'Research failed.');
    if(event.type==='response.incomplete')throw new Error('Research stopped before completing. No findings were added.');
    if(event.type==='response.output_text.delta'&&event.delta)text+=event.delta;
    if(event.type==='response.completed')completed=true;
  };
  try{for(;;){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()??'';for(const line of lines)consume(line);}buffer+=decoder.decode();if(buffer.trim())consume(buffer);}finally{reader.releaseLock();}
  if(!completed||!text.trim())throw new Error('The assistant returned no completed findings. No links were added.');
  return JSON.parse(text);
}