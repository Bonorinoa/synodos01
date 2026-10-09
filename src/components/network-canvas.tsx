import { useEffect, useRef, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hopContours, terraceContours, terracePositions, verticalTrailPositions } from '@/lib/cartography';
import { MOTION_MS, settleProgress } from '@/lib/graph-motion';
import type { Core, StylesheetCSS, ElementDefinition } from 'cytoscape';
import { egoId, egoGatewayIds, pathTargetIds, graph, legalEdges, lineageLayout, trajectoryLayout, rankedPaths, weakBases, type Mode, type NetworkEdge } from '@/lib/network';

export type CanvasAPI = { fit: () => void; zoom: (delta:number) => void; focus: (id:string) => void; reveal: (id:string) => void; home: () => void };
type Props = { routeNodes:string[]; viewportKey:string; lineageExpanded:Set<string>; trajectory:ReturnType<typeof trajectoryLayout>; trajectoryKey:string; mode:Mode; coreOnly:boolean; root:string; collapsed:Set<string>; highlighted:string[]; selected:string|null; onSelect:(id:string|null)=>void; onExpand:(id:string)=>void; onZoom:(zoom:number)=>void; apiRef:React.RefObject<CanvasAPI|null> };

// Cytoscape's canvas parser needs sRGB values; colors remain sourced from semantic CSS tokens.
function canvasColor(token:string) {
  const canvas = document.createElement('canvas'); canvas.width=1; canvas.height=1;
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  context.fillRect(0,0,1,1);
  return `rgb(${Array.from(context.getImageData(0,0,1,1).data).slice(0,3).join(',')})`;
}
function styles():StylesheetCSS[] {
  const color = canvasColor;
  return [
    { selector:'node',css:{ shape:'ellipse','background-color':color('--foreground'),'background-opacity':.9,width:20,height:20,label:'data(displayLabel)',color:color('--foreground'),'font-family':'Geist','font-size':12,'text-valign':'bottom','text-margin-y':9,'text-outline-color':color('--background'),'text-outline-width':3,'border-width':3,'border-color':color('--background'),'border-opacity':.25,'text-wrap':'wrap','text-max-width':'145px' } },
    { selector:'node.sourced-person',css:{'background-color':color('--verified')} },
    { selector:'node[kind = "lab"]',css:{shape:'round-rectangle','background-color':color('--lab'),'border-color':color('--lab'),width:24,height:24} },
    { selector:'node[kind = "university"]',css:{shape:'hexagon','background-color':color('--university'),'border-color':color('--university'),width:25,height:25} },
    { selector:'node[kind = "institution"]',css:{shape:'rectangle','background-color':color('--institution'),'border-color':color('--institution'),width:25,height:25} },
    { selector:'node.candidate',css:{'background-opacity':.48,'border-style':'dashed','border-width':1.5,'border-opacity':.55,'text-opacity':.55,width:18,height:18,'font-size':12} },
    { selector:'node.target',css:{shape:'diamond','background-color':color('--target'),'border-color':color('--target'),color:color('--target-foreground'),'border-width':5,'border-opacity':.24,width:34,height:34,'font-size':11} },
    { selector:`node[id = "${egoId}"]`,css:{shape:'rectangle',width:50,height:50,'background-color':color('--focus'),'border-color':color('--background'),'border-width':4,'border-opacity':.5,'font-size':12,'font-weight':600,'text-margin-y':15} },
    { selector:'edge',css:{width:'data(weight)','line-color':color('--canvas-edge'),opacity:.45,'curve-style':'bezier','control-point-step-size':35,'overlay-padding':7} },
    { selector:'edge.weak',css:{width:1,'line-style':'dashed','line-color':color('--canvas-weak'),opacity:.36} },
    { selector:'edge.unverified',css:{width:.8,'line-style':'dotted',opacity:.24,label:'','font-size':11,color:color('--muted-foreground'),'text-rotation':'autorotate','text-background-color':color('--background'),'text-background-opacity':.9,'text-background-padding':'3px'} },
    { selector:'edge.tree',css:{'line-style':'solid','curve-style':'bezier','line-color':color('--verified'),opacity:.65} },
    { selector:'edge.advisor',css:{'source-arrow-shape':'none','source-arrow-color':color('--primary'),'arrow-scale':.8} },
    { selector:'edge.committee',css:{'line-style':'dashed'} },
    { selector:'edge.peer',css:{'line-color':color('--canvas-edge'),opacity:.45,'curve-style':'unbundled-bezier','control-point-distances':-40,'control-point-weights':.5} },
    { selector:'.dim',css:{opacity:.14} },
    { selector:'edge.highlight',css:{'line-color':color('--trail'),opacity:.92} },
    { selector:'edge.highlight.weak',css:{width:1.1,'line-style':'dashed',opacity:.6} },
    { selector:'edge.highlight.unverified',css:{width:.8,'line-style':'dotted',opacity:.4} },
    { selector:'node.highlight',css:{opacity:1,'text-opacity':1,'border-opacity':.4} },
    { selector:'node.direct-contact',css:{shape:'ellipse',width:28,height:28,'border-width':4,'border-color':color('--primary'),'border-opacity':.4,'font-weight':600,'font-size':12} },
    { selector:'edge.ego-gateway',css:{width:2.8,'line-color':color('--verified'),opacity:.9} },
    { selector:'node.focused',css:{'border-color':color('--background'),'border-width':1,'border-opacity':1,'text-opacity':1,opacity:1} },
    { selector:'edge.focused',css:{opacity:1} },
    { selector:'node.ghost',css:{opacity:.035,'text-opacity':.15,'border-opacity':.04} },
    { selector:'edge.ghost',css:{opacity:.012} },
    { selector:'node.target',css:{opacity:1,'text-opacity':1} },
    { selector:'edge.ego-gateway.unverified',css:{width:.8,'line-style':'dashed',opacity:.55} },
    { selector:'edge.low-confidence',css:{width:1,'line-style':'dashed',opacity:.4} },
    { selector:'edge.private-attestation',css:{width:.8,'line-style':'dashed','line-dash-pattern':[5,5],opacity:.55,label:'','line-color':color('--foreground')} },
    { selector:'edge.highlight.private-attestation',css:{'line-color':color('--trail')} },
    { selector:'edge.unverified, edge.low-confidence, edge.weak',css:{'line-color':color('--foreground')} },
    { selector:'edge.highlight.unverified, edge.highlight.low-confidence, edge.highlight.weak',css:{'line-color':color('--trail')} },
    { selector:'node.lineage-node',css:{width:26,height:26,'font-size':12,'font-weight':400,'text-max-width':'110px','text-margin-y':6,'border-width':2} },
    { selector:'node.lineage-node.direct-contact',css:{width:20,height:20,'font-size':12,'font-weight':500,'border-width':3} },
    { selector:`node[id = "${egoId}"].lineage-node`,css:{width:32,height:32,'font-size':12,'font-weight':600,'border-width':5} },
    { selector:'node.lineage-node.nobel-laureate',css:{'font-weight':600} },
    { selector:'node.lineage-context',css:{width:9,height:9,opacity:.2,'text-opacity':.45,'border-width':0,'font-size':11} },
    { selector:'edge.branch-link',css:{'line-style':'dashed','line-color':color('--verified'),opacity:.5,'curve-style':'bezier'} },
    { selector:'edge.lineage-context',css:{opacity:.09,label:'',width:.6} },
  ];
}

