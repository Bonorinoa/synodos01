import { useEffect, useRef } from 'react';
import type { Core, StylesheetCSS, ElementDefinition } from 'cytoscape';
import { graph, legalEdges, lineageLayout, trajectoryLayout, weakBases, type Mode, type NetworkEdge } from '@/lib/network';

export type CanvasAPI = { fit: () => void; zoom: (delta:number) => void; focus: (id:string) => void; home: () => void };
type Props = { trajectory:ReturnType<typeof trajectoryLayout>; trajectoryKey:string; mode:Mode; coreOnly:boolean; root:string; collapsed:Set<string>; highlighted:string[]; selected:string|null; onSelect:(id:string|null)=>void; onExpand:(id:string)=>void; onZoom:(zoom:number)=>void; apiRef:React.RefObject<CanvasAPI|null> };

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
    { selector:'node',css:{ shape:'rectangle','background-color':color('--person'),'background-opacity':.9,width:20,height:20,label:'data(displayLabel)',color:color('--foreground'),'font-family':'Rubik','font-size':10,'text-valign':'bottom','text-margin-y':9,'text-outline-color':color('--background'),'text-outline-width':3,'border-width':3,'border-color':color('--person'),'border-opacity':.25,'text-wrap':'wrap','text-max-width':'145px' } },
    { selector:'node[kind = "lab"]',css:{shape:'round-rectangle','background-color':color('--lab'),'border-color':color('--lab'),width:24,height:24} },
    { selector:'node[kind = "university"]',css:{shape:'diamond','background-color':color('--university'),'border-color':color('--university'),width:25,height:25} },
    { selector:'node[kind = "institution"]',css:{shape:'hexagon','background-color':color('--institution'),'border-color':color('--institution'),width:25,height:25} },
    { selector:'node.candidate',css:{'background-opacity':.48,'border-style':'dashed','border-width':1.5,'border-opacity':.55,'text-opacity':.55,width:18,height:18,'font-size':10} },
    { selector:'node.target',css:{shape:'diamond','background-color':color('--target'),'border-color':color('--target'),color:color('--target'),'border-width':5,'border-opacity':.24,width:34,height:34,'font-size':11} },
    { selector:'#augusto',css:{shape:'rectangle',width:50,height:50,'background-color':color('--focus'),'border-color':color('--primary'),'border-width':6,'border-opacity':.5,'font-size':12,'font-weight':600,'text-margin-y':15} },
    { selector:'edge',css:{width:'data(weight)','line-color':color('--canvas-edge'),opacity:.45,'curve-style':'bezier','control-point-step-size':35,'overlay-padding':7} },
    { selector:'edge.weak',css:{width:1,'line-style':'dashed','line-color':color('--canvas-weak'),opacity:.36} },
    { selector:'edge.unverified',css:{width:.8,'line-style':'dotted',opacity:.24,label:'unverified','font-size':8,color:color('--muted-foreground'),'text-rotation':'autorotate','text-background-color':color('--background'),'text-background-opacity':.9,'text-background-padding':'3px'} },
    { selector:'edge.tree',css:{'line-style':'solid','curve-style':'bezier','line-color':color('--primary'),opacity:.65} },
    { selector:'edge.advisor',css:{'source-arrow-shape':'triangle','source-arrow-color':color('--primary'),'arrow-scale':.8} },
    { selector:'edge.committee',css:{'line-style':'dashed'} },
    { selector:'edge.peer',css:{'line-color':color('--canvas-edge'),opacity:.45,'curve-style':'unbundled-bezier','control-point-distances':-40,'control-point-weights':.5} },
    { selector:'.dim',css:{opacity:.14} },
    { selector:'edge.highlight',css:{'line-color':color('--primary'),opacity:.92} },
    { selector:'edge.highlight.weak',css:{width:1.1,'line-style':'dashed',opacity:.6} },
    { selector:'edge.highlight.unverified',css:{width:.8,'line-style':'dotted',opacity:.4} },
    { selector:'node.highlight',css:{opacity:1,'text-opacity':1,'border-opacity':.4} },
    { selector:'node.direct-contact',css:{shape:'diamond',width:28,height:28,'border-width':4,'border-color':color('--primary'),'border-opacity':.4,'font-weight':600,'font-size':10} },
    { selector:'edge.ego-gateway',css:{width:2.8,'line-color':color('--primary'),opacity:.9} },
    { selector:'node.focused',css:{'border-color':color('--primary'),'border-width':7,'border-opacity':.8,'text-opacity':1,opacity:1} },
    { selector:'edge.focused',css:{'line-color':color('--primary'),opacity:1} },
    { selector:'node.ghost',css:{opacity:.26,'text-opacity':.65,'border-opacity':.08} },
    { selector:'edge.ghost',css:{opacity:.12} },
    { selector:'node.target',css:{opacity:1,'text-opacity':1} },
    { selector:'edge.ego-gateway.unverified',css:{width:.8,'line-style':'dotted',opacity:.4} },
    { selector:'edge.low-confidence',css:{width:1,'line-style':'dashed',opacity:.4} },
    { selector:'node.lineage-node',css:{width:13,height:13,'font-size':8,'font-weight':400,'text-max-width':'110px','text-margin-y':6,'border-width':2} },
    { selector:'node.lineage-node.direct-contact',css:{width:20,height:20,'font-size':8.5,'font-weight':500,'border-width':3} },
    { selector:'#augusto.lineage-node',css:{width:32,height:32,'font-size':9.5,'font-weight':600,'border-width':5} },
    { selector:'node.lineage-context',css:{width:9,height:9,opacity:.2,'text-opacity':.45,'border-width':0,'font-size':6.5} },
    { selector:'edge.lineage-context',css:{opacity:.09,label:'',width:.6} },
  ];
}

