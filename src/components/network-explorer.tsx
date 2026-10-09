import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, Check, ChevronRight, Focus, Maximize, Minus, Plus, Search, X } from 'lucide-react';
import { Command } from 'cmdk';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { NetworkCanvas, type CanvasAPI } from '@/components/network-canvas';
import { LineageGuide } from '@/components/lineage-guide';
import { TrailGuide } from '@/components/trail-guide';
import { NetworkInspector } from '@/components/network-inspector';
import { WorkspacePanel, exportArtifact } from '@/components/workspace-panel';
import { activeArtifact, egoId, edges, egoGatewayEdges, egoGatewayIds, graph, legalEdges, lineageLayout, nodeById, rankedPaths, trajectoryLayout, weakBases, pathTargetIds, type Mode, type RankedPath } from '@/lib/network';

export function NetworkExplorer() {
  const [mode,setMode]=useState<Mode>('path');
  const [coreOnly,setCoreOnly]=useState(false);
  const [selected,setSelected]=useState<string|null>(null);
  const [target,setTarget]=useState<string|null>(null);
  const [activePath,setActivePath]=useState<number|null>(null);
  const [expanded,setExpanded]=useState<Set<string>>(new Set());
  const [commandOpen,setCommandOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [root,setRoot]=useState(egoId);
  const [breadcrumbs,setBreadcrumbs]=useState([egoId]);
  const [lineageExpanded,setLineageExpanded]=useState<Set<string>>(new Set());
  const [collapsed,setCollapsed]=useState<Set<string>>(new Set());
  const [zoom,setZoom]=useState(.83);
  const [exported,setExported]=useState(false);
  const [routesOpen,setRoutesOpen]=useState(false);

  const [legendOpen,setLegendOpen]=useState(false);
  const [dataOpen,setDataOpen]=useState(false);
  const pendingCount=edges.filter(e=>e.evidence.review_status==='pending').length;
  const [narrowViewport,setNarrowViewport]=useState(false);
  const guideOpen=routesOpen&&!selected;
  const apiRef=useRef<CanvasAPI|null>(null);

  const appRef=useRef<HTMLDivElement>(null);
  const inspectorRef=useRef<HTMLDivElement>(null);
  const paths=useMemo(()=>target&&mode==='path'?rankedPaths(target,coreOnly):[],[target,mode,coreOnly]);
  const overviewPaths=useMemo<RankedPath[]>(()=>egoGatewayEdges().filter(edge=>!coreOnly||!nodeById.get(edge.source===egoId?edge.target:edge.source)?.candidate).map(edge=>({nodes:[egoId,edge.source===egoId?edge.target:edge.source],edges:[edge.id],cost:0})),[coreOnly]);
  const visiblePaths=useMemo(()=>target?(activePath===null?paths:paths.slice(activePath,activePath+1)):overviewPaths,[target,activePath,paths,overviewPaths]);
  const trajectory=useMemo(()=>trajectoryLayout(visiblePaths,[...pathTargetIds],coreOnly,selected,expanded),[visiblePaths,coreOnly,selected,expanded]);
  const expandNode=(id:string)=>{setExpanded(previous=>new Set([...previous,id]));setSelected(id);setTimeout(()=>apiRef.current?.reveal(id),120);};
  const collapseNode=(id:string)=>{setExpanded(previous=>{const next=new Set(previous);next.delete(id);return next;});setSelected(null);};
  const highlighted=useMemo(()=>paths[activePath??0]?.edges??[],[paths,activePath]);
  const routeNodes=paths[activePath??0]?.nodes??[];
  const lineage=useMemo(()=>lineageLayout(root,coreOnly,collapsed,lineageExpanded),[root,coreOnly,collapsed,lineageExpanded]);
  const matches=useMemo(()=>graph.nodes.filter(n=>`${n.label} ${n.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0,15),[query]);
  const changeMode=(next:Mode)=>{setMode(next);setExpanded(new Set());setRoutesOpen(false);setSelected(null);setTarget(null);setActivePath(null);setCommandOpen(false);setRoot(egoId);setBreadcrumbs([egoId]);setCollapsed(new Set());setLineageExpanded(new Set());};
  const focusRoot=(id:string)=>{setRoot(id);setCollapsed(new Set());setBreadcrumbs(previous=>previous.includes(id)?previous.slice(0,previous.indexOf(id)+1):[...previous,id]);setSelected(null);};
  const expandLineage=(id:string)=>{const chain=new Set([id]);let ancestor=lineage.parent.get(id);while(ancestor){chain.add(ancestor);ancestor=lineage.parent.get(ancestor);}setLineageExpanded(previous=>new Set([...previous,...chain]));setCollapsed(previous=>new Set([...previous].filter(item=>!chain.has(item))));setSelected(id);setTimeout(()=>apiRef.current?.reveal(id),380);};
  const collapseLineage=(id:string)=>{setLineageExpanded(previous=>{const next=new Set(previous);next.delete(id);return next;});};
  const selectNode=(id:string)=>{if(coreOnly&&nodeById.get(id)?.candidate)setCoreOnly(false);if(mode==='lineage'&&!lineage.positions.has(id)){const chain=new Set<string>();let ancestor=lineage.parent.get(id);while(ancestor){chain.add(ancestor);ancestor=lineage.parent.get(ancestor);}if(chain.size)setLineageExpanded(previous=>new Set([...previous,...chain]));else focusRoot(id);}setSelected(id);setCommandOpen(false);requestAnimationFrame(()=>apiRef.current?.focus(id));};
  const exportGraph=()=>{exportArtifact();setExported(true);setTimeout(()=>setExported(false),2000);};
  const toggleFullscreen=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void appRef.current?.requestFullscreen().catch(()=>{});};
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setCommandOpen(o=>!o);}if(event.key==='Escape'){setCommandOpen(false);setSelected(null);}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[]);
  useEffect(()=>{if(commandOpen)setQuery('');},[commandOpen]);
  useEffect(()=>{const media=window.matchMedia('(max-width:640px)');const update=()=>setNarrowViewport(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  useEffect(()=>{inspectorRef.current?.querySelector('.inspector')?.scrollTo({top:0});if(selected){const timer=setTimeout(()=>apiRef.current?.focus(selected),100);return ()=>clearTimeout(timer);}return undefined;},[selected]);
  const visibleNodeCount=mode==='path'?trajectory.positions.size-trajectory.ghostNodes.size:lineage.positions.size;
  const visibleEdgeCount=mode==='path'?trajectory.edges.filter(e=>!trajectory.ghostEdges.has(e.id)).length:lineage.edges.length;
  return <div className="network-app" data-mode={mode} data-legend={legendOpen} data-inspector={!!selected} data-guide={mode==='path'&&guideOpen} ref={appRef}>
    <NetworkCanvas routeNodes={routeNodes} viewportKey="stable" lineageExpanded={lineageExpanded} trajectory={trajectory} trajectoryKey={`${target??"overview"}:${activePath??"all"}:${coreOnly}:${[...expanded].join(",")}:${selected??""}`} mode={mode} coreOnly={coreOnly} root={root} collapsed={collapsed} highlighted={highlighted} selected={selected} onSelect={setSelected} onExpand={mode==='lineage'?expandLineage:expandNode} onZoom={setZoom} apiRef={apiRef}/>
     <header className="hud-header glass">
       <div className="wordmark"><svg className="atlas-mark" viewBox="0 0 36 36" aria-hidden="true"><rect x="5" y="5" width="26" height="26" rx="2"/><path d="M10 18h16M18 10v16"/><circle cx="27" cy="9" r="2"/></svg><h1>{activeArtifact.meta.title}</h1><span className="private-label">Private research space</span></div>
      <div className="mode-pill" role="group" aria-label="Canvas mode">{(['path','lineage'] as const).map(value=><Button key={value} variant={mode===value?'secondary':'ghost'} aria-pressed={mode===value} onClick={()=>changeMode(value)}>{value==='path'?'Path':'Lineage'}</Button>)}</div>
       <div className="header-actions">{mode==='path'?<select className="destination-picker" aria-label="Dream destination" value={target??''} onChange={event=>{const next=event.target.value||null;setTarget(next);setRoutesOpen(!!next);setActivePath(next?0:null);setSelected(null);}}><option value="">Choose a destination</option>{pathTargetIds.map(id=><option key={id} value={id}>{nodeById.get(id)?.label}</option>)}</select>:<select className="root-picker" aria-label="Academic branch root" value={root} onChange={event=>focusRoot(event.target.value)}>{[...new Set([...breadcrumbs,...egoGatewayIds])].map(id=><option key={id} value={id}>{id===egoId?'All direct connections':nodeById.get(id)?.label}</option>)}</select>}<Button variant="ghost" size="sm" className="data-trigger" aria-expanded={dataOpen} onClick={()=>{setDataOpen(v=>!v);setSelected(null);}}>Your data{pendingCount>0&&<span className="pending-count" aria-label={`${pendingCount} waiting for review`}>{pendingCount}</span>}</Button><Button variant="ghost" size="icon" title="Search · ⌘K" aria-label="Search network" onClick={()=>setCommandOpen(true)}><Search/></Button></div>
    </header>
     <div className="atlas-summary"><Button variant="ghost" onClick={()=>setLegendOpen(v=>!v)} aria-expanded={legendOpen}>{visibleNodeCount} people & places · {visibleEdgeCount} recorded links</Button><label className="core-toggle" htmlFor="core-only">Hide provisional people<Switch id="core-only" checked={coreOnly} onCheckedChange={value=>{setCoreOnly(value);setSelected(null);setActivePath(null);}}/></label></div>
     {mode==='path'&&!target&&<section className="mission-prompt" aria-label="Choose a Path mission"><span className="mission-index">01 / PATH</span><h2>Where do you want to go?</h2><p>Start with a dream institution. We’ll surface recorded ways in through people you already know.</p><div className="mission-destinations">{pathTargetIds.map(id=><Button key={id} variant="outline" onClick={()=>{setTarget(id);setRoutesOpen(true);setActivePath(0);}}><span>{nodeById.get(id)?.label}</span><small>Find recorded paths</small><ChevronRight/></Button>)}</div>{!pathTargetIds.length&&<p className="guide-honesty">No destinations yet. Open a record and choose “Set as destination”.</p>}<small className="mission-note">Paths are research prompts, not confirmed introductions.</small></section>}
    {dataOpen&&<WorkspacePanel onClose={()=>setDataOpen(false)} onSelect={id=>{setDataOpen(false);selectNode(id);}}/>}
    {mode==='path'&&target&&<TrailGuide paths={paths} open={guideOpen} active={activePath??0} onToggle={()=>{if(narrowViewport&&selected){setSelected(null);setRoutesOpen(true);}else setRoutesOpen(v=>!v);}} onClear={()=>{setTarget(null);setActivePath(null);}} onActive={i=>setActivePath(activePath===i?null:i)} onSelect={selectNode}/>}
    {mode==='lineage'&&<LineageGuide expanded={lineageExpanded} onExpand={expandLineage} onCollapse={collapseLineage}/>}
     {legendOpen&&<section className="map-key glass" aria-label="About this view"><h2>About this view</h2><p className="view-explainer">{mode==='path'?'Routes connect recorded relationships. Faded context is nearby, not weaker evidence.':'Depth shows recorded relationship steps from the root—not generations or personal closeness.'}</p><div className="shape-key">{['Person','Lab','Institution','University','Destination','Root'].map((label,i)=><span key={label}><i className={`key-shape shape-${i}`}/>{label}</span>)}</div><div className="line-key"><span><i className="confirmed-line"/>Publicly sourced relationship</span><span><i className="weak-line"/>Weak or unverified link</span><span><i className="trail-line"/>Current route</span><span><span className="key-lock"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v7H4z"/></svg></span>Private first-party attestation</span><span><span className="key-star">★</span>Sourced Nobel distinction</span></div></section>}
    <div className="canvas-tools glass" aria-label="Canvas tools"><Button variant="ghost" size="icon" title="Zoom in" aria-label="Zoom in" onClick={()=>apiRef.current?.zoom(.15)}><Plus/></Button><span className="zoom-value">{Math.round(zoom*100)}%</span><Button variant="ghost" size="icon" title="Zoom out" aria-label="Zoom out" onClick={()=>apiRef.current?.zoom(-.15)}><Minus/></Button><span className="divider"/><Button variant="ghost" size="icon" title="Fit network" aria-label="Fit network" onClick={()=>apiRef.current?.fit()}><Focus/></Button><Button variant="ghost" size="icon" title="Fullscreen" aria-label="Fullscreen" onClick={toggleFullscreen}><Maximize/></Button><Button variant="ghost" size="icon" title={exported?'Exported':'Export JSON'} aria-label="Export JSON" onClick={exportGraph}>{exported?<Check/>:<ArrowDownToLine/>}</Button></div>
    {selected&&<div ref={inspectorRef}><NetworkInspector selected={selected} mode={mode} expanded={mode==='lineage'?lineageExpanded:expanded} onExpand={mode==='lineage'?expandLineage:expandNode} onPathCollapse={collapseNode} collapsed={collapsed} onClose={()=>setSelected(null)} onSelect={selectNode} onRoot={focusRoot} onCollapse={collapseLineage}/></div>}
    {commandOpen&&<div className="command-backdrop" onClick={()=>setCommandOpen(false)}><Command className="command-sheet glass" shouldFilter={false} role="dialog" aria-modal="true" aria-label="Search network" onClick={event=>event.stopPropagation()}><div className="command-input"><Search size={20}/><Command.Input autoFocus aria-label="Search nodes and commands" placeholder="Search people & places…" value={query} onValueChange={setQuery}/><Button variant="ghost" size="icon" onClick={()=>setCommandOpen(false)} aria-label="Close search"><X/></Button></div><Command.List className="command-results"><Command.Empty>No matching people or places.</Command.Empty>{!query&&<Command.Group heading="Commands"><Command.Item onSelect={()=>changeMode(mode==='path'?'lineage':'path')}>Switch to {mode==='path'?'Lineage':'Path'}</Command.Item><Command.Item onSelect={()=>{apiRef.current?.fit();setCommandOpen(false);}}>Fit network</Command.Item><Command.Item onSelect={()=>{exportGraph();setCommandOpen(false);}}>Export JSON</Command.Item></Command.Group>}<Command.Group heading="People & places">{matches.map(node=><Command.Item key={node.id} value={node.id} onSelect={()=>selectNode(node.id)}><span>{node.label}</span><small>{node.candidate?'Provisional':node.kind}</small></Command.Item>)}</Command.Group></Command.List></Command></div>}
  </div>;
}
