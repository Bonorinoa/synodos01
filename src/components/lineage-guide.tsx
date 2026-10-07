import { Plus, Minus, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { branchPacket, egoGatewayIds, nodeById } from '@/lib/network';

export function LineageGuide({expanded,onExpand,onCollapse}:{expanded:Set<string>;onExpand:(id:string)=>void;onCollapse:(id:string)=>void}) {
  return <section className="branch-guide glass" aria-label="Direct branches">
    <div className="branch-guide-title"><GitBranch size={15}/><span>Explore a branch</span><small>Relationship hops, not generations</small></div>
    <div className="branch-guide-options">{egoGatewayIds.map(id=>{
      const open=expanded.has(id),name=id==='monica-capra'?'Capra':id==='raymond-duch'?'Duch':id==='eitel-lauria'?'Lauría':'Johnston';
      return <Button key={id} variant={open?'secondary':'ghost'} aria-label={`${open?'Collapse':'Expand'} ${name} branch`} aria-expanded={open} onClick={()=>open?onCollapse(id):onExpand(id)}><span>{name}<small>{branchPacket(id).size-1} deeper</small></span>{open?<Minus size={14}/>:<Plus size={14}/>}</Button>;
    })}</div>
  </section>;
}