export function NetworkCanvas(props:Props) {
  const container = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const topoTransform = useRef<SVGGElement>(null);
  const lastRoute=useRef('');
  const [contours,setContours]=useState<ReturnType<typeof hopContours>>([]);
  const cyRef = useRef<Core|null>(null);
  const current = useRef(props); current.current=props;
  const motionFrame=useRef<number|null>(null);
  const overlayFrame=useRef<number|null>(null);
  const lineageCache=useRef<{root:string;core:boolean;collapsed:Set<string>;expanded:Set<string>;edges:typeof graph.edges;layout:ReturnType<typeof lineageLayout>}|null>(null);
  const getLineage=()=>{const p=current.current,c=lineageCache.current;if(c&&c.root===p.root&&c.core===p.coreOnly&&c.collapsed===p.collapsed&&c.expanded===p.lineageExpanded&&c.edges===graph.edges)return c.layout;const layout=lineageLayout(p.root,p.coreOnly,p.collapsed,p.lineageExpanded);lineageCache.current={root:p.root,core:p.coreOnly,collapsed:p.collapsed,expanded:p.lineageExpanded,edges:graph.edges,layout};return layout;};
  const moveGeometry=(positions:Map<string,{x:number;y:number}>,camera?:{zoom:number;pan:{x:number;y:number}},instant=false)=>{
    const cy=cyRef.current;if(!cy)return;
    if(motionFrame.current!==null)cancelAnimationFrame(motionFrame.current);
    const starts=new Map(cy.nodes().map(n=>[n.id(),{...n.position()}] as const));
    const zoom=cy.zoom(),pan={...cy.pan()},start=performance.now();
    const apply=(t:number)=>{cy.batch(()=>{cy.nodes().forEach(n=>{const end=positions.get(n.id()),from=starts.get(n.id());if(end&&from)n.position({x:from.x+(end.x-from.x)*t,y:from.y+(end.y-from.y)*t});});if(camera){cy.zoom(zoom+(camera.zoom-zoom)*t);cy.pan({x:pan.x+(camera.pan.x-pan.x)*t,y:pan.y+(camera.pan.y-pan.y)*t});}});};
    if(instant||window.matchMedia('(prefers-reduced-motion: reduce)').matches){apply(1);motionFrame.current=null;rebuildContours();return;}
    const tick=(now:number)=>{const progress=Math.min(1,(now-start)/MOTION_MS);apply(settleProgress(progress));if(progress<1)motionFrame.current=requestAnimationFrame(tick);else{motionFrame.current=null;rebuildContours();}};
    motionFrame.current=requestAnimationFrame(tick);
  };
  const narrow=()=>window.matchMedia('(max-width: 640px)').matches;
  const readablePositions=(positions:Map<string,{x:number;y:number}>,ids:string[],columns:number,width:number,startY:number,step=64)=>{
    const rows=Math.ceil(ids.length/columns);ids.forEach((id,i)=>{const row=Math.floor(i/columns),count=Math.min(columns,ids.length-row*columns);positions.set(id,{x:(i%columns-(count-1)/2)*width,y:startY+row*step});});return startY+rows*step;
  };
  const displayPositions=()=>{
    const p=current.current,cy=cyRef.current,width=cy?.width()??window.innerWidth;
    if(p.mode==='lineage'){
      const layout=getLineage(),positions=new Map([...layout.positions,...layout.contextPositions]);
      if(narrow()){
        let y=0;
        for(const depth of [...new Set([...layout.positions.keys()].map(id=>layout.depth.get(id)??0))].sort((a,b)=>a-b)){
          const ids=[...layout.positions.keys()].filter(id=>layout.depth.get(id)===depth);
          const columns=depth===0?1:depth===1?2:3;
          y=readablePositions(positions,ids,columns,(width-48)/columns,y,depth===0?90:100);
        }
      }
      return positions;
    }
    const positions=narrow()?verticalTrailPositions(p.routeNodes.length?p.routeNodes:egoGatewayIds,pathTargetIds,p.trajectory.depths,p.trajectory.positions):new Map(p.trajectory.positions);
    if(p.selected){
      const ids=[...positions.keys()].filter(id=>!p.trajectory.ghostNodes.has(id));const leading=[...new Set([egoId,p.selected])].filter(id=>ids.includes(id));
      if(narrow()&&p.routeNodes.length){
        const route=p.routeNodes.filter(id=>ids.includes(id)),lane=-(width-48)*.22;
        route.forEach((id,i)=>positions.set(id,{x:lane,y:i*68}));
        const primary=new Set([...route,p.selected,...pathTargetIds]);
        const sideX=(width-48)*.28;
        let sideRow=0;for(const id of primary)if(!route.includes(id)&&ids.includes(id))positions.set(id,{x:sideX,y:sideRow++*90});
        const remainder=ids.filter(id=>!primary.has(id));
        remainder.forEach((id,i)=>positions.set(id,{x:sideX,y:600+i*90}));
        return positions;
      }
      const end=readablePositions(positions,leading,2,narrow()?(width-40)/2:240,0,narrow()?50:140);
      readablePositions(positions,ids.filter(id=>!leading.includes(id)),narrow()?2:4,narrow()?(width-40)/2:180,end+28,narrow()?90:110);return positions;
    }
    if(narrow())return positions;
    return terracePositions(egoId,p.trajectory.depths,[...positions.keys()],pathTargetIds,p.trajectory.edges);
    return positions;
  };
  const updateTopo=()=>{const cy=cyRef.current;if(!cy)return;const zoom=cy.zoom(),pan=cy.pan();topoTransform.current?.setAttribute('transform',`translate(${pan.x} ${pan.y}) scale(${zoom})`);const labels:{x:number;y:number;w:number}[]=[];topoTransform.current?.querySelectorAll('text').forEach(text=>{
    text.setAttribute('font-size',`${11/zoom}px`);
    const anchorX=Number(text.dataset['anchorX'])*zoom+pan.x,anchorY=Number(text.dataset['anchorY'])*zoom+pan.y;
    const w=text.getComputedTextLength()*zoom;
    const previous=labels.at(-1);
     const x=Math.max(24,Math.min(cy.width()-w-24,anchorX),current.current.mode==='path'&&previous?previous.x+previous.w+20:24),y=anchorY;
    const hidden=anchorX<0||anchorX>cy.width()||y<16||y>cy.height()-12||w>cy.width()-24||x+w>cy.width()-24||labels.some(p=>x<p.x+p.w+12&&x+w+12>p.x&&Math.abs(p.y-y)<18);
    text.setAttribute('x',`${(x-pan.x)/zoom}`);text.setAttribute('y',`${(y-pan.y)/zoom}`);text.style.visibility=hidden?'hidden':'visible';if(!hidden)labels.push({x,y,w});
  });};
  const rebuildContours=()=>{
    const cy=cyRef.current;if(!cy)return;const p=current.current;
    const depths=p.mode==='lineage'?getLineage().depth:p.trajectory.depths;
    const routeDepths=new Map(p.routeNodes.map((id,i)=>[id,i]));
    const terraced=p.mode==='path'&&!narrow()&&!p.selected;
    setContours((terraced?terraceContours:hopContours)(cy.nodes().filter(n=>!n.hasClass('ghost')&&!n.hasClass('lineage-context')&&(p.mode!=='path'||!p.routeNodes.length||p.routeNodes.includes(n.id()))).toArray().flatMap(n=>{
      if(!n.isNode())return [];const depth=routeDepths.get(n.id())??depths.get(n.id())??rankedPaths(n.id(),p.coreOnly)[0]?.edges.length;if(depth===undefined)return [];
      return [{id:n.id(),...n.position(),depth}];
    }),...(terraced?[]:[Math.max(76,58/cy.zoom())]) as []));
  };
  const [hitNodes,setHitNodes]=useState<{id:string;label:string;x:number;y:number}[]>([]);
  const [bands,setBands]=useState<{depth:number;y:number}[]>([]);
  const [locks,setLocks]=useState<{id:string;x:number;y:number}[]>([]);
  const updateLocks=()=>{
    const cy=cyRef.current;if(!cy)return;
     setLocks(cy.edges('.private-attestation').filter(edge=>!edge.hasClass('ghost')).toArray().flatMap(edge=>{
       if(!edge.isEdge())return [];
       const a=edge.source().renderedPosition(),b=edge.target().renderedPosition();
       if(narrow()){
         const node=edge.source().id()===current.current.root?edge.target():edge.source();
         const point=node.renderedPosition();
         if(point.x<24||point.x>cy.width()-24||point.y<24||point.y>cy.height()-24)return [];
         return [{id:edge.id(),x:point.x+22,y:point.y-18}];
       }
        return [{id:edge.id(),x:a.x*.65+b.x*.35,y:a.y*.65+b.y*.35-18}];
    }));
  };
  const updatePathLabels = () => {
    const cy=cyRef.current;if(!cy)return;
    const zoom=cy.zoom(),compact=narrow();
    const occupied:{x:number;y:number;w:number;h:number}[]=[];
    const nodes=cy.nodes().sort((a,b)=>Number(b.id()===current.current.selected||b.data('target')||b.id()===egoId)-Number(a.id()===current.current.selected||a.data('target')||a.id()===egoId)||Number(a.hasClass('ghost'))-Number(b.hasClass('ghost')));
    nodes.forEach(node=>{
      const ghost=node.hasClass('ghost')||node.hasClass('lineage-context');
      const landmark=node.data('target')||node.id()===egoId||node.id()===current.current.selected||(current.current.mode==='lineage'&&node.hasClass('direct-contact'));
       const direct=current.current.mode==='lineage'&&node.hasClass('direct-contact');
       const routeNode=current.current.mode==='path'&&current.current.routeNodes.includes(node.id());
       const lineageNode=compact&&current.current.mode==='lineage'&&!ghost;
       const destination=compact&&node.data('target');
       const stagger=direct&&!compact?Math.max(0,['monica-capra','eitel-lauria','erik-johnston','raymond-duch'].indexOf(node.id())%2)*32:0;
         const point=node.renderedPosition(),width=Math.max(44,compact&&lineageNode&&!direct&&node.id()!==egoId?(cy.width()-48)/3-12:compact&&(direct||routeNode||destination||lineageNode)?(cy.width()-48)/2-12:ghost?80:compact?(node.id()===current.current.selected||direct?Math.min(160,(cy.width()-40)/2-8):Math.min(108,(cy.width()-40)/(current.current.mode==='path'&&current.current.selected?4:3)-8)):130);
        const labelWidth=Math.max(44,width/Math.max(zoom,.01));
       const box={x:point.x-width/2,y:point.y+node.renderedHeight()/2+(compact?6:12)+stagger,w:width,h:compact&&(direct||routeNode||lineageNode||destination)?36:compact?18:30};
      const collision=occupied.some(other=>box.x<other.x+other.w&&box.x+box.w>other.x&&box.y<other.y+other.h&&box.y+box.h>other.y);
       const clipped=box.x<0||box.x+box.w>cy.width()||box.y<0||box.y+box.h>cy.height();
        const guide=document.querySelector('.trail-guide')?.getBoundingClientRect();const underGuide=guide&&box.x<guide.right&&box.x+box.w>guide.left&&box.y<guide.bottom&&box.y+box.h>guide.top;
       const sheet=document.querySelector('.inspector')?.getBoundingClientRect();
       const behindSheet=compact&&sheet&&box.y+box.h>sheet.top;
       const hide=!!behindSheet||(clipped&&!landmark)||(!landmark&&!!underGuide)||(!landmark&&((ghost&&(zoom<1.8||compact))||collision));
       node.style('opacity',ghost?(compact?0:.035):node.hasClass('dim')?.14:1);
      const base=node.id()===egoId?48:node.data('target')?38:ghost?9:compact?22:26;
       const size=Math.max(base*.72,Math.min(base*1.3,base*zoom));
       node.style('width',`${size/zoom}px`);node.style('height',`${size/zoom}px`);
      if(!hide)occupied.push(box);
        node.style('label',hide?'\u00a0':String(node.data('displayLabel')??''));
       node.style('text-opacity',hide?0:ghost?.25:1);
      node.style('font-size',`${(ghost?11:12)/zoom}px`);
       node.style('text-max-width',`${labelWidth}px`);node.style('text-wrap',compact&&!direct&&!routeNode&&!lineageNode&&!destination?'ellipsis':'wrap');
      node.style('text-margin-y',`${((compact?6:12)+stagger)/zoom}px`);
    });
  };
  const updateHitTargets = () => {
    const cy=cyRef.current;if(!cy)return;
    setHitNodes(cy.nodes().filter(n=>!n.hasClass('ghost')&&!n.hasClass('lineage-context')).toArray().flatMap(n=>n.isNode()?[{id:n.id(),label:n.data('label'),...n.renderedPosition()}]:[]).filter(n=>n.x>0&&n.x<cy.width()&&n.y>0&&n.y<cy.height()));
    if(current.current.mode==='lineage'){
      const layout=getLineage();
      const levels=new Map<number,number>();cy.nodes().filter(n=>!n.hasClass('lineage-context')).forEach(n=>{const depth=layout.depth.get(n.id())??0;levels.set(depth,Math.min(levels.get(depth)??Infinity,n.position().y));});
      setBands([...levels].sort(([a],[b])=>a-b).map(([depth,y])=>({depth,y:y*cy.zoom()+cy.pan().y-(narrow()?24:60)})));
    }else setBands([]);
  };
  const fitView = () => {
    const cy=cyRef.current;if(!cy)return;
    const display=displayPositions();cy.nodes().forEach(node=>{const point=display.get(node.id());if(point)node.position(point);});
    if(current.current.mode==='path'&&narrow()){
      cy.zoom(.85);cy.pan({x:cy.width()/2,y:178});updatePathLabels();updateTopo();return;
    }
    if(current.current.mode==='lineage'){
      const layout=getLineage();
      const points=[...layout.positions.values()];
      const x1=Math.min(...points.map(point=>point.x))-65,y1=Math.min(...points.map(point=>point.y))-30;
      const box={x1,y1,w:Math.max(...points.map(point=>point.x))+65-x1,h:Math.max(...points.map(point=>point.y))+50-y1};const width=cy.width(),height=cy.height();
      const right=!narrow()&&current.current.selected?400:64;
      const top=160;const bottom=64;
      const availableHeight=Math.max(150,height-top-bottom);
      const zoom=Math.max(.15,Math.min(1.15,(width-right-55)/Math.max(box.w+80,1),availableHeight/Math.max(box.h+160,1)));
      cy.zoom(zoom);cy.pan({x:30+(width-right-30)/2-(box.x1+box.w/2)*zoom,y:top+Math.min(availableHeight*.25,170)-box.y1*zoom});
      return;
    }
     const active=new Set([egoId,...current.current.highlighted.flatMap(id=>{const e=cy.getElementById(id);return e.isEdge()?[e.source().id(),e.target().id()]:[]})]);
     const points=cy.nodes().filter(node=>current.current.highlighted.length?active.has(node.id()):!current.current.trajectory.ghostNodes.has(node.id())).toArray().flatMap(node=>node.isNode()?[node.position()]:[]);
    const x1=Math.min(...points.map(p=>p.x))-80,x2=Math.max(...points.map(p=>p.x))+80;
    const y1=Math.min(...points.map(p=>p.y))-65,y2=Math.max(...points.map(p=>p.y))+85;
    const box={x1,y1,w:x2-x1,h:y2-y1};
    const width=cy.width(),height=cy.height();
    const right=!narrow()&&current.current.selected?400:64;
    const top=128;
    const availableHeight=Math.max(130,height-top-55);
    const zoom=Math.max(.04,Math.min(.95,(width-right-80)/Math.max(box.w,1),availableHeight/Math.max(box.h,1)));
    cy.zoom(zoom);cy.pan({x:50+(width-right-50)/2-(box.x1+box.w/2)*zoom,y:top+availableHeight/2-(box.y1+box.h/2)*zoom});
    updatePathLabels();
  };
  const viewports = useRef<Partial<Record<Mode,{zoom:number;pan:{x:number;y:number}}>>>({});
  const lastMode = useRef<Mode>(props.mode);
  const lastRoot = useRef(props.root);
  const lastViewportKey=useRef<string|null>(null);
  const renderGraph = useRef<()=>void>(()=>{});
  const updateHalo = () => {
    const element=halo.current;
    const cy=cyRef.current;
    if(!element||!cy)return;
    const selected=current.current.selected;
    const node=selected?cy.getElementById(selected):null;
    if(!node?.length||!node.isNode()){element.hidden=true;return;}
    const position=node.renderedPosition();
    const size=node.renderedWidth()+8;
    element.hidden=false;
    element.style.left=`${position.x}px`;
    element.style.top=`${position.y}px`;
    element.style.width=`${size}px`;
    element.style.height=`${size}px`;
  };

  renderGraph.current = () => {
    const cy=cyRef.current; if (!cy) return;
    const { mode,coreOnly,root,collapsed }=current.current;
    if (lastMode.current !== mode) viewports.current[lastMode.current]={zoom:cy.zoom(),pan:cy.pan()};
    const changed=lastMode.current!==mode;
    const lineage=getLineage();
    const positions=displayPositions();
    const visibleNodes=graph.nodes.filter(n=>(!coreOnly||!n.candidate||n.id===root)&&positions.has(n.id));
    const ids=new Set(visibleNodes.map(n=>n.id));
    const visibleEdges=(mode==='lineage'?[...lineage.edges,...lineage.contextEdges]:current.current.trajectory.edges).filter(e=>ids.has(e.source)&&ids.has(e.target));
    const elements:ElementDefinition[]=[...visibleNodes.map(n=>({data:{...n,id:n.id,displayLabel:n.id===egoId?n.label.split(' ')[0]:n.label.startsWith('Concordia (')?'Concordia\n(DeepMind)':n.label},position:positions.get(n.id) ?? {x:0,y:0},classes:[n.kind==='person'&&visibleEdges.some(e=>[e.source,e.target].includes(n.id)&&e.evidence.urls.length>0&&e.evidence.confidence!=='low')?'sourced-person':'',mode==='lineage'?'lineage-node':'',mode==='lineage'&&n.kind==='person'&&n.nobel_prize?'nobel-laureate':'',mode==='lineage'&&lineage.hidden.has(n.id)?'lineage-context':'',mode==='path'&&current.current.trajectory.ghostNodes.has(n.id)?'ghost':'',n.candidate?'candidate':'',n.target?'target':'',n.id!==egoId&&(mode==='lineage'?lineage.depth.get(n.id)===1:current.current.trajectory.depths.get(n.id)===1)?'direct-contact':''].join(' ')})),...visibleEdges.map((e:NetworkEdge)=>({data:{...e,weight:weakBases.has(e.evidence.basis)?1:1.1+e.strength*.16},classes:[mode==='lineage'&&(lineage.hidden.has(e.source)||lineage.hidden.has(e.target))?'lineage-context':'',mode==='path'&&current.current.trajectory.ghostEdges.has(e.id)?'ghost':'',weakBases.has(e.evidence.basis)?'weak':'',!e.evidence.urls.length||e.evidence.review_status==='pending'?'unverified':'',e.evidence.confidence==='low'?'low-confidence':'',e.evidence.ego_gateway?'ego-gateway':'',e.evidence.attestation==='user'?'private-attestation':'',mode==='lineage'&&['phd_advisor','research_group'].includes(e.evidence.basis)?'tree':'',mode==='lineage'&&e.evidence.basis==='phd_advisor'&&!e.evidence.claim.toLowerCase().includes('not repec chair')&&!e.evidence.claim.toLowerCase().includes('committee (academia')?'advisor':'',(e.evidence.basis==='committee'||e.evidence.basis==='phd_advisor'&&e.evidence.claim.startsWith('Dissertation committee'))?'committee':'',mode==='lineage'&&lineage.depth.get(e.source)===lineage.depth.get(e.target)?'peer':'',mode==='lineage'&&['talking-to-machines'].some(id=>[e.source,e.target].includes(id))?'branch-link':''].join(' ')}))];
    const previous={zoom:cy.zoom(),pan:cy.pan()};
    const existing=new Map(cy.nodes().map(node=>[node.id(),node.position()] as const));
    const wanted=new Set(elements.map(element=>element.data.id));
    cy.batch(()=>{cy.elements().filter(element=>!wanted.has(element.id())).remove();for(const element of elements){const previousElement=cy.getElementById(element.data.id??'');if(previousElement.length)previousElement.data(element.data).classes(element.classes??'');else cy.add(element);}});
    
      const destinations=new Map(positions);cy.nodes().forEach(node=>{const oldPosition=mode==='path'&&!narrow()&&!current.current.routeNodes.includes(node.id())&&!changed&&lastViewportKey.current===current.current.viewportKey?existing.get(node.id()):undefined;if(!current.current.selected&&oldPosition)destinations.set(node.id(),oldPosition);node.stop();});moveGeometry(destinations,undefined,changed||existing.size===0);
    if (changed) { const saved=viewports.current[mode]; if (saved) {cy.zoom(saved.zoom);cy.pan(saved.pan);} else if (mode==='lineage') { cy.zoom(.8); cy.pan({x:cy.width()*.53,y:cy.height()*.35}); } }
    else {cy.zoom(previous.zoom);cy.pan(previous.pan);}
    if(mode==='lineage'&&(changed||lastRoot.current!==root)){if(narrow()){cy.zoom(1);cy.pan({x:cy.width()/2,y:184});}else fitView();}
    if(mode==='path'&&(changed||lastViewportKey.current!==current.current.viewportKey)){lastViewportKey.current=current.current.viewportKey;fitView();}
    const routeKey=current.current.routeNodes.join('|');
    if(mode==='path'&&routeKey&&routeKey!==lastRoute.current&&!narrow()){const end=positions.get(current.current.routeNodes.at(-1)??'');if(end)moveGeometry(destinations,{zoom:cy.zoom(),pan:{x:(cy.width()-end.x*cy.zoom())/2,y:cy.height()/2}});}
    if(mode==='lineage'&&!changed&&existing.size)requestAnimationFrame(()=>current.current.apiRef.current?.reveal(current.current.selected??root));
    lastRoute.current=routeKey;
    if(current.current.highlighted.length){cy.elements().addClass('dim');for(const id of current.current.highlighted){const edge=cy.getElementById(id);edge.removeClass('dim').addClass('highlight');edge.connectedNodes().removeClass('dim').addClass('highlight');}}
    if(current.current.selected){const selected=cy.getElementById(current.current.selected);selected.removeClass('dim').addClass('focused');if(selected.isNode()){selected.connectedEdges().removeClass('dim');selected.neighborhood('node').removeClass('dim');}}
    cy.nodes('.target').removeClass('dim');
    rebuildContours();
    updatePathLabels();updateLocks();updateHitTargets();
    updateHalo();
    lastRoot.current=root;
    lastMode.current=mode;
  };

  useEffect(()=>{
    let cancelled=false; let observer:ResizeObserver|undefined;let removeWheel:(()=>void)|undefined;
    import('cytoscape').then(({default:cytoscape})=>{
      if (cancelled||!container.current) return;
      const cy=cytoscape({container:container.current,elements:[],style:styles(),layout:{name:'preset'},minZoom:.04,maxZoom:3,wheelSensitivity:.18,boxSelectionEnabled:false,selectionType:'single'});
      cyRef.current=cy; renderGraph.current();
      const initialZoom=()=>cy.width()<640?.43:Math.min(.83,Math.max(.48,(cy.height()-200)/1100));
      if(current.current.mode==='path'){cy.zoom(.83);fitView();}else {cy.zoom(initialZoom());cy.pan({x:cy.width()*.54,y:cy.height()*.54});}
      current.current.onZoom(cy.zoom());
      cy.on('tap','node, edge',event=>{const id=event.target.id();current.current.onSelect(id);if(event.target.isNode())current.current.apiRef.current?.focus(id);});
      cy.on('tap',event=>{if(event.target===cy)current.current.onSelect(null);});
       cy.on('zoom',()=>{current.current.onZoom(cy.zoom());});
      const surface=container.current.parentElement;
      const horizontalWheel=(event:WheelEvent)=>{
        if(!(event.target instanceof Node)||!surface?.contains(event.target))return;
        if(event.ctrlKey||Math.abs(event.deltaX)<=Math.abs(event.deltaY))return;
        event.preventDefault();event.stopImmediatePropagation();
        const unit=event.deltaMode===1?16:event.deltaMode===2?cy.width():1;
        cy.panBy({x:-event.deltaX*unit,y:-event.deltaY*unit});
      };
      surface?.addEventListener('wheel',horizontalWheel,{capture:true,passive:false});
      removeWheel=()=>surface?.removeEventListener('wheel',horizontalWheel,true);
        cy.on('pan zoom position resize',()=>{if(overlayFrame.current!==null)return;overlayFrame.current=requestAnimationFrame(()=>{overlayFrame.current=null;updateTopo();updateHalo();updateLocks();updatePathLabels();updateHitTargets();});});
       cy.on('dragfree','node',event=>{if(current.current.mode==='path')current.current.trajectory.positions.set(event.target.id(),event.target.position());renderGraph.current();});
       const frameNodes=(id:string,expansion:boolean)=>{
          const node=cy.getElementById(id);if(!node.length||!node.isNode())return;
          const p=current.current;
           const positions=displayPositions();
           const nodes=cy.nodes().filter(n=>!n.hasClass('ghost')&&!n.hasClass('lineage-context')&&(!narrow()||p.mode!=='path'||!p.routeNodes.length||(positions.get(n.id())?.y??0)<600));
           const points=nodes.toArray().flatMap(n=>{const point=positions.get(n.id());return point?[point]:[];});if(!points.length)return;
           const stage=container.current?.getBoundingClientRect(),sheet=document.querySelector('.inspector')?.getBoundingClientRect();
           const left=!narrow()&&document.querySelector('.trail-guide[data-open=true]')?330:48,right=!narrow()&&p.selected?400:48;
           const top=narrow()?174:160,bottom=narrow()&&stage&&sheet&&p.selected?sheet.top-stage.top-64:cy.height()-64;
           const width=cy.width()-left-right,height=Math.max(240,bottom-top);
           const x1=Math.min(...points.map(point=>point.x)),x2=Math.max(...points.map(point=>point.x)),y1=Math.min(...points.map(point=>point.y)),y2=Math.max(...points.map(point=>point.y));
            const zoom=narrow()?Math.max(.3,Math.min(1,(bottom-top)/Math.max(1,y2-y1),(cy.width()-64)/Math.max(1,x2-x1))):Math.max(.3,Math.min(1.15,Math.max(100,width-80)/Math.max(1,x2-x1),Math.max(100,height-70)/Math.max(1,y2-y1)));
           if(narrow()){for(const [key,point] of positions)positions.set(key,{x:point.x/zoom,y:point.y});}
            const pan={x:narrow()?cy.width()/2-(x1+x2)/2:left+width/2-(x1+x2)/2*zoom,y:narrow()?top-y1*zoom:top+height/2-(y1+y2)/2*zoom};
           rebuildContours();
           cy.stop();moveGeometry(positions,{zoom,pan});
        };
        const revealBranch=(id:string)=>frameNodes(id,true);
        const focusNode=(id:string)=>frameNodes(id,false);
        current.current.apiRef.current={fit:fitView,zoom:delta=>cy.zoom({level:Math.max(.15,Math.min(3,cy.zoom()+delta)),renderedPosition:{x:cy.width()/2,y:cy.height()/2}}),focus:focusNode,reveal:revealBranch,home:()=>focusNode(current.current.mode==='lineage'?current.current.root:egoId)};
      let previousSize={width:cy.width(),height:cy.height()},previousNarrow=narrow();
        observer=new ResizeObserver(()=>{const old=previousSize;cy.resize();const next={width:cy.width(),height:cy.height()};cy.panBy({x:(next.width-old.width)/2,y:(next.height-old.height)/2});previousSize=next;const breakpointChanged=previousNarrow!==narrow();previousNarrow=narrow();if(breakpointChanged){renderGraph.current();if(current.current.selected)focusNode(current.current.selected);else if(narrow()&&current.current.mode==='lineage'){cy.zoom(1);cy.pan({x:cy.width()/2,y:184});}else fitView();}else if(current.current.mode==='path'&&current.current.routeNodes.length&&!narrow()){const points=displayPositions();for(const id of [...current.current.routeNodes,...pathTargetIds]){const point=points.get(id);if(point)cy.getElementById(id).position(point);}const end=points.get(current.current.routeNodes.at(-1)??'');if(end)cy.pan({x:(cy.width()-end.x*cy.zoom())/2,y:cy.height()/2});}if(current.current.selected)focusNode(current.current.selected);rebuildContours();updateTopo();updateHalo();updatePathLabels();updateLocks();updateHitTargets();});observer.observe(container.current);
    });
    return()=>{cancelled=true;if(motionFrame.current!==null)cancelAnimationFrame(motionFrame.current);if(overlayFrame.current!==null)cancelAnimationFrame(overlayFrame.current);removeWheel?.();observer?.disconnect();cyRef.current?.destroy();cyRef.current=null;current.current.apiRef.current=null;};
  },[]);
  useEffect(()=>renderGraph.current(),[props.mode,props.coreOnly,props.root,props.collapsed,props.lineageExpanded,props.trajectory,props.trajectoryKey,props.viewportKey]);
  useEffect(()=>{
    const cy=cyRef.current;if(!cy)return;
    cy.elements().removeClass('dim highlight focused');
    if(props.highlighted.length){cy.elements().addClass('dim');for(const id of props.highlighted){const edge=cy.getElementById(id);edge.removeClass('dim').addClass('highlight');edge.connectedNodes().removeClass('dim').addClass('highlight');}}
    if(props.selected){const selected=cy.getElementById(props.selected);selected.removeClass('dim').addClass('focused');if(selected.isNode()){selected.connectedEdges().removeClass('dim');selected.neighborhood('node').removeClass('dim');}else cy.edges().filter(e=>e.id()===props.selected).connectedNodes().removeClass('dim').addClass('highlight');}
    cy.nodes('.target').removeClass('dim');
    if(narrow())cy.edges('.ghost, .lineage-context').style('opacity',0);
    updatePathLabels();
    updateHalo();
   },[props.highlighted,props.selected,props.mode,props.coreOnly,props.root,props.collapsed,props.trajectory]);
   useEffect(()=>{updateTopo();},[contours]);
   useEffect(()=>{const sheet=document.querySelector('.inspector');if(!sheet||!props.selected)return;const observer=new ResizeObserver(()=>{if(props.selected)props.apiRef.current?.focus(props.selected);});observer.observe(sheet);return()=>observer.disconnect();},[props.selected]);
   return <div className="canvas-stage"><svg className="hop-topography" aria-hidden="true"><g ref={topoTransform}>{contours.map(c=><g key={c.depth} data-hop={c.depth}><path d={c.path}/>{props.mode==='path'&&<text data-anchor-x={c.label.x} data-anchor-y={c.label.y} x={c.label.x} y={c.label.y}>Hop {c.depth}</text>}</g>)}</g></svg><div ref={container} className="network-canvas" role="img" aria-label={`${props.mode === 'path' ? 'Owner-to-target trail' : 'Vertical lineage'} canvas. ${props.mode === 'path' ? props.trajectory.positions.size : lineageLayout(props.root,props.coreOnly,props.collapsed,props.lineageExpanded).positions.size} nodes.`}/>{bands.map(b=><div className="depth-band" key={b.depth} style={{top:b.y}}><span>Hop {b.depth}</span></div>)}{hitNodes.map(n=><Button key={n.id} className="node-hit" variant="ghost" size="icon" aria-label={`Select ${n.label}`} title={n.label} style={{left:n.x,top:n.y}} onClick={()=>{props.onSelect(n.id);props.apiRef.current?.focus(n.id);}}/>)}{props.mode==='path'&&props.routeNodes.length>0&&props.routeNodes.flatMap((id,index)=>{const n=hitNodes.find(n=>n.id===id);return n?[{...n,index}]:[];}).map(n=><span className="waypoint-number" key={`waypoint-${n.id}`} style={{left:n.x-48,top:n.y-18}}>{n.index+1}</span>)}{hitNodes.filter(n=>graph.nodes.find(node=>node.id===n.id)?.nobel_prize).map(n=><span key={`nobel-${n.id}`}><span className="nobel-glow" aria-hidden="true" style={{left:n.x,top:n.y}}/><span className="nobel-badge" style={{left:n.x+12,top:n.y-22}} aria-label="Nobel laureate">★</span></span>)}<div ref={halo} className="selection-halo" aria-hidden="true" hidden/>{locks.map(lock=><span key={lock.id} className="canvas-lock" aria-hidden="true" style={{left:lock.x,top:lock.y}}><LockKeyhole size={11}/></span>)}</div>;
}