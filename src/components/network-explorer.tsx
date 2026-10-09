import { useEffect, useMemo, useRef, useState } from 'react';
import brandMark from '@/assets/kindred-mark.png';
import { ArrowDownToLine, Check, Focus, LayoutGrid, Maximize, Minus, Plus, Search, X } from 'lucide-react';
import { SettingsPanel } from '@/components/settings-panel';
import { CommandPanel } from '@/components/command-panel';
import { applyDisplay, readDisplay } from '@/lib/display-settings';
import { GuidedTour, TOUR_KEY } from '@/components/guided-tour';
import { CreateNetworkWizard, OWN_KEY } from '@/components/create-network-wizard';
import { useCloudAccount } from '@/lib/cloud-sync';
import { MethodDocs } from '@/components/method-docs';
import { saveArtifact } from '@/lib/workspace';
import { normalizeLabel, slugify } from '@/lib/ingest';
import { startCloudSync } from '@/lib/cloud-sync';
import { applyCircleApproval, applyFernandoApproval } from '@/lib/approved-fernando';
import { Command } from 'cmdk';
import type { Handshake } from '@/lib/sharing';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { NetworkCanvas, type CanvasAPI } from '@/components/network-canvas';
import { LineageGuide } from '@/components/lineage-guide';
import { TrailGuide } from '@/components/trail-guide';
import { NetworkInspector } from '@/components/network-inspector';
import { WorkspacePanel, exportArtifact } from '@/components/workspace-panel';
import { activeArtifact, egoId, edges, egoGatewayEdges, egoGatewayIds, graph, legalEdges, lineageLayout, nodeById, rankedPaths, trajectoryLayout, weakBases, pathTargetIds, nobelIds, refreshActiveNetwork, type Mode, type RankedPath } from '@/lib/network';

