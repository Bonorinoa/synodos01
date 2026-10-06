import { useEffect, useRef } from 'react';
import type { Core, StylesheetCSS, ElementDefinition } from 'cytoscape';
import { graph, legalEdges, lineageLayout, trajectoryLayout, weakBases, type Mode, type NetworkEdge } from '@/lib/network';

export type CanvasAPI = { fit: () => void; zoom: (delta:number) => void; focus: (id:string) => void; home: () => void };
type Props = { trajectory:ReturnType<typeof trajectoryLayout>; trajectoryKey:string; mode:Mode; coreOnly:boolean; root:string; collapsed:Set<string>; highlighted:string[]; selected:string|null; onSelect:(id:string|null)=>void; onZoom:(zoom:number)=>void; apiRef:React.RefObject<CanvasAPI|null> };

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
    { selector:'node',css:{ 'background-color':color('--person'),'background-opacity':.9,width:22,height:22,label:'data(displayLabel)',color:color('--foreground'),'font-family':'DM Sans','font-size':11,'text-valign':'bottom','text-margin-y':10,'text-outline-color':color('--background'),'text-outline-width':3,'border-width':5,'border-color':color('--person'),'border-opacity':.12,'text-wrap':'wrap','text-max-width':'145px' } },
    { selector:'node[kind = "lab"]',css:{shape:'round-rectangle','background-color':color('--lab'),'border-color':color('--lab'),width:27,height:27} },
    { selector:'node[kind = "university"]',css:{shape:'diamond','background-color':color('--university'),'border-color':color('--university'),width:29,height:29} },
    { selector:'node[kind = "institution"]',css:{shape:'hexagon','background-color':color('--institution'),'border-color':color('--institution'),width:29,height:29} },
    { selector:'node.candidate',css:{'background-opacity':.48,'border-style':'dashed','border-width':1.5,'border-opacity':.55,'text-opacity':.55,width:18,height:18,'font-size':10} },
    { selector:'node.target',css:{'background-color':color('--target'),'border-color':color('--target'),color:color('--target'),'border-width':8,'border-opacity':.1,width:38,height:38,'font-size':12} },
    { selector:'#augusto',css:{width:64,height:64,'background-color':color('--primary'),'border-color':color('--primary'),'border-width':14,'border-opacity':.08,'font-size':14,'font-weight':600,'text-margin-y':17} },
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
    { selector:'node.focused',css:{'border-color':color('--primary'),'border-width':7,'border-opacity':.8,'text-opacity':1,opacity:1} },
    { selector:'edge.focused',css:{'line-color':color('--primary'),opacity:1} },
  ];
}

