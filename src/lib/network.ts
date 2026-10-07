import { z } from 'zod';
import seed from '@/data/network.json';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY, type SimulationNodeDatum } from 'd3-force';

export const bases = ['coauthorship', 'joint_project', 'shared_appointment', 'shared_institution', 'shared_venue', 'shared_field', 'phd_advisor', 'committee', 'phd_institution', 'research_group'] as const;
const nodeSchema = z.object({ id: z.string(), label: z.string(), kind: z.enum(['person', 'lab', 'institution', 'university']), blurb: z.string(), tags: z.array(z.string()), candidate: z.boolean().optional(), target: z.boolean().optional(), profiles: z.record(z.string()).optional(), nobel_prize: z.object({ category:z.string(), year:z.number().int(), motivation:z.string(), url:z.string().url() }).optional(), evidence_packet: z.object({ urls: z.array(z.string().url()), notes: z.string() }) });
const edgeSchema = z.object({ source: z.string(), target: z.string(), strength: z.number().int().min(1).max(10), evidence: z.object({ claim: z.string(), basis: z.enum(bases), urls: z.array(z.string().url()), institutional_hop: z.boolean().optional(), confidence:z.enum(['high','medium','low']).optional(), reported_confidence:z.enum(['high','medium','low']).optional(), basis_detail:z.string().optional(), expansion_root:z.string().optional(), verification_notes:z.string().optional(), ego_gateway:z.boolean().optional(), attestation:z.enum(['user']).optional(), source_checks:z.array(z.object({url:z.string().url(),status:z.number().nullable(),accessible:z.boolean()})).optional() }).passthrough() });
export type NetworkNode = z.infer<typeof nodeSchema>;
export type NetworkEdge = z.infer<typeof edgeSchema> & { id: string };
export type Mode = 'path' | 'lineage';
export const graph = z.object({ nodes: z.array(nodeSchema), edges: z.array(edgeSchema) }).parse(seed);
export const edges: NetworkEdge[] = graph.edges.map((edge, i) => ({ ...edge, id: `edge-${i}` }));
export const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
for (const edge of edges) if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) throw new Error('Graph contains an unknown endpoint');
export const lineageBases = new Set(['phd_advisor', 'committee', 'research_group', 'coauthorship', 'joint_project']);
export const weakBases = new Set(['shared_field', 'shared_venue', 'shared_institution']);
export const egoGatewayIds = ['monica-capra','raymond-duch','eitel-lauria','erik-johnston'] as const;
export const egoGatewayEdges = () => edges.filter(edge=>edge.evidence.ego_gateway===true && (edge.source==='augusto'||edge.target==='augusto'));
export const basisLabel = (basis: string) => basis.replaceAll('_', ' ');
export const legalEdges = (mode: Mode, coreOnly = false) => edges.filter(e => (mode === 'path' || lineageBases.has(e.evidence.basis)) && (!coreOnly || (!nodeById.get(e.source)?.candidate && !nodeById.get(e.target)?.candidate)));
const isAugustoEdge=(edge:NetworkEdge)=>edge.source==='augusto'||edge.target==='augusto';
const pathTraversalEdges=(coreOnly=false)=>legalEdges('path',coreOnly).filter(edge=>!isAugustoEdge(edge)||edge.evidence.ego_gateway===true);
export function edgeCost(edge: NetworkEdge) {
  const basis = edge.evidence.basis;
  return 1 + (10 - edge.strength) / 10 + (weakBases.has(basis) ? 3 : basis === 'shared_appointment' ? 1 : 0) + (edge.evidence.urls.length ? 0 : 6) + (edge.evidence.confidence==='low'?3:edge.evidence.confidence==='medium'?1:0) + (edge.evidence.institutional_hop ? 1 : 0) + (nodeById.get(edge.source)?.candidate || nodeById.get(edge.target)?.candidate ? 0.75 : 0);
}
export type RankedPath = { nodes: string[]; edges: string[]; cost: number };
export function rankedPaths(target: string, coreOnly = false): RankedPath[] {
  const adjacency = new Map<string, { next: string; edge: NetworkEdge }[]>();
  for (const edge of pathTraversalEdges(coreOnly)) for (const [a,b] of [[edge.source,edge.target],[edge.target,edge.source]] as [string,string][]) adjacency.set(a, [...(adjacency.get(a) ?? []), { next: b, edge }]);
  const queue: RankedPath[] = [{ nodes: ['augusto'], edges: [], cost: 0 }];
  const results: RankedPath[] = [];
  const signatures = new Set<string>();
  let examined = 0;
  while (queue.length && results.length < 24 && examined++ < 30000) {
    queue.sort((a,b) => a.cost - b.cost);
    const path = queue.shift();
    if (!path) break;
    const last = path.nodes.at(-1) ?? 'augusto';
    if (last === target) { const signature = path.nodes.join('|'); if (!signatures.has(signature)) { signatures.add(signature); results.push(path); } continue; }
    if (path.edges.length >= 5) continue;
    for (const { next, edge } of adjacency.get(last) ?? []) if (!path.nodes.includes(next)) queue.push({ nodes: [...path.nodes,next], edges: [...path.edges,edge.id], cost: path.cost + edgeCost(edge) });
  }
  const bestByGateway = new Map<string,RankedPath>();
  for(const path of results){const gateway=path.nodes[1];if(gateway&&!bestByGateway.has(gateway))bestByGateway.set(gateway,path);}
  return [...bestByGateway.values()].sort((a,b)=>a.cost-b.cost).slice(0,3);
}
export function lineageLayout(root: string, coreOnly: boolean, collapsed: Set<string>, expanded?: Set<string>) {
  const allLegal = legalEdges('lineage', coreOnly);
  // Augusto's lineage is deliberately bounded to his four confirmed gateways and
  // each gateway's own researched packet. It must not silently fan into later hops.
   const legal = root==='augusto' ? allLegal.filter(edge=>{
    if(isAugustoEdge(edge))return edge.evidence.ego_gateway===true;
     if(expanded)return true;
    const expansion=edge.evidence.expansion_root;
    if(expansion)return egoGatewayIds.includes(expansion as typeof egoGatewayIds[number]);
    return egoGatewayIds.some(id=>edge.source===id||edge.target===id);
  }) : allLegal;
  const depth = new Map<string, number>([[root, 0]]);
  const parent = new Map<string, string>();
  const queue = [root];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (!id) continue;
    for (const edge of legal) { const next = edge.source === id ? edge.target : edge.target === id ? edge.source : undefined; if (next && !depth.has(next)) { depth.set(next, (depth.get(id) ?? 0) + 1); parent.set(next,id); queue.push(next); } }
  }
  const hidden = new Set<string>();
   for (const id of depth.keys()) { let ancestor = parent.get(id); while (ancestor) { if (collapsed.has(ancestor) || (expanded && ancestor!==root && !expanded.has(ancestor))) { hidden.add(id); break; } ancestor = parent.get(ancestor); } }
  const positions = new Map<string, { x:number; y:number }>();
  const levels = new Map<number,string[]>();
  for (const [id,level] of depth) if (!hidden.has(id)) levels.set(level,[...(levels.get(level) ?? []),id]);
  positions.set(root,{x:0,y:0});
  let layerY=220;
  for (const [level,ids] of levels) {
    if(level===0)continue;
    const groups=new Map<string,string[]>();
    for(const id of ids){const ancestor=parent.get(id)??root;groups.set(ancestor,[...(groups.get(ancestor)??[]),id]);}
    const ordered=[...groups].sort(([a],[b])=>(positions.get(a)?.x??0)-(positions.get(b)?.x??0));
     const widths=ordered.map(([,children])=>Math.max(230,Math.min(4,children.length)*180));
    const total=widths.reduce((sum,width)=>sum+width,0)+Math.max(0,ordered.length-1)*65;
    let cursor=-total/2;
    let rows=1;
    ordered.forEach(([,children],groupIndex)=>{
      const width=widths[groupIndex]??180;
      const columns=Math.min(4,children.length);
       children.sort((a,b)=>Number(legal.some(e=>e.evidence.basis==='phd_advisor'&&[e.source,e.target].includes(b)&&[e.source,e.target].includes(parent.get(b)??'')&&!e.evidence.claim.startsWith('Dissertation committee')))-Number(legal.some(e=>e.evidence.basis==='phd_advisor'&&[e.source,e.target].includes(a)&&[e.source,e.target].includes(parent.get(a)??'')&&!e.evidence.claim.startsWith('Dissertation committee'))));
       children.forEach((id,index)=>positions.set(id,{x:cursor+width/2+(index%columns-(columns-1)/2)*180,y:layerY+Math.floor(index/columns)*100}));
      rows=Math.max(rows,Math.ceil(children.length/columns));cursor+=width+65;
    });
     layerY+=240+(rows-1)*100;
  }
  // Hidden evidence remains a faint, bounded preview, not an extra traversal hop.
  const contextPositions=new Map<string,{x:number;y:number}>();
  const previews=new Map<string,string[]>();
  for(const id of hidden){let ancestor=parent.get(id);while(ancestor&&!positions.has(ancestor))ancestor=parent.get(ancestor);if(ancestor)previews.set(ancestor,[...(previews.get(ancestor)??[]),id]);}
   for(const [ancestor,ids] of previews){const anchor=positions.get(ancestor);if(!anchor)continue;(expanded?ids.slice(0,3):ids).forEach((id,index)=>contextPositions.set(id,{x:anchor.x+(index%3-1)*48,y:anchor.y+105+Math.floor(index/3)*42}));}
  return { positions, contextPositions, depth, parent, hidden, edges: legal.filter(e => positions.has(e.source) && positions.has(e.target)), contextEdges:legal.filter(e=>(positions.has(e.source)||contextPositions.has(e.source))&&(positions.has(e.target)||contextPositions.has(e.target))&&(hidden.has(e.source)||hidden.has(e.target))) };
}
export function branchPacket(root:string) {
  return new Set([root,...edges.filter(e=>e.evidence.expansion_root===root).flatMap(e=>[e.source,e.target]).filter(id=>id!=='augusto')]);
}
// Discovery is bounded to recorded packet links, never routed back through ego or the selected branch gateway.
export function crossBranchLinks(id:string, targetRoot:string) {
  const packet=branchPacket(targetRoot);
  return legalEdges('lineage').filter(e=>[e.source,e.target].includes(id)&&packet.has(e.source===id?e.target:e.source)&&![e.source,e.target].includes('augusto')&&![e.source,e.target].includes('monica-capra'));
}
// Horizontal progress is a viewing convention, not a direction or introduction claim.
export const pathTargetIds = ['google-deepmind', 'santa-fe-institute'] as const;
export function trajectoryLayout(paths: RankedPath[], targets: string[], coreOnly = false, selected: string | null = null, expanded: Set<string> = new Set()) {
  const legal = pathTraversalEdges(coreOnly);
  const destinations = [...new Set([...pathTargetIds, ...targets])];
  const activeNodes = new Set(['augusto', ...egoGatewayIds, ...paths.flatMap(path => path.nodes)]);
  const activeEdges = new Set([...egoGatewayEdges().map(edge => edge.id), ...paths.flatMap(path => path.edges)]);
  const anchors = new Set(expanded);
  if (selected && nodeById.has(selected)) anchors.add(selected);
  const selectedEdge = legal.find(edge => edge.id === selected);
  if (selectedEdge) { anchors.add(selectedEdge.source); anchors.add(selectedEdge.target); activeEdges.add(selectedEdge.id); }
  const neighbors = (id: string) => legal.filter(edge => edge.source === id || edge.target === id);
  for (const id of anchors) {
    if (coreOnly && nodeById.get(id)?.candidate) continue;
    activeNodes.add(id);
    for (const edge of neighbors(id)) { activeEdges.add(edge.id); activeNodes.add(edge.source); activeNodes.add(edge.target); }
  }
  const shownNodes = new Set([...activeNodes, ...destinations]);
  const shownEdges = new Set(activeEdges);
  // One ring of context only: ghost visibility is not recursive expansion.
  for (const id of activeNodes) for (const edge of neighbors(id)) {
    shownNodes.add(edge.source); shownNodes.add(edge.target); shownEdges.add(edge.id);
  }
  const displayed = legal.filter(edge => shownEdges.has(edge.id) && shownNodes.has(edge.source) && shownNodes.has(edge.target));
  const depths = new Map<string, number>([['augusto', 0]]);
  const queue = ['augusto'];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]; if (!id) continue;
    for (const edge of displayed) {
      const next = edge.source === id ? edge.target : edge.target === id ? edge.source : null;
      if (next && !depths.has(next) && !destinations.includes(next)) { depths.set(next, (depths.get(id) ?? 0) + 1); queue.push(next); }
    }
  }
  const positions = new Map<string, { x: number; y: number }>([['augusto', { x: 0, y: 0 }]]);
  const groups = new Map<string, string[]>();
  for (const id of shownNodes) {
    if (id === 'augusto' || destinations.includes(id)) continue;
    const node = nodeById.get(id); if (!node || (coreOnly && node.candidate)) continue;
    const depth = depths.get(id) ?? 2;
    const key = `${depth}:${node.kind}`;
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  const bands: Record<NetworkNode['kind'], number> = { person: 0, lab: 390, institution: 620, university: 850 };
  const rankWidths = new Map<number, number>();
  for (const [key, ids] of groups) {
    const [rank, kind] = key.split(':');
    const columns = Math.ceil(ids.length / (kind === 'person' ? 5 : 3));
    rankWidths.set(Number(rank), Math.max(rankWidths.get(Number(rank)) ?? 370, columns * 190 + 180));
  }
  const rankX = (rank: number) => { let x = 370; for (let i = 1; i < rank; i++) x += rankWidths.get(i) ?? 370; return x; };
  for (const [key, ids] of groups) {
    const [rank, kind] = key.split(':');
    ids.sort((a,b) => egoGatewayIds.indexOf(a as typeof egoGatewayIds[number]) - egoGatewayIds.indexOf(b as typeof egoGatewayIds[number]) || a.localeCompare(b));
    const rows = Math.min(ids.length, kind === 'person' ? 5 : 3);
    ids.forEach((id,i) => positions.set(id, { x: rankX(Number(rank)) + Math.floor(i / rows) * 190, y: bands[kind as NetworkNode['kind']] + (i % rows - (rows-1)/2) * 110 }));
  }
  const targetX = rankX(Math.max(3, ...[...depths.values()].map(depth => depth + 1))) + 100;
  destinations.forEach((id,i) => positions.set(id, { x: targetX, y: (i - (destinations.length-1)/2) * 260 }));
  const relevant = selectedEdge ? new Set([selectedEdge.source, selectedEdge.target]) : selected && nodeById.has(selected) ? new Set([selected, ...neighbors(selected).flatMap(edge => [edge.source, edge.target])]) : activeNodes;
  const pathNodes = new Set(paths.flatMap(path => path.nodes));
  const ghostNodes = new Set([...positions.keys()].filter(id => !destinations.includes(id) && id !== 'augusto' && (!activeNodes.has(id) || (!relevant.has(id) && !pathNodes.has(id)))));
  const ghostEdges = new Set(displayed.filter(edge => !activeEdges.has(edge.id) || (selected && edge.id !== selected && edge.source !== selected && edge.target !== selected && !paths.some(path => path.edges.includes(edge.id)))).map(edge => edge.id));
  return { positions, depths, ghostNodes, ghostEdges, expanded: new Set(anchors), edges: displayed.filter(edge => positions.has(edge.source) && positions.has(edge.target)) };
}

type ForceNode = SimulationNodeDatum & { id: string };
export function organicPositions() {
  const nodes: ForceNode[] = graph.nodes.map((n,i) => ({ id:n.id, x:Math.cos(i*2.399)*Math.sqrt(i)*90, y:Math.sin(i*2.399)*Math.sqrt(i)*90, ...(n.id === 'augusto' ? { fx:0,fy:0 } : {}) }));
  const links = edges.map(e => ({ source:e.source,target:e.target,strength:e.strength }));
  const sim = forceSimulation(nodes).force('link',forceLink<ForceNode,typeof links[number]>(links).id(n=>n.id).distance(l=>110+(10-l.strength)*12).strength(.15)).force('charge',forceManyBody().strength(-750)).force('collision',forceCollide(65)).force('x',forceX(0).strength(.025)).force('y',forceY(0).strength(.04)).stop();
  for (let i=0;i<350;i++) sim.tick();
  return new Map(nodes.map(n => [n.id,{x:n.x ?? 0,y:n.y ?? 0}]));
}