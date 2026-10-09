// Presentation geometry only. Hop values come from the existing gated layouts.
import { egoId } from '@/lib/network';
export type MapPoint = { x:number; y:number };
export type ElevationPoint = MapPoint & { id:string; depth:number };
export function hopContours(points:ElevationPoint[], padding=76) {
  const cross=(a:MapPoint,b:MapPoint,c:MapPoint)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const hull=(input:MapPoint[])=>{
    const sorted=[...input].sort((a,b)=>a.x-b.x||a.y-b.y);
    const lower:MapPoint[]=[],upper:MapPoint[]=[];
    for(const p of sorted){while(lower.length>=2&&cross(lower[lower.length-2]??p,lower[lower.length-1]??p,p)<=0)lower.pop();lower.push(p);}
    for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper[upper.length-2]??p,upper[upper.length-1]??p,p)<=0)upper.pop();upper.push(p);}
    return [...lower.slice(0,-1),...upper.slice(0,-1)];
  };
  return [...new Set(points.map(p=>p.depth))].sort((a,b)=>a-b).map(depth=>{
    // Superlevel sets are subsets, so their convex envelopes form nested closed isolines.
    const members=points.filter(p=>p.depth>=depth);
    const outline=hull(members.flatMap(p=>Array.from({length:12},(_,i)=>({x:p.x+padding*Math.cos(i*Math.PI/6),y:p.y+padding*Math.sin(i*Math.PI/6)}))));
    const midpoint=(a:MapPoint,b:MapPoint)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const first=outline[0],last=outline.at(-1);
    if(!first||!last)return {depth,path:'',label:{x:0,y:0},members:[] as string[]};
    const start=midpoint(last,first);
    const path=`M ${start.x} ${start.y} `+outline.map((p,i)=>{const next=outline[(i+1)%outline.length]??first;const end=midpoint(p,next);return `Q ${p.x} ${p.y} ${end.x} ${end.y}`;}).join(' ')+' Z';
    // Label the entry into this elevation, not the hull's farthest/highest vertex.
    const entry=points.filter(p=>p.depth===depth).sort((a,b)=>a.y-b.y||a.x-b.x)[0]??first;
    return {depth,path,label:{x:entry.x-padding*.5,y:entry.y-padding*.65},members:members.map(p=>p.id)};
  });
}

export function verticalTrailPositions(ids:string[], destinations:string[], depths:Map<string,number>, original:Map<string,MapPoint>) {
  const positions=new Map<string,MapPoint>();
  const ordered=[...new Set([egoId,...ids,...destinations])];
  ordered.forEach((id,i)=>positions.set(id,{x:0,y:i*104}));
  // Existing expanded records remain inspectable beside their honest hop row.
  const rows=new Map<number,number>();
  for(const [id] of original){if(positions.has(id))continue;const depth=depths.get(id)??2;const index=rows.get(depth)??0;rows.set(depth,index+1);positions.set(id,{x:(index%2===0?-1:1)*(135+Math.floor(index/2)*135),y:depth*104});}
  return positions;
}
/** Concentric terraces: hop depth becomes radius around the root; angle follows the nearest shallower recorded neighbor. Presentation only. */
export function terracePositions(root:string, depths:Map<string,number>, ids:string[], destinations:string[], edges:{source:string;target:string}[], gap=250) {
  const positions=new Map<string,MapPoint>([[root,{x:0,y:0}]]);const angle=new Map<string,number>([[root,0]]);
  const near=new Map<string,string[]>();for(const e of edges){near.set(e.source,[...(near.get(e.source)??[]),e.target]);near.set(e.target,[...(near.get(e.target)??[]),e.source]);}
  const rings=new Map<number,string[]>();
  for(const id of ids){if(id===root||destinations.includes(id))continue;const d=Math.max(1,depths.get(id)??2);rings.set(d,[...(rings.get(d)??[]),id]);}
  let radius=0;let outer=0;
  for(const d of [...rings.keys()].sort((a,b)=>a-b)){
    const ring=rings.get(d)??[];
    // Order by inherited parent angle so branches fan outward instead of crossing the basin.
    const parentAngle=(id:string)=>{const a=(near.get(id)??[]).filter(n=>angle.has(n)&&(depths.get(n)??0)<d).map(n=>angle.get(n)??0);return a.length?Math.atan2(a.reduce((s,v)=>s+Math.sin(v),0),a.reduce((s,v)=>s+Math.cos(v),0)):Math.PI;};
    const order=ring.map(id=>({id,a:parentAngle(id)})).sort((x,y)=>x.a-y.a||x.id.localeCompare(y.id));
    radius=Math.max(radius+gap,(ring.length*118)/(2*Math.PI));outer=radius;
    const offset=order.length?order.reduce((s,o)=>s+o.a,0)/order.length-Math.PI:0;
    order.forEach(({id},i)=>{const a=offset+(i+.5)*2*Math.PI/order.length-Math.PI+Math.PI;angle.set(id,a);positions.set(id,{x:radius*Math.cos(a),y:radius*Math.sin(a)});});
  }
  const rim=outer+gap*1.1,spread=Math.min(.9,.32*Math.max(0,destinations.length-1));
  destinations.forEach((id,i)=>{const a=destinations.length>1?-spread/2+spread*i/(destinations.length-1):0;positions.set(id,{x:rim*Math.cos(a),y:rim*Math.sin(a)});});
  return positions;
}

/** Closed circular isolines halfway between adjacent terraces, measured from the shown geometry. */
export function terraceContours(points:ElevationPoint[], center:MapPoint={x:0,y:0}) {
  const r=(p:MapPoint)=>Math.hypot(p.x-center.x,p.y-center.y);
  const depths=[...new Set(points.map(p=>p.depth))].sort((a,b)=>a-b).filter(d=>d>0);
  return depths.map(depth=>{
    const inner=Math.max(0,...points.filter(p=>p.depth<depth).map(r)),outer=Math.min(...points.filter(p=>p.depth>=depth).map(r));
    const radius=Math.max(60,(inner+outer)/2);
    const path=`M ${center.x-radius} ${center.y} A ${radius} ${radius} 0 1 0 ${center.x+radius} ${center.y} A ${radius} ${radius} 0 1 0 ${center.x-radius} ${center.y} Z`;
    return {depth,path,label:{x:center.x+radius*Math.cos(-2.2),y:center.y+radius*Math.sin(-2.2)},members:points.filter(p=>p.depth>=depth).map(p=>p.id)};
  });
}