export type SharedInfo = { ownerName: string; handshakes: Handshake[]; coverage: { withId: number; people: number }; hasOwnNetwork: boolean };
export function NetworkExplorer({ shared }: { shared?: SharedInfo } = {}) {
  const [meetOpen,setMeetOpen]=useState(true);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{const refresh=()=>{refreshActiveNetwork();setRevision(v=>v+1);};window.addEventListener('an:artifact-saved',refresh);return()=>window.removeEventListener('an:artifact-saved',refresh);},[]);
  useEffect(() => { startCloudSync(); }, []);
  useEffect(() => { const approved = applyCircleApproval(applyFernandoApproval(activeArtifact)); if (approved !== activeArtifact) saveArtifact(approved); }, []);
  const account=useCloudAccount();const [ownOpen,setOwnOpen]=useState<false|'welcome'|'build'>(false);
  useEffect(()=>{if(!shared&&account.access!=='checking'&&account.access!=='owner'&&activeArtifact.meta.origin==='seed'&&!localStorage.getItem(OWN_KEY))setOwnOpen('welcome');},[account.access]);
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
  const [panelOpen,setPanelOpen]=useState(false);
  const [tourOpen,setTourOpen]=useState(false);
  const [docsOpen,setDocsOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  useEffect(()=>{applyDisplay(readDisplay());},[]);
  const [destination,setDestination]=useState('');
  // The tour opens once ever: mark it seen as soon as it auto-opens so later saves never replay it.
  useEffect(()=>{if(!shared&&!localStorage.getItem(TOUR_KEY)){localStorage.setItem(TOUR_KEY,'1');setTourOpen(true);}},[]);
   const addDestination=(label:string)=>{const clean=label.trim();if(!clean)return;const match=activeArtifact.nodes.find(n=>normalizeLabel(n.label)===normalizeLabel(clean));let nodes=activeArtifact.nodes;let id=match?.id;if(match)nodes=nodes.map(n=>n.id===match.id?{...n,target:true}:n);else{id=slugify(clean);while(nodes.some(n=>n.id===id))id+='-d';nodes=[...nodes,{id,label:clean,kind:'institution',blurb:'Added by you as a destination. No recorded links yet.',tags:['destination'],target:true,evidence_packet:{urls:[],notes:''}}];}saveArtifact({...activeArtifact,nodes});setDestination('');if(id)pickTarget(id);};
   const removeDestination=(id:string)=>{const node=nodeById.get(id);const linked=edges.some(e=>[e.source,e.target].includes(id));saveArtifact({...activeArtifact,nodes:node?.tags.includes('destination')&&!linked?activeArtifact.nodes.filter(n=>n.id!==id):activeArtifact.nodes.map(n=>n.id===id?{...n,target:false}:n)});if(target===id){setTarget(null);setActivePath(null);setRoutesOpen(false);}if(selected===id)setSelected(null);};
   const pickTarget=(id:string)=>{setTarget(id);setRoutesOpen(!window.matchMedia('(max-width:640px)').matches);setActivePath(0);setSelected(null);};
  useEffect(()=>{const id=sessionStorage.getItem('an:pick');if(id&&pathTargetIds.includes(id)){sessionStorage.removeItem('an:pick');pickTarget(id);}},[]);

  const [legendOpen,setLegendOpen]=useState(false);
  const [dataOpen,setDataOpen]=useState(false);
  const pendingCount=edges.filter(e=>e.evidence.review_status==='pending').length;
  const [narrowViewport,setNarrowViewport]=useState(false);
  const guideOpen=routesOpen&&!selected;
  const apiRef=useRef<CanvasAPI|null>(null);

  const appRef=useRef<HTMLDivElement>(null);
  const inspectorRef=useRef<HTMLDivElement>(null);
  const paths=useMemo(()=>target&&mode==='path'?rankedPaths(target,coreOnly):[],[target,mode,coreOnly,revision]);
  const overviewPaths=useMemo<RankedPath[]>(()=>egoGatewayEdges().filter(edge=>!coreOnly||!nodeById.get(edge.source===egoId?edge.target:edge.source)?.candidate).map(edge=>({nodes:[egoId,edge.source===egoId?edge.target:edge.source],edges:[edge.id],cost:0})),[coreOnly,revision]);
  const visiblePaths=useMemo(()=>target?(activePath===null?paths:paths.slice(activePath,activePath+1)):overviewPaths,[target,activePath,paths,overviewPaths]);
  const trajectory=useMemo(()=>trajectoryLayout(visiblePaths,[...pathTargetIds],coreOnly,selected,expanded),[visiblePaths,coreOnly,selected,expanded,revision]);
  const expandNode=(id:string)=>{setExpanded(previous=>new Set([...previous,id]));setSelected(id);setTimeout(()=>apiRef.current?.reveal(id),120);};
  const collapseNode=(id:string)=>{setExpanded(previous=>{const next=new Set(previous);next.delete(id);return next;});setSelected(null);};
  const highlighted=useMemo(()=>paths[activePath??0]?.edges??[],[paths,activePath]);
  const routeNodes=paths[activePath??0]?.nodes??[];
  const lineage=useMemo(()=>lineageLayout(root,coreOnly,collapsed,lineageExpanded),[root,coreOnly,collapsed,lineageExpanded,revision]);
  const matches=useMemo(()=>{const q=normalizeLabel(query);return graph.nodes.filter(n=>normalizeLabel(`${n.label} ${n.tags.join(' ')}`).includes(q)).sort((a,b)=>Number(normalizeLabel(b.label).startsWith(q))-Number(normalizeLabel(a.label).startsWith(q))).slice(0,15);},[query,revision]);
  const changeMode=(next:Mode)=>{setMode(next);setExpanded(new Set());setRoutesOpen(false);setSelected(null);setTarget(null);setActivePath(null);setCommandOpen(false);setRoot(egoId);setBreadcrumbs([egoId]);setCollapsed(new Set());setLineageExpanded(new Set());};
  const focusRoot=(id:string)=>{setRoot(id);setCollapsed(new Set());setBreadcrumbs(previous=>previous.includes(id)?previous.slice(0,previous.indexOf(id)+1):[...previous,id]);setSelected(null);};
  const expandLineage=(id:string)=>{const chain=new Set([id]);let ancestor=lineage.parent.get(id);while(ancestor&&ancestor!==root){chain.add(ancestor);ancestor=lineage.parent.get(ancestor);}setLineageExpanded(previous=>new Set([...previous,...chain]));setCollapsed(previous=>new Set([...previous].filter(item=>!chain.has(item))));setSelected(id);setTimeout(()=>apiRef.current?.reveal(id),380);};
  const collapseLineage=(id:string)=>{const under=(node:string)=>{let a:string|undefined=node;while(a){if(a===id)return true;a=lineage.parent.get(a);}return false;};setLineageExpanded(previous=>new Set([...previous].filter(item=>!under(item))));setSelected(current=>current&&under(current)?null:current);};
  const selectNode=(id:string)=>{if(coreOnly&&nodeById.get(id)?.candidate)setCoreOnly(false);if(mode==='lineage'&&!lineage.positions.has(id)){const chain=new Set<string>();let ancestor=lineage.parent.get(id);while(ancestor&&ancestor!==root){chain.add(ancestor);ancestor=lineage.parent.get(ancestor);}if(chain.size||lineage.depth.has(id))setLineageExpanded(previous=>new Set([...previous,...chain]));else focusRoot(id);}setSelected(id);setCommandOpen(false);requestAnimationFrame(()=>apiRef.current?.focus(id));};
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
        <div className="wordmark"><img className="atlas-mark" src={brandMark} alt="" width={36} height={36}/><h1>Synodos</h1><span className="private-label">{shared?`Viewing ${shared.ownerName}’s network · read-only`:'Private research space'}</span></div>
      <div className="mode-pill" data-tour="modes" role="group" aria-label="Canvas mode">{(['path','lineage'] as const).map(value=><Button key={value} variant={mode===value?'secondary':'ghost'} aria-pressed={mode===value} onClick={()=>changeMode(value)}>{value==='path'?'Path':'Lineage'}</Button>)}</div>
       {shared?<div className="header-actions"><Button variant="outline" size="sm" onClick={()=>{window.location.href='/';}}>Back to my map</Button></div>:<div className="header-actions"><Button variant="ghost" size="icon" className="panel-trigger" data-tour="data" title="Command panel" aria-label="Open command panel" aria-expanded={panelOpen} onClick={()=>{setPanelOpen(true);setSelected(null);}}><LayoutGrid/>{pendingCount>0&&<span className="pending-count" aria-label={`${pendingCount} waiting for review`}>{pendingCount}</span>}</Button></div>}
    </header>
    {shared&&<section className="circles-meet glass" aria-label="Where our circles meet"><Button variant="ghost" className="circles-toggle" aria-expanded={meetOpen} onClick={()=>setMeetOpen(v=>!v)}>🤝 Where our circles meet · {shared.handshakes.length}</Button>{meetOpen&&<div className="circles-body">{!shared.hasOwnNetwork?<p>Sign in on your own map to compare circles.</p>:shared.handshakes.length?<ul>{shared.handshakes.map(h=><li key={h.catalogId}><Button variant="ghost" size="sm" onClick={()=>selectNode(h.sharedId)}>{h.label}</Button><small>{shared.ownerName}: {h.sharedHops??'—'} hops · you: {h.ownHops??'—'} hops</small></li>)}</ul>:<p>No shared people found yet.</p>}<small className="circles-note">Matched only by identical OpenAlex catalog records — {shared.coverage.withId} of {shared.coverage.people} people here have one. Names alone never count, and a handshake adds no links.</small></div>}</section>}
     <div className="atlas-summary"><Button variant="ghost" onClick={()=>setLegendOpen(v=>!v)} aria-expanded={legendOpen}>{visibleNodeCount} people & places · {visibleEdgeCount} recorded links</Button><label className="core-toggle" htmlFor="core-only">Hide provisional people<Switch id="core-only" checked={coreOnly} onCheckedChange={value=>{setCoreOnly(value);setSelected(null);setActivePath(null);}}/></label></div>
     {mode==='path'&&!target&&<section className="mission-prompt glass" data-tour="mission" aria-label="Choose a Path mission"><span className="mission-index">01 / PATH</span><h2>Where do you want to go?</h2><p>Name a place you’d love to work or collaborate with. We surface recorded ways in through people you know.</p>{!shared&&<form className="mission-form" onSubmit={event=>{event.preventDefault();addDestination(destination);}}><input aria-label="Add a destination" list="destination-options" placeholder="Type a place you’d love to reach…" value={destination} onChange={event=>setDestination(event.target.value)}/><datalist id="destination-options">{graph.nodes.filter(n=>n.kind!=='person'&&!n.target).map(n=><option key={n.id} value={n.label}/>)}</datalist><Button type="submit" size="sm" disabled={!destination.trim()}>Add</Button></form>}{pathTargetIds.length>0&&<div className="mission-chips">{pathTargetIds.map(id=>{const linked=edges.some(e=>[e.source,e.target].includes(id));return <span key={id}><Button variant="ghost" className="go" onClick={()=>pickTarget(id)}>{nodeById.get(id)?.label}{!linked&&<small>No recorded path yet</small>}</Button>{!shared&&<Button variant="ghost" className="rm" aria-label={`Remove ${nodeById.get(id)?.label}`} onClick={()=>removeDestination(id)}><X size={12}/></Button>}</span>;})}</div>}<small className="mission-note">Paths are research prompts, not confirmed introductions.</small></section>}
    {panelOpen&&<CommandPanel mode={mode} pending={pendingCount} options={mode==='path'?pathTargetIds.map(id=>({id,label:nodeById.get(id)?.label??id,active:target===id})):[...new Set([...breadcrumbs,...egoGatewayIds])].map(id=>({id,label:id===egoId?'All direct connections':nodeById.get(id)?.label??id,active:root===id}))} onClose={()=>setPanelOpen(false)} onPick={id=>{if(mode==='lineage'){if(id)focusRoot(id);return;}if(id)pickTarget(id);else{setTarget(null);setRoutesOpen(false);setActivePath(null);}}} onSearch={()=>setCommandOpen(true)} onData={()=>setDataOpen(true)} onSettings={()=>setSettingsOpen(true)} onTour={()=>setTourOpen(true)} onDocs={()=>setDocsOpen(true)} onCreate={()=>setOwnOpen('build')}/>}
    {ownOpen&&!tourOpen&&<CreateNetworkWizard skipWelcome={ownOpen==='build'} onClose={()=>setOwnOpen(false)}/>}
    {tourOpen&&<GuidedTour onDone={()=>setTourOpen(false)} onMode={next=>{if(next!==mode)changeMode(next);}}/>}
    {settingsOpen&&<SettingsPanel onClose={()=>setSettingsOpen(false)}/>}
    {docsOpen&&<MethodDocs onClose={()=>setDocsOpen(false)}/>}
    {nobelIds.length>0&&!selected&&!(mode==='path'&&!target)&&<Button variant="ghost" className="nobel-chip" onClick={()=>{const id=nobelIds[0];if(!id)return;if(mode==='lineage'&&!lineage.depth.has(id))setSelected(id);else selectNode(id);}}><b>★</b>{nobelIds.length} Nobel laureate{nobelIds.length>1?'s':''} in this network</Button>}
    {dataOpen&&<WorkspacePanel onClose={()=>setDataOpen(false)} onSelect={id=>{setDataOpen(false);selectNode(id);}}/>}
    {mode==='path'&&target&&<TrailGuide paths={paths} open={guideOpen} active={activePath??0} onToggle={()=>{if(narrowViewport&&selected){setSelected(null);setRoutesOpen(true);}else setRoutesOpen(v=>!v);}} onClear={()=>{setTarget(null);setActivePath(null);}} onActive={i=>setActivePath(activePath===i?null:i)} onSelect={selectNode}/>}
    {mode==='lineage'&&<LineageGuide expanded={lineageExpanded} onExpand={expandLineage} onCollapse={collapseLineage}/>}
     {legendOpen&&<section className="map-key glass" aria-label="About this view"><h2>About this view</h2><p className="view-explainer">{mode==='path'?'Routes connect recorded relationships. Faded context is nearby, not weaker evidence.':'Depth shows recorded relationship steps from the root—not generations or personal closeness.'}</p><div className="shape-key">{['Person','Lab','Institution','University','Destination','Root'].map((label,i)=><span key={label}><i className={`key-shape shape-${i}`}/>{label}</span>)}</div><div className="line-key"><span><i className="confirmed-line"/>Publicly sourced relationship</span><span><i className="weak-line"/>Weak or unverified link</span><span><i className="trail-line"/>Current route</span><span><span className="key-lock"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v7H4z"/></svg></span>Private first-party attestation</span><span><span className="key-star">★</span>Sourced Nobel distinction</span></div><Button variant="link" size="sm" onClick={()=>{setLegendOpen(false);setDocsOpen(true);}}>How it works →</Button></section>}
    <div className="canvas-tools glass" aria-label="Canvas tools"><Button variant="ghost" size="icon" title="Zoom in" aria-label="Zoom in" onClick={()=>apiRef.current?.zoom(.15)}><Plus/></Button><span className="zoom-value">{Math.round(zoom*100)}%</span><Button variant="ghost" size="icon" title="Zoom out" aria-label="Zoom out" onClick={()=>apiRef.current?.zoom(-.15)}><Minus/></Button><span className="divider"/><Button variant="ghost" size="icon" title="Fit network" aria-label="Fit network" onClick={()=>apiRef.current?.fit()}><Focus/></Button><Button variant="ghost" size="icon" title="Fullscreen" aria-label="Fullscreen" onClick={toggleFullscreen}><Maximize/></Button><Button variant="ghost" size="icon" title={exported?'Exported':'Export JSON'} aria-label="Export JSON" onClick={exportGraph}>{exported?<Check/>:<ArrowDownToLine/>}</Button></div>
    {selected&&<div ref={inspectorRef}><NetworkInspector canExpand={mode==='path'||lineageExpanded.has(selected)||((lineage.depth.get(selected)??99)<=3&&[...lineage.parent.values()].includes(selected))} selected={selected} mode={mode} expanded={mode==='lineage'?lineageExpanded:expanded} onExpand={mode==='lineage'?expandLineage:expandNode} onPathCollapse={collapseNode} collapsed={collapsed} onClose={()=>setSelected(null)} onSelect={selectNode} onRoot={focusRoot} onCollapse={collapseLineage} onZoomTo={id=>apiRef.current?.zoomTo(id)}/></div>}
    {commandOpen&&<div className="command-backdrop" onClick={()=>setCommandOpen(false)}><Command className="command-sheet glass" shouldFilter={false} role="dialog" aria-modal="true" aria-label="Search network" onClick={event=>event.stopPropagation()}><div className="command-input"><Search size={20}/><Command.Input autoFocus aria-label="Search nodes and commands" placeholder="Search people & places…" value={query} onValueChange={setQuery}/><Button variant="ghost" size="icon" onClick={()=>setCommandOpen(false)} aria-label="Close search"><X/></Button></div><Command.List className="command-results"><Command.Empty>No matching people or places.</Command.Empty>{!query&&<Command.Group heading="Commands"><Command.Item onSelect={()=>changeMode(mode==='path'?'lineage':'path')}>Switch to {mode==='path'?'Lineage':'Path'}</Command.Item><Command.Item onSelect={()=>{apiRef.current?.fit();setCommandOpen(false);}}>Fit network</Command.Item><Command.Item onSelect={()=>{exportGraph();setCommandOpen(false);}}>Export JSON</Command.Item></Command.Group>}<Command.Group heading="People & places">{matches.map(node=><Command.Item key={node.id} value={node.id} onSelect={()=>selectNode(node.id)}><span>{node.label}</span><small>{node.candidate?'Provisional':node.kind}</small></Command.Item>)}</Command.Group></Command.List></Command></div>}
  </div>;
}
