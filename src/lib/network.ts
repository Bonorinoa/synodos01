import { z } from 'zod';
import seed from '@/data/network.json';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY, type SimulationNodeDatum } from 'd3-force';

export const bases = ['coauthorship', 'joint_project', 'shared_appointment', 'shared_institution', 'shared_venue', 'shared_field', 'phd_advisor', 'research_group'] as const;
const nodeSchema = z.object({ id: z.string(), label: z.string(), kind: z.enum(['person', 'lab', 'institution', 'university']), blurb: z.string(), tags: z.array(z.string()), candidate: z.boolean().optional(), target: z.boolean().optional(), profiles: z.record(z.string()).optional(), evidence_packet: z.object({ urls: z.array(z.string().url()), notes: z.string() }) });
const edgeSchema = z.object({ source: z.string(), target: z.string(), strength: z.number().int().min(1).max(10), evidence: z.object({ claim: z.string(), basis: z.enum(bases), urls: z.array(z.string().url()), institutional_hop: z.boolean().optional() }) });
export type NetworkNode = z.infer<typeof nodeSchema>;
export type NetworkEdge = z.infer<typeof edgeSchema> & { id: string };
export type Mode = 'path' | 'lineage';
export const graph = z.object({ nodes: z.array(nodeSchema), edges: z.array(edgeSchema) }).parse(seed);
export const edges: NetworkEdge[] = graph.edges.map((edge, i) => ({ ...edge, id: `edge-${i}` }));
export const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
for (const edge of edges) if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) throw new Error('Graph contains an unknown endpoint');
export const lineageBases = new Set(['phd_advisor', 'research_group', 'coauthorship', 'joint_project']);
export const weakBases = new Set(['shared_field', 'shared_venue', 'shared_institution']);
export const basisLabel = (basis: string) => basis.replaceAll('_', ' ');
export const legalEdges = (mode: Mode, coreOnly = false) => edges.filter(e => (mode === 'path' || lineageBases.has(e.evidence.basis)) && (!coreOnly || (!nodeById.get(e.source)?.candidate && !nodeById.get(e.target)?.candidate)));
export function edgeCost(edge: NetworkEdge) {
  const basis = edge.evidence.basis;
  return 1 + (10 - edge.strength) / 10 + (weakBases.has(basis) ? 3 : basis === 'shared_appointment' ? 1 : 0) + (edge.evidence.urls.length ? 0 : 6) + (edge.evidence.institutional_hop ? 1 : 0) + (nodeById.get(edge.source)?.candidate || nodeById.get(edge.target)?.candidate ? 0.75 : 0);
}
export type RankedPath = { nodes: string[]; edges: string[]; cost: number };
export function rankedPaths(target: string, coreOnly = false): RankedPath[] {
  const adjacency = new Map<string, { next: string; edge: NetworkEdge }[]>();
  for (const edge of legalEdges('path', coreOnly)) for (const [a,b] of [[edge.source,edge.target],[edge.target,edge.source]] as [string,string][]) adjacency.set(a, [...(adjacency.get(a) ?? []), { next: b, edge }]);
  const queue: RankedPath[] = [{ nodes: ['augusto'], edges: [], cost: 0 }];
  const results: RankedPath[] = [];
  const signatures = new Set<string>();
  let examined = 0;
  while (queue.length && results.length < 3 && examined++ < 20000) {
    queue.sort((a,b) => a.cost - b.cost);
    const path = queue.shift();
    if (!path) break;
    const last = path.nodes.at(-1) ?? 'augusto';
    if (last === target) { const signature = path.nodes.join('|'); if (!signatures.has(signature)) { signatures.add(signature); results.push(path); } continue; }
    if (path.edges.length >= 5) continue;
    for (const { next, edge } of adjacency.get(last) ?? []) if (!path.nodes.includes(next)) queue.push({ nodes: [...path.nodes,next], edges: [...path.edges,edge.id], cost: path.cost + edgeCost(edge) });
  }
  return results;
}
export function lineageLayout(root: string, coreOnly: boolean, collapsed: Set<string>) {
  const legal = legalEdges('lineage', coreOnly);
  const depth = new Map<string, number>([[root, 0]]);
  const parent = new Map<string, string>();
  const queue = [root];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (!id) continue;
    for (const edge of legal) { const next = edge.source === id ? edge.target : edge.target === id ? edge.source : undefined; if (next && !depth.has(next)) { depth.set(next, (depth.get(id) ?? 0) + 1); parent.set(next,id); queue.push(next); } }
  }
  const hidden = new Set<string>();
  for (const id of depth.keys()) { let ancestor = parent.get(id); while (ancestor) { if (collapsed.has(ancestor)) { hidden.add(id); break; } ancestor = parent.get(ancestor); } }
  const positions = new Map<string, { x:number; y:number }>();
  const levels = new Map<number,string[]>();
  for (const [id,level] of depth) if (!hidden.has(id)) levels.set(level,[...(levels.get(level) ?? []),id]);
  for (const [level, ids] of levels) ids.forEach((id,index) => positions.set(id, { x: (index-(ids.length-1)/2)*135, y:level*190 }));
  return { positions, depth, parent, hidden, edges: legal.filter(e => positions.has(e.source) && positions.has(e.target)) };
}
// Horizontal progress is a viewing convention, not a direction or introduction claim.
export function trajectoryLayout(paths: RankedPath[], targets: string[], coreOnly = false, selected: string | null = null) {
  const positions = new Map<string, { x:number; y:number }>([['augusto', {x:0,y:0}]]);
  const samples = new Map<string, {x:number;y:number}[]>();
  const edgeIds = new Set(paths.flatMap(path=>path.edges));
  targets.forEach((id,index)=>positions.set(id,{x:1000,y:(index-(targets.length-1)/2)*260}));
  paths.forEach((path,index)=>path.nodes.slice(1,-1).forEach((id,hop)=>{
    const point={x:(hop+1)/path.edges.length*1000,y:(index-(paths.length-1)/2)*150};
    samples.set(id,[...(samples.get(id)??[]),point]);
  }));
  for(const [id,points] of samples)positions.set(id,{x:points.reduce((sum,p)=>sum+p.x,0)/points.length,y:points.reduce((sum,p)=>sum+p.y,0)/points.length});
  const placed:{x:number;y:number}[]=[];
  for(const [id,point] of positions){
    if(id==='augusto'||targets.includes(id))continue;
    while(placed.some(p=>Math.abs(p.x-point.x)<145&&Math.abs(p.y-point.y)<115))point.y+=125;
    placed.push(point);
  }
  const legal=legalEdges('path',coreOnly);
  const selectedEdge=legal.find(edge=>edge.id===selected);
  const anchors=selectedEdge?[selectedEdge.source,selectedEdge.target]:selected&&nodeById.has(selected)?[selected]:[];
  for(const id of anchors)if(!positions.has(id))positions.set(id,{x:500,y:400});
  for(const id of anchors){
    const anchor=positions.get(id);
    if(!anchor)continue;
    const related=legal.filter(edge=>edge.source===id||edge.target===id);
    related.forEach((edge,index)=>{
      edgeIds.add(edge.id);
      const next=edge.source===id?edge.target:edge.source;
      if(!positions.has(next))positions.set(next,{x:anchor.x+(index%2===0?160:-160),y:anchor.y+180+Math.floor(index/2)*120});
    });
  }
  return {positions,edges:legal.filter(edge=>edgeIds.has(edge.id)&&positions.has(edge.source)&&positions.has(edge.target))};
}
type ForceNode = SimulationNodeDatum & { id: string };
export function organicPositions() {
  const nodes: ForceNode[] = graph.nodes.map((n,i) => ({ id:n.id, x:Math.cos(i*2.399)*Math.sqrt(i)*90, y:Math.sin(i*2.399)*Math.sqrt(i)*90, ...(n.id === 'augusto' ? { fx:0,fy:0 } : {}) }));
  const links = edges.map(e => ({ source:e.source,target:e.target,strength:e.strength }));
  const sim = forceSimulation(nodes).force('link',forceLink<ForceNode,typeof links[number]>(links).id(n=>n.id).distance(l=>110+(10-l.strength)*12).strength(.15)).force('charge',forceManyBody().strength(-750)).force('collision',forceCollide(65)).force('x',forceX(0).strength(.025)).force('y',forceY(0).strength(.04)).stop();
  for (let i=0;i<350;i++) sim.tick();
  return new Map(nodes.map(n => [n.id,{x:n.x ?? 0,y:n.y ?? 0}]));
}