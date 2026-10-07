import { ChevronDown, ChevronRight, MapPin, X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { edges, nodeById, weakBases, type RankedPath } from '@/lib/network';

export function TrailGuide({paths,open,active,onToggle,onClear,onActive,onSelect}:{paths:RankedPath[];open:boolean;active:number|null;onToggle:()=>void;onClear:()=>void;onActive:(index:number)=>void;onSelect:(id:string)=>void}) {
 return <section className="trail-guide glass" data-open={open} aria-label="Ranked paths">
  <div className="trail-guide-header"><Button variant="ghost" aria-label={open?'Collapse ranked routes':'Expand ranked routes'} aria-expanded={open} onClick={onToggle}><MapPin size={15}/><span>Trail guide · {paths.length} routes</span>{open?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</Button><Button variant="ghost" size="icon" aria-label="Clear paths" onClick={onClear}><X size={14}/></Button></div>
  {open&&<div className="itinerary-scroll"><p className="guide-honesty">Recorded connections, not confirmed introductions.</p>{paths.map((path,i)=>{
    const evidence=path.edges.flatMap(id=>{const e=edges.find(e=>e.id===id);return e?[e]:[];});
    return <article className="itinerary" key={i} data-active={active===i}>
      <Button className="itinerary-title" variant={active===i?'secondary':'ghost'} aria-pressed={active===i} onClick={()=>onActive(i)}>Route {i+1}<small>{path.edges.length} hops</small></Button>
      <ol>{path.nodes.map((id,j)=><li key={id} data-stage={j===0?'ego':j===1?'direct':j===path.nodes.length-1?'destination':'bridge'}><span className="step-number">{j+1}</span><Button variant="ghost" onClick={()=>onSelect(id)}><small>{j===0?'You':j===1?'Direct contact':j===path.nodes.length-1?'Destination':'Bridge'}</small><span>{nodeById.get(id)?.label}</span></Button>{j>0&&<Button size="icon" variant="ghost" aria-label={`Inspect path ${i+1} relationship ${j}`} onClick={()=>onSelect(path.edges[j-1]??id)}><ArrowUpRight size={13}/></Button>}</li>)}</ol>
      <p className="guide-honesty">{evidence.filter(e=>weakBases.has(e.evidence.basis)).length} weak overlaps · {evidence.filter(e=>!e.evidence.urls.length).length} private / unverified</p>
    </article>;
  })}{!paths.length&&<p className="guide-honesty">No eligible route within five recorded hops.</p>}</div>}
 </section>;
}