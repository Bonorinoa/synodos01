import { Plus, Minus, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { branchPacket, egoGatewayIds, nodeById } from '@/lib/network';

export function LineageGuide({expanded,onExpand,onCollapse}:{expanded:Set<string>;onExpand:(id:string)=>void;onCollapse:(id:string)=>void}) {
  return <section className="branch-guide glass" aria-label="Direct branches">
    <div className="branch-guide-title"><GitBranch size={15}/><span>Choose an academic branch</span><small>{expanded.size} of {egoGatewayIds.length} explored</small></div>
    <div className="branch-guide-options">{egoGatewayIds.map(id=>{
      const open=expanded.has(id),name=nodeById.get(id)?.label.split(' ').at(-1)??id;
      return <Button key={id} variant={open?'secondary':'ghost'} aria-label={`${open?'Collapse':'Explore'} ${name} branch`} aria-expanded={open} onClick={()=>open?onCollapse(id):onExpand(id)}><span>{name}<small>{branchPacket(id).size-1} recorded connections</small></span>{open?<Minus size={14}/>:<Plus size={14}/>}</Button>;
    })}</div>{!egoGatewayIds.length&&<p className="guide-honesty">No direct connections yet. Add findings that start from you, then approve them in Your data.</p>}
  </section>;
}