export function NetworkCanvas(props:Props) {
  const container = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core|null>(null);
  const current = useRef(props); current.current=props;
  const lastTrajectory = useRef('');
  const updatePathLabels = () => {
    const cy=cyRef.current;if(!cy||current.current.mode!=='path')return;
    const zoom=cy.zoom(),compact=cy.width()<640;
    cy.nodes().forEach(node=>{
      const ghost=node.hasClass('ghost');
      const landmark=node.data('target')||node.id()==='augusto'||node.id()===current.current.selected;
      const hide=(ghost&&zoom<.4)||(compact&&zoom<.3&&!landmark);
      node.style('label',hide?'\u00a0':'data(displayLabel)');
      node.style('font-size',`${(ghost?7:compact?8:node.data('target')?12:11)/zoom}px`);
      node.style('text-max-width',`${(ghost?70:compact?70:135)/zoom}px`);
      node.style('text-margin-y',`${5/zoom}px`);
    });
  };
  const fitView = () => {
    const cy=cyRef.current;if(!cy)return;
    if(current.current.mode==='lineage'){
      const layout=lineageLayout(current.current.root,current.current.coreOnly,current.current.collapsed);
      const points=[...layout.positions.values()];
      const x1=Math.min(...points.map(point=>point.x))-65,y1=Math.min(...points.map(point=>point.y))-30;
      const box={x1,y1,w:Math.max(...points.map(point=>point.x))+65-x1,h:Math.max(...points.map(point=>point.y))+50-y1};const width=cy.width(),height=cy.height();
      const right=current.current.selected&&width>640?390:35;
      const top=width<640?300:220;const bottom=width<640?165:115;
      const availableHeight=Math.max(150,height-top-bottom);
      const zoom=Math.max(.15,Math.min(1.15,(width-right-55)/Math.max(box.w+80,1),availableHeight/Math.max(box.h+160,1)));
      cy.zoom(zoom);cy.pan({x:30+(width-right-30)/2-(box.x1+box.w/2)*zoom,y:top+availableHeight*.35-(box.y1+box.h/2)*zoom});
      return;
    }
    const points=[...current.current.trajectory.positions].filter(([id])=>!current.current.trajectory.ghostNodes.has(id)).map(([,point])=>point);
    const x1=Math.min(...points.map(p=>p.x))-80,x2=Math.max(...points.map(p=>p.x))+80;
    const y1=Math.min(...points.map(p=>p.y))-65,y2=Math.max(...points.map(p=>p.y))+85;
    const box={x1,y1,w:x2-x1,h:y2-y1};
    const width=cy.width(),height=cy.height();
    const right=current.current.selected&&width>640?390:35;
    const top=width<640?310:280;
    const availableHeight=Math.max(130,height-top-(width<640?190:current.current.highlighted.length?290:135));
    const zoom=Math.max(.04,Math.min(1.1,(width-right-80)/Math.max(box.w,1),availableHeight/Math.max(box.h,1)));
    cy.zoom(zoom);cy.pan({x:50+(width-right-50)/2-(box.x1+box.w/2)*zoom,y:top+availableHeight/2-(box.y1+box.h/2)*zoom});
    updatePathLabels();
  };
  const viewports = useRef<Partial<Record<Mode,{zoom:number;pan:{x:number;y:number}}>>>({});
  const lastMode = useRef<Mode>(props.mode);
  const lastRoot = useRef(props.root);
  const renderGraph = useRef<()=>void>(()=>{});
  const updateHalo = () => {
    const element=halo.current;
    const cy=cyRef.current;
    if(!element||!cy)return;
    const selected=current.current.selected;
    const node=selected?cy.getElementById(selected):null;
    if(!node?.length||!node.isNode()){element.hidden=true;return;}
    const position=node.renderedPosition();
    const size=Math.max(30,node.renderedWidth()+20);
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
    const lineage=lineageLayout(root,coreOnly,collapsed);
    const positions=mode==='lineage'?new Map([...lineage.positions,...lineage.contextPositions]):current.current.trajectory.positions;
    const visibleNodes=graph.nodes.filter(n=>(!coreOnly||!n.candidate||n.id===root)&&positions.has(n.id));
    const ids=new Set(visibleNodes.map(n=>n.id));
    const visibleEdges=(mode==='lineage'?[...lineage.edges,...lineage.contextEdges]:current.current.trajectory.edges).filter(e=>ids.has(e.source)&&ids.has(e.target));
    const elements:ElementDefinition[]=[...visibleNodes.map(n=>({data:{...n,id:n.id,displayLabel:n.id==='augusto'?'Augusto':n.label},position:positions.get(n.id) ?? {x:0,y:0},classes:[mode==='lineage'?'lineage-node':'',mode==='lineage'&&lineage.hidden.has(n.id)?'lineage-context':'',mode==='path'&&current.current.trajectory.ghostNodes.has(n.id)?'ghost':'',n.candidate?'candidate':'',n.target?'target':'',n.id!=='augusto'&&(mode==='lineage'?lineage.depth.get(n.id)===1:current.current.trajectory.depths.get(n.id)===1)?'direct-contact':''].join(' ')})),...visibleEdges.map((e:NetworkEdge)=>({data:{...e,weight:weakBases.has(e.evidence.basis)?1:1.1+e.strength*.16},classes:[mode==='lineage'&&(lineage.hidden.has(e.source)||lineage.hidden.has(e.target))?'lineage-context':'',mode==='path'&&current.current.trajectory.ghostEdges.has(e.id)?'ghost':'',weakBases.has(e.evidence.basis)?'weak':'',!e.evidence.urls.length?'unverified':'',e.evidence.confidence==='low'?'low-confidence':'',e.evidence.ego_gateway?'ego-gateway':'',mode==='lineage'&&['phd_advisor','research_group'].includes(e.evidence.basis)?'tree':'',mode==='lineage'&&e.evidence.basis==='phd_advisor'&&!e.evidence.claim.toLowerCase().includes('not repec chair')&&!e.evidence.claim.toLowerCase().includes('committee (academia')?'advisor':'',(e.evidence.basis==='committee'||e.evidence.basis==='phd_advisor'&&e.evidence.claim.startsWith('Dissertation committee'))?'committee':'',mode==='lineage'&&lineage.depth.get(e.source)===lineage.depth.get(e.target)?'peer':''].join(' ')}))];
    const previous={zoom:cy.zoom(),pan:cy.pan()};
    const existing=new Map(cy.nodes().map(node=>[node.id(),node.position()] as const));
    const wanted=new Set(elements.map(element=>element.data.id));
    cy.batch(()=>{cy.elements().filter(element=>!wanted.has(element.id())).remove();for(const element of elements){const previousElement=cy.getElementById(element.data.id??'');if(previousElement.length)previousElement.data(element.data).classes(element.classes??'');else cy.add(element);}});
    if(mode==='lineage')cy.nodes().removeStyle();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cy.nodes().forEach(node=>{const position=positions.get(node.id());if(!position)return;node.stop();if(existing.has(node.id())&&!reduced)node.animate({position},{duration:420});else node.position(position);});
    if (changed) { const saved=viewports.current[mode]; if (saved) {cy.zoom(saved.zoom);cy.pan(saved.pan);} else if (mode==='lineage') { cy.zoom(.8); cy.pan({x:cy.width()*.53,y:cy.height()*.35}); } }
    else {cy.zoom(previous.zoom);cy.pan(previous.pan);}
    if(mode==='lineage'&&(changed||lastRoot.current!==root||lastTrajectory.current!==`lineage:${coreOnly}:${[...collapsed].join(',')}`)){lastTrajectory.current=`lineage:${coreOnly}:${[...collapsed].join(',')}`;fitView();}
    cy.nodes('.lineage-context').style('label',cy.zoom()<1.5?'':'data(displayLabel)');
    if(mode==='path'&&(changed||lastTrajectory.current!==current.current.trajectoryKey)){lastTrajectory.current=current.current.trajectoryKey;fitView();}
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
      if(current.current.mode==='path')fitView();else {cy.zoom(initialZoom());cy.pan({x:cy.width()*.54,y:cy.height()*.54});}
      current.current.onZoom(cy.zoom());
      cy.on('tap','node, edge',event=>{const id=event.target.id();if(current.current.mode==='path'&&event.target.isNode()&&!event.target.data('target'))current.current.onExpand(id);else current.current.onSelect(id);});
      cy.on('tap',event=>{if(event.target===cy)current.current.onSelect(null);});
      cy.on('zoom',()=>{current.current.onZoom(cy.zoom());if(current.current.mode==='lineage')cy.nodes('.lineage-context').style('label',cy.zoom()<1.5?'':'data(displayLabel)');else updatePathLabels();});
      const surface=container.current.parentElement;
      const horizontalWheel=(event:WheelEvent)=>{
        if(!(event.target instanceof Node)||!container.current?.contains(event.target))return;
        if(event.ctrlKey||Math.abs(event.deltaX)<=Math.abs(event.deltaY))return;
        event.preventDefault();event.stopImmediatePropagation();
        const unit=event.deltaMode===1?16:event.deltaMode===2?cy.width():1;
        cy.panBy({x:-event.deltaX*unit,y:-event.deltaY*unit});
      };
      surface?.addEventListener('wheel',horizontalWheel,{capture:true,passive:false});
      removeWheel=()=>surface?.removeEventListener('wheel',horizontalWheel,true);
      cy.on('pan zoom position resize',updateHalo);
      cy.on('dragfree','node',event=>{if(current.current.mode==='path')current.current.trajectory.positions.set(event.target.id(),event.target.position());});
      current.current.apiRef.current={fit:fitView,zoom:delta=>cy.zoom({level:Math.max(.15,Math.min(3,cy.zoom()+delta)),renderedPosition:{x:cy.width()/2,y:cy.height()/2}}),focus:id=>{if(current.current.mode==='path'){fitView();return;}const n=cy.getElementById(id);if(n.length)cy.pan({x:cy.width()*.53-n.position('x')*cy.zoom(),y:cy.height()*.52-n.position('y')*cy.zoom()});},home:()=>{if(current.current.mode==='path'){fitView();return;}cy.zoom(initialZoom());const n=cy.getElementById(current.current.mode==='lineage'?current.current.root:'augusto');if(n.length)cy.pan({x:cy.width()*.54-n.position('x')*cy.zoom(),y:cy.height()*(cy.width()<640?.59:.54)-n.position('y')*cy.zoom()});}};
      observer=new ResizeObserver(()=>{cy.resize();fitView();});observer.observe(container.current);
    });
    return()=>{cancelled=true;removeWheel?.();observer?.disconnect();cyRef.current?.destroy();cyRef.current=null;current.current.apiRef.current=null;};
  },[]);
  useEffect(()=>renderGraph.current(),[props.mode,props.coreOnly,props.root,props.collapsed,props.trajectory,props.trajectoryKey]);
  useEffect(()=>{
    const cy=cyRef.current;if(!cy)return;
    cy.elements().removeClass('dim highlight focused');
    if(props.highlighted.length){cy.elements().addClass('dim');for(const id of props.highlighted){const edge=cy.getElementById(id);edge.removeClass('dim').addClass('highlight');edge.connectedNodes().removeClass('dim').addClass('highlight');}}
    if(props.selected){const selected=cy.getElementById(props.selected);selected.removeClass('dim').addClass('focused');if(selected.isNode()){selected.connectedEdges().removeClass('dim');selected.neighborhood('node').removeClass('dim');}else cy.edges().filter(e=>e.id()===props.selected).connectedNodes().removeClass('dim').addClass('highlight');}
    cy.nodes('.target').removeClass('dim');
    updatePathLabels();
    updateHalo();
  },[props.highlighted,props.selected,props.mode,props.coreOnly,props.root,props.collapsed,props.trajectory]);
  return <><div ref={container} className="network-canvas" role="img" aria-label={`${props.mode === 'path' ? 'Horizontal Augusto-to-target trajectory' : 'Vertical lineage'} canvas. ${props.mode === 'path' ? props.trajectory.positions.size : lineageLayout(props.root,props.coreOnly,props.collapsed).positions.size} nodes.`}/><div ref={halo} className="selection-halo" aria-hidden="true" hidden/></>;
}