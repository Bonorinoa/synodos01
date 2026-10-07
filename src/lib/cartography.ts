// Presentation geometry only. Hop values come from the existing gated layouts.
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
    const top=outline.reduce((a,b)=>a.y<b.y?a:b,first);
    return {depth,path,label:{x:top.x,y:top.y-6},members:members.map(p=>p.id)};
  });
}

export function verticalTrailPositions(ids:string[], destinations:string[], depths:Map<string,number>, original:Map<string,MapPoint>) {
  const positions=new Map<string,MapPoint>();
  const ordered=[...new Set(['augusto',...ids,...destinations])];
  ordered.forEach((id,i)=>positions.set(id,{x:0,y:i*104}));
  // Existing expanded records remain inspectable beside their honest hop row.
  const rows=new Map<number,number>();
  for(const [id] of original){if(positions.has(id))continue;const depth=depths.get(id)??2;const index=rows.get(depth)??0;rows.set(depth,index+1);positions.set(id,{x:(index%2===0?-1:1)*(135+Math.floor(index/2)*135),y:depth*104});}
  return positions;
}