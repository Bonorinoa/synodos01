import { bases, nodeSchema, edgeSchema } from '@/lib/schema';
import { loadActiveArtifact } from '@/lib/workspace';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
export { bases };
export let activeArtifact = loadActiveArtifact();
/** The network owner. Every root-relative traversal starts here. */
export let egoId = activeArtifact.meta.ego;
export type NetworkNode = z.infer<typeof nodeSchema>;
import type { z } from 'zod';
export type NetworkEdge = z.infer<typeof edgeSchema> & { id: string };
export type Mode = 'path' | 'lineage';
export const graph = { nodes: activeArtifact.nodes, edges: activeArtifact.edges };
export let edges: NetworkEdge[] = graph.edges.map((edge, i) => ({ ...edge, id: `edge-${i}` }));
export const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
for (const edge of edges) if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) throw new Error('Graph contains an unknown endpoint');
export const lineageBases = new Set(['phd_advisor', 'committee', 'research_group', 'coauthorship', 'joint_project']);
export const weakBases = new Set(['shared_field', 'shared_venue', 'shared_institution']);
export let egoGatewayIds: string[] = [...new Set(edges.filter(e=>e.evidence.ego_gateway===true&&[e.source,e.target].includes(egoId)).map(e=>e.source===egoId?e.target:e.source))].sort((a,b)=>edges.findIndex(e=>[e.source,e.target].includes(a))-edges.findIndex(e=>[e.source,e.target].includes(b)));
export const isPending=(edge:NetworkEdge)=>edge.evidence.review_status==='pending';
export const egoGatewayEdges = () => edges.filter(edge=>edge.evidence.ego_gateway===true && (edge.source===egoId||edge.target===egoId));
export const basisLabel = (basis: string) => basis.replaceAll('_', ' ');
export const legalEdges = (mode: Mode, coreOnly = false) => edges.filter(e => (mode === 'path' || lineageBases.has(e.evidence.basis)) && (!coreOnly || (!nodeById.get(e.source)?.candidate && !nodeById.get(e.target)?.candidate)));
const isAugustoEdge=(edge:NetworkEdge)=>edge.source===egoId||edge.target===egoId;
const pathTraversalEdges=(coreOnly=false)=>legalEdges('path',coreOnly).filter(edge=>!isAugustoEdge(edge)||edge.evidence.ego_gateway===true);
/** Route cost terms; the methodology docs read these same values. */
export const COST = { base: 1, weakBasis: 3, sharedAppointment: 1, noSource: 6, unreviewed: 6, lowConfidence: 3, mediumConfidence: 1, institutionalHop: 1, provisional: 0.75, maxHops: 5, routes: 3 } as const;
export function edgeCost(edge: NetworkEdge) {
  const basis = edge.evidence.basis;
  return COST.base + (10 - edge.strength) / 10 + (weakBases.has(basis) ? COST.weakBasis : basis === 'shared_appointment' ? COST.sharedAppointment : 0) + (edge.evidence.urls.length ? 0 : COST.noSource) + (isPending(edge) ? COST.unreviewed : 0) + (edge.evidence.confidence==='low'?COST.lowConfidence:edge.evidence.confidence==='medium'?COST.mediumConfidence:0) + (edge.evidence.institutional_hop ? COST.institutionalHop : 0) + (nodeById.get(edge.source)?.candidate || nodeById.get(edge.target)?.candidate ? COST.provisional : 0);
}
/** Recorded-link hops from the owner over lineage-legal bases only; null when unreachable. */
export function lineageHops(id: string) {
  const legal = legalEdges('lineage'); const depth = new Map([[egoId, 0]]); const queue = [egoId];
  for (let i = 0; i < queue.length; i++) { const cur = queue[i]!; for (const e of legal) { const next = e.source === cur ? e.target : e.target === cur ? e.source : null; if (next && !depth.has(next)) { depth.set(next, depth.get(cur)! + 1); queue.push(next); } } }
  return depth.get(id) ?? null;
}
export let nobelIds = graph.nodes.filter(n => n.nobel_prize).map(n => n.id);
export type RankedPath = { nodes: string[]; edges: string[]; cost: number };
export function rankedPaths(target: string, coreOnly = false): RankedPath[] {
  const adjacency = new Map<string, { next: string; edge: NetworkEdge }[]>();
  for (const edge of pathTraversalEdges(coreOnly)) for (const [a,b] of [[edge.source,edge.target],[edge.target,edge.source]] as [string,string][]) adjacency.set(a, [...(adjacency.get(a) ?? []), { next: b, edge }]);
  const queue: RankedPath[] = [{ nodes: [egoId], edges: [], cost: 0 }];
  const results: RankedPath[] = [];
  const signatures = new Set<string>();
  let examined = 0;
  while (queue.length && results.length < 24 && examined++ < 30000) {
    queue.sort((a,b) => a.cost - b.cost);
    const path = queue.shift();
    if (!path) break;
    const last = path.nodes.at(-1) ?? egoId;
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
   const legal = root===egoId ? allLegal.filter(edge=>{
    if(isAugustoEdge(edge))return edge.evidence.ego_gateway===true;
     if(expanded)return true;
    const expansion=edge.evidence.expansion_root;
    if(expansion)return egoGatewayIds.includes(expansion);
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
  let layerY=240;
  for (const [level,ids] of levels) {
    if(level===0)continue;
    const groups=new Map<string,string[]>();
    for(const id of ids){const ancestor=parent.get(id)??root;groups.set(ancestor,[...(groups.get(ancestor)??[]),id]);}
    const ordered=[...groups].sort(([a],[b])=>(positions.get(a)?.x??0)-(positions.get(b)?.x??0));
     const widths=ordered.map(([,children])=>Math.max(250,Math.min(4,children.length)*210));
    const total=widths.reduce((sum,width)=>sum+width,0)+Math.max(0,ordered.length-1)*65;
    let cursor=-total/2;
    let rows=1;
    ordered.forEach(([ancestor,children],groupIndex)=>{
      const width=widths[groupIndex]??180;
      const columns=Math.min(4,children.length);
       children.sort((a,b)=>Number(legal.some(e=>e.evidence.basis==='phd_advisor'&&[e.source,e.target].includes(b)&&[e.source,e.target].includes(parent.get(b)??'')&&!e.evidence.claim.startsWith('Dissertation committee')))-Number(legal.some(e=>e.evidence.basis==='phd_advisor'&&[e.source,e.target].includes(a)&&[e.source,e.target].includes(parent.get(a)??'')&&!e.evidence.claim.startsWith('Dissertation committee'))));
       const chair=children.find(id=>legal.some(e=>e.evidence.basis==='phd_advisor'&&[e.source,e.target].includes(id)&&[e.source,e.target].includes(ancestor)&&!e.evidence.claim.startsWith('Dissertation committee')));
       children.forEach((id,index)=>{const peerIndex=chair?index-1:index;positions.set(id,{x:id===chair?(positions.get(ancestor)?.x??0):cursor+width/2+(Math.max(0,peerIndex)%columns-(columns-1)/2)*210,y:layerY+(id===chair?0:(chair?96:0)+Math.floor(Math.max(0,peerIndex)/columns)*116)});});
      rows=Math.max(rows,Math.ceil(children.length/columns));cursor+=width+65;
    });
     layerY+=300+(rows-1)*116;
  }
  // Hidden evidence remains a faint, bounded preview, not an extra traversal hop.
  const contextPositions=new Map<string,{x:number;y:number}>();
  const previews=new Map<string,string[]>();
  for(const id of hidden){let ancestor=parent.get(id);while(ancestor&&!positions.has(ancestor))ancestor=parent.get(ancestor);if(ancestor)previews.set(ancestor,[...(previews.get(ancestor)??[]),id]);}
   for(const [ancestor,ids] of previews){const anchor=positions.get(ancestor);if(!anchor)continue;(expanded?ids.slice(0,3):ids).forEach((id,index)=>contextPositions.set(id,{x:anchor.x+(index%3-1)*48,y:anchor.y+105+Math.floor(index/3)*42}));}
  return { positions, contextPositions, depth, parent, hidden, edges: legal.filter(e => positions.has(e.source) && positions.has(e.target)), contextEdges:legal.filter(e=>(positions.has(e.source)||contextPositions.has(e.source))&&(positions.has(e.target)||contextPositions.has(e.target))&&(hidden.has(e.source)||hidden.has(e.target))) };
}
export function branchPacket(root:string) {
  return new Set([root,...edges.filter(e=>e.evidence.expansion_root===root || ([e.source,e.target].includes(root)&&lineageBases.has(e.evidence.basis))).flatMap(e=>[e.source,e.target]).filter(id=>id!==egoId)]);
}
// Discovery is bounded to recorded packet links, never routed back through ego or the selected branch gateway.
export function crossBranchLinks(id:string, targetRoot:string) {
  const packet=branchPacket(targetRoot);
  return legalEdges('lineage').filter(e=>[e.source,e.target].includes(id)&&packet.has(e.source===id?e.target:e.source)&&![e.source,e.target].includes(egoId)&&![e.source,e.target].some(end=>end!==id&&end!==targetRoot&&egoGatewayIds.includes(end)));
}
// Horizontal progress is a viewing convention, not a direction or introduction claim.
export let pathTargetIds: string[] = graph.nodes.filter(node => node.target).map(node => node.id);
/** Refresh browser-local indexes without remounting the explorer or losing its camera. */
export function refreshActiveNetwork() {
  activeArtifact = loadActiveArtifact(); egoId = activeArtifact.meta.ego;
  graph.nodes = activeArtifact.nodes; graph.edges = activeArtifact.edges;
  edges = graph.edges.map((edge,i)=>({...edge,id:`edge-${i}`}));
  nodeById.clear(); for(const node of graph.nodes) nodeById.set(node.id,node);
  egoGatewayIds = [...new Set(egoGatewayEdges().map(edge=>edge.source===egoId?edge.target:edge.source))];
  pathTargetIds = graph.nodes.filter(node=>node.target).map(node=>node.id);
  nobelIds = graph.nodes.filter(node=>node.nobel_prize).map(node=>node.id);
}
export function trajectoryLayout(paths: RankedPath[], targets: string[], coreOnly = false, selected: string | null = null, expanded: Set<string> = new Set()) {
  const legal = pathTraversalEdges(coreOnly);
  const destinations = [...new Set([...pathTargetIds, ...targets])];
  const activeNodes = new Set([egoId, ...egoGatewayIds, ...paths.flatMap(path => path.nodes)]);
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
  const depths = new Map<string, number>([[egoId, 0]]);
  const queue = [egoId];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]; if (!id) continue;
    for (const edge of displayed) {
      const next = edge.source === id ? edge.target : edge.target === id ? edge.source : null;
      if (next && !depths.has(next) && !destinations.includes(next)) { depths.set(next, (depths.get(id) ?? 0) + 1); queue.push(next); }
    }
  }
  const positions = new Map<string, { x: number; y: number }>([[egoId, { x: 0, y: 0 }]]);
  const groups = new Map<string, string[]>();
  for (const id of shownNodes) {
    if (id === egoId || destinations.includes(id)) continue;
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
    ids.sort((a,b) => egoGatewayIds.indexOf(a) - egoGatewayIds.indexOf(b) || a.localeCompare(b));
    const rows = Math.min(ids.length, kind === 'person' ? 5 : 3);
    ids.forEach((id,i) => positions.set(id, { x: rankX(Number(rank)) + Math.floor(i / rows) * 190, y: bands[kind as NetworkNode['kind']] + (i % rows - (rows-1)/2) * 110 }));
  }
  const targetX = rankX(Math.max(3, ...[...depths.values()].map(depth => depth + 1))) + 100;
  destinations.forEach((id,i) => positions.set(id, { x: targetX, y: (i - (destinations.length-1)/2) * 260 }));
  const relevant = selectedEdge ? new Set([selectedEdge.source, selectedEdge.target]) : selected && nodeById.has(selected) ? new Set([selected, ...neighbors(selected).flatMap(edge => [edge.source, edge.target])]) : activeNodes;
  const pathNodes = new Set(paths.flatMap(path => path.nodes));
  const ghostNodes = new Set([...positions.keys()].filter(id => !destinations.includes(id) && id !== egoId && (!activeNodes.has(id) || (!relevant.has(id) && !pathNodes.has(id)))));
  const ghostEdges = new Set(displayed.filter(edge => !activeEdges.has(edge.id) || (selected && edge.id !== selected && edge.source !== selected && edge.target !== selected && !paths.some(path => path.edges.includes(edge.id)))).map(edge => edge.id));
  return { positions, depths, ghostNodes, ghostEdges, expanded: new Set(anchors), edges: displayed.filter(edge => positions.has(edge.source) && positions.has(edge.target)) };
}

type ForceNode = SimulationNodeDatum & { id: string };
export function organicPositions() {
  const nodes: ForceNode[] = graph.nodes.map((n,i) => ({ id:n.id, x:Math.cos(i*2.399)*Math.sqrt(i)*90, y:Math.sin(i*2.399)*Math.sqrt(i)*90, ...(n.id === egoId ? { fx:0,fy:0 } : {}) }));
  const links = edges.map(e => ({ source:e.source,target:e.target,strength:e.strength }));
  const sim = forceSimulation(nodes).force('link',forceLink<ForceNode,typeof links[number]>(links).id(n=>n.id).distance(l=>110+(10-l.strength)*12).strength(.15)).force('charge',forceManyBody().strength(-750)).force('collision',forceCollide(65)).force('x',forceX(0).strength(.025)).force('y',forceY(0).strength(.04)).stop();
  for (let i=0;i<350;i++) sim.tick();
  return new Map(nodes.map(n => [n.id,{x:n.x ?? 0,y:n.y ?? 0}]));
}