export function NetworkCanvas(props:Props) {
  const container = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core|null>(null);
  const current = useRef(props); current.current=props;
  const lastTrajectory = useRef('');
  const fitView = () => {
    const cy=cyRef.current;if(!cy)return;
    if(current.current.mode==='lineage'){cy.fit(cy.elements(),80);return;}
    const box=cy.elements().boundingBox();
    const width=cy.width(),height=cy.height();
    const right=current.current.selected&&width>640?390:65;
    const top=width<640?270:260;
    const availableHeight=Math.max(130,height-top-(width<640?300:280));
    const zoom=Math.max(.15,Math.min(1.1,(width-right-80)/Math.max(box.w,1),availableHeight/Math.max(box.h,1)));
    cy.zoom(zoom);cy.pan({x:50+(width-right-50)/2-(box.x1+box.w/2)*zoom,y:top+availableHeight/2-(box.y1+box.h/2)*zoom});
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
    const positions=mode==='lineage'?lineage.positions:current.current.trajectory.positions;
    const visibleNodes=graph.nodes.filter(n=>(!coreOnly||!n.candidate||n.id===root)&&positions.has(n.id));
    const ids=new Set(visibleNodes.map(n=>n.id));
    const visibleEdges=(mode==='lineage'?lineage.edges:current.current.trajectory.edges).filter(e=>ids.has(e.source)&&ids.has(e.target));
    const collapsedCount=(id:string)=>{let count=0;for(const descendant of lineage.depth.keys()){let ancestor=lineage.parent.get(descendant);while(ancestor){if(ancestor===id){count++;break;}ancestor=lineage.parent.get(ancestor);}}return count;};
    const elements:ElementDefinition[]=[...visibleNodes.map(n=>({data:{...n,id:n.id,displayLabel:(n.id==='augusto'?'Augusto':n.label)+(mode==='lineage'&&collapsed.has(n.id)?`\n+${collapsedCount(n.id)} collapsed`:'')},position:positions.get(n.id) ?? {x:0,y:0},classes:[n.candidate?'candidate':'',n.target?'target':''].join(' ')})),...visibleEdges.map((e:NetworkEdge)=>({data:{...e,weight:weakBases.has(e.evidence.basis)?1:1.1+e.strength*.16},classes:[weakBases.has(e.evidence.basis)?'weak':'',!e.evidence.urls.length?'unverified':'',mode==='lineage'&&['phd_advisor','research_group'].includes(e.evidence.basis)?'tree':'',mode==='lineage'&&e.evidence.basis==='phd_advisor'&&!e.evidence.claim.toLowerCase().includes('not repec chair')&&!e.evidence.claim.toLowerCase().includes('committee (academia')?'advisor':'',e.evidence.basis==='phd_advisor'&&e.evidence.claim.startsWith('Dissertation committee')?'committee':'',mode==='lineage'&&lineage.depth.get(e.source)===lineage.depth.get(e.target)?'peer':''].join(' ')}))];
    const previous={zoom:cy.zoom(),pan:cy.pan()};
    const existing=new Map(cy.nodes().map(node=>[node.id(),node.position()] as const));
    const wanted=new Set(elements.map(element=>element.data.id));
    cy.batch(()=>{cy.elements().filter(element=>!wanted.has(element.id())).remove();for(const element of elements){const previousElement=cy.getElementById(element.data.id??'');if(previousElement.length)previousElement.data(element.data).classes(element.classes??'');else cy.add(element);}});
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cy.nodes().forEach(node=>{const position=positions.get(node.id());if(!position)return;node.stop();if(existing.has(node.id())&&!reduced)node.animate({position},{duration:420});else node.position(position);});
    if (changed) { const saved=viewports.current[mode]; if (saved) {cy.zoom(saved.zoom);cy.pan(saved.pan);} else if (mode==='lineage') { cy.zoom(.8); cy.pan({x:cy.width()*.53,y:cy.height()*.35}); } }
    else {cy.zoom(previous.zoom);cy.pan(previous.pan);}
    if(mode==='lineage'&&lastRoot.current!==root)cy.pan({x:cy.width()*.53,y:Math.max(350,cy.height()*.35)});
    if(mode==='path'&&(changed||lastTrajectory.current!==current.current.trajectoryKey)){lastTrajectory.current=current.current.trajectoryKey;fitView();}
    updateHalo();
    lastRoot.current=root;
    lastMode.current=mode;
  };

  useEffect(()=>{
    let cancelled=false; let observer:ResizeObserver|undefined;
    import('cytoscape').then(({default:cytoscape})=>{
      if (cancelled||!container.current) return;
      const cy=cytoscape({container:container.current,elements:[],style:styles(),layout:{name:'preset'},minZoom:.15,maxZoom:3,wheelSensitivity:.18,boxSelectionEnabled:false,selectionType:'single'});
      cyRef.current=cy; renderGraph.current();
      const initialZoom=()=>cy.width()<640?.43:Math.min(.83,Math.max(.48,(cy.height()-200)/1100));
      if(current.current.mode==='path')fitView();else {cy.zoom(initialZoom());cy.pan({x:cy.width()*.54,y:cy.height()*.54});}
      current.current.onZoom(cy.zoom());
      cy.on('tap','node, edge',event=>current.current.onSelect(event.target.id()));
      cy.on('tap',event=>{if(event.target===cy)current.current.onSelect(null);});
      cy.on('zoom',()=>current.current.onZoom(cy.zoom()));
      cy.on('pan zoom position resize',updateHalo);
      cy.on('dragfree','node',event=>{if(current.current.mode==='path')current.current.trajectory.positions.set(event.target.id(),event.target.position());});
      current.current.apiRef.current={fit:fitView,zoom:delta=>cy.zoom({level:Math.max(.15,Math.min(3,cy.zoom()+delta)),renderedPosition:{x:cy.width()/2,y:cy.height()/2}}),focus:id=>{const n=cy.getElementById(id);if(n.length)cy.pan({x:cy.width()*.53-n.position('x')*cy.zoom(),y:cy.height()*.52-n.position('y')*cy.zoom()});},home:()=>{if(current.current.mode==='path'){fitView();return;}cy.zoom(initialZoom());const n=cy.getElementById(current.current.mode==='lineage'?current.current.root:'augusto');if(n.length)cy.pan({x:cy.width()*.54-n.position('x')*cy.zoom(),y:cy.height()*(cy.width()<640?.59:.54)-n.position('y')*cy.zoom()});}};
      observer=new ResizeObserver(()=>cy.resize());observer.observe(container.current);
    });
    return()=>{cancelled=true;observer?.disconnect();cyRef.current?.destroy();cyRef.current=null;current.current.apiRef.current=null;};
  },[]);
  useEffect(()=>renderGraph.current(),[props.mode,props.coreOnly,props.root,props.collapsed,props.trajectory,props.trajectoryKey]);
  useEffect(()=>{
    const cy=cyRef.current;if(!cy)return;
    cy.elements().removeClass('dim highlight focused');
    if(props.highlighted.length){cy.elements().addClass('dim');for(const id of props.highlighted){const edge=cy.getElementById(id);edge.removeClass('dim').addClass('highlight');edge.connectedNodes().removeClass('dim').addClass('highlight');}}
    if(props.selected){const selected=cy.getElementById(props.selected);selected.removeClass('dim').addClass('focused');if(selected.isNode()){selected.connectedEdges().removeClass('dim');selected.neighborhood('node').removeClass('dim');}else cy.edges().filter(e=>e.id()===props.selected).connectedNodes().removeClass('dim').addClass('highlight');}
    updateHalo();
  },[props.highlighted,props.selected,props.mode,props.coreOnly,props.root,props.collapsed,props.trajectory]);
  return <><div ref={container} className="network-canvas" role="img" aria-label={`${props.mode === 'path' ? 'Horizontal Augusto-to-target trajectory' : 'Vertical lineage'} canvas. ${props.mode === 'path' ? props.trajectory.positions.size : lineageLayout(props.root,props.coreOnly,props.collapsed).positions.size} nodes.`}/><div ref={halo} className="selection-halo" aria-hidden="true" hidden/></>;
}