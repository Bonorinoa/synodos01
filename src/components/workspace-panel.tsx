import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Check, Copy, FileUp, Plus, ShieldQuestion, Sparkle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { activeArtifact } from '@/lib/network';
import { artifactFromUpload, collectGarbage, createArtifact, csvColumns, findingsTemplate, ingestFindings, parseFindings, reviewEdge, type IngestReport } from '@/lib/ingest';
import { collectTemporaryFiles, deleteArtifact, discardStaged, readIndex, saveArtifact, setActiveArtifact, stageUpload, type StagedUpload } from '@/lib/workspace';
import { buildResearchPrompt } from '@/lib/research-prompt';
import { runResearch } from '@/lib/research.functions';
import type { Artifact } from '@/lib/schema';

const reload = () => window.location.reload();
const nodeLabel = (id: string) => activeArtifact.nodes.find(n => n.id === id)?.label ?? '';
const download = (name: string, text: string, type = 'application/json') => { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); };
const readFile = (file: File) => file.text();
export const exportArtifact = (artifact: Artifact = activeArtifact) => download(`${artifact.meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.network.json`, JSON.stringify(artifact, null, 2));

export function WorkspacePanel({ onClose, onSelect }: { onClose: () => void; onSelect: (id: string) => void }) {
  const index = readIndex();
  const [error, setError] = useState<string | null>(null);
  const [staged, setStaged] = useState<{ upload: StagedUpload; preview: { artifact: Artifact; report: IngestReport } } | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(''); const [owner, setOwner] = useState('');
  const [cleanupDone, setCleanupDone] = useState<string | null>(null);
  // Stale temporary uploads (over a day old) are always cleared when the panel opens.
  useEffect(() => { collectTemporaryFiles({ olderThanMs: 86_400_000 }); }, []);
  const pending = useMemo(() => activeArtifact.edges.map((edge, i) => ({ edge, i })).filter(({ edge }) => edge.evidence.review_status === 'pending'), []);
  const label = (id: string) => activeArtifact.nodes.find(n => n.id === id)?.label ?? id;
  const cleanupPreview = useMemo(() => ({ ...collectGarbage(activeArtifact).report, temp: collectTemporaryFiles({ dryRun: true, keep: staged?.upload.id }) }), [staged]);
  const guard = (fn: () => void | Promise<void>) => async () => { try { setError(null); await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); } };

  const stageText = (name: string, text: string) => {
    const preview = ingestFindings(activeArtifact, parseFindings(text, name), name);
    if (staged) discardStaged(staged.upload.id);
    setStaged({ upload: stageUpload(name, text), preview });
  };
  const onFindings = (file: File) => guard(async () => stageText(file.name, await readFile(file)))();
  const [brief, setBrief] = useState({ owner: nodeLabel(activeArtifact.meta.ego), bio: '', people: activeArtifact.nodes.filter(n => activeArtifact.edges.some(e => e.evidence.ego_gateway && [e.source, e.target].includes(n.id) && n.id !== activeArtifact.meta.ego)).map(n => n.label).join(', '), destinations: activeArtifact.nodes.filter(n => n.target).map(n => n.label).join(', ') });
  const [researching, setResearching] = useState(false); const [copied, setCopied] = useState(false); const [pasted, setPasted] = useState('');
  const prompt = buildResearchPrompt(brief);
  const research = guard(async () => {
    setResearching(true);
    try { const result = await runResearch({ data: { prompt } }); if (!result.ok) throw new Error(result.error); stageText('research-assistant.json', result.text); }
    finally { setResearching(false); }
  });
  const onNetwork = (file: File) => guard(async () => { saveArtifact(artifactFromUpload(await readFile(file), file.name)); reload(); })();
  const commit = guard(() => { if (!staged) return; saveArtifact(staged.preview.artifact); discardStaged(staged.upload.id); reload(); });
  const review = (i: number, decision: 'reviewed' | 'rejected') => guard(() => { saveArtifact(reviewEdge(activeArtifact, i, decision)); reload(); })();
  const runCleanup = guard(() => {
    const { artifact, report } = collectGarbage(activeArtifact);
    const temp = collectTemporaryFiles({ keep: staged?.upload.id });
    const changed = report.orphanNodes.length + report.mergedEdges + report.duplicateSources;
    if (changed) saveArtifact(artifact);
    setCleanupDone(`Removed ${report.orphanNodes.length} unlinked records, merged ${report.mergedEdges} duplicate links, dropped ${report.duplicateSources} repeated sources and ${temp.staged + temp.detachedNetworks} temporary files.`);
    if (changed) setTimeout(reload, 1200);
  });

  return <aside className="workspace-panel glass" aria-label="Your data">
    <header><div><span className="micro-label">Your data</span><h2>{activeArtifact.meta.title}</h2><small>{activeArtifact.nodes.length} records · {activeArtifact.edges.length} links · saved in this browser only</small></div><Button variant="ghost" size="icon" aria-label="Close your data" onClick={onClose}><X /></Button></header>
    {error && <p className="workspace-error" role="alert">{error}</p>}

    <section><h3>Networks</h3>
      <ul className="workspace-list">{index.artifacts.map(meta => <li key={meta.id} data-active={meta.id === index.active}>
        <Button variant="ghost" disabled={meta.id === index.active} onClick={() => { setActiveArtifact(meta.id); reload(); }}><span>{meta.title}</span><small>{meta.origin} · updated {meta.updated_at}</small></Button>
        {meta.id !== index.active && <Button variant="ghost" size="icon" aria-label={`Delete ${meta.title}`} onClick={guard(() => { if (window.confirm(`Delete “${meta.title}” from this browser?`)) { deleteArtifact(meta.id); reload(); } })}><Trash2 /></Button>}
      </li>)}</ul>
      {creating ? <form className="workspace-form" onSubmit={event => { event.preventDefault(); if (!owner.trim()) return setError('Add your name to start a network.'); saveArtifact(createArtifact(title, owner)); reload(); }}>
        <input aria-label="Network name" placeholder="Network name" value={title} onChange={e => setTitle(e.target.value)} />
        <input aria-label="Your name" placeholder="Your name (the centre of the map)" value={owner} onChange={e => setOwner(e.target.value)} required />
        <div><Button type="submit" size="sm">Create</Button><Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button></div>
      </form> : <div className="workspace-actions">
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}><Plus size={13} />New network</Button>
        <label className="file-button"><FileUp size={13} />Upload network<input type="file" accept=".json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f) onNetwork(f); e.target.value = ''; }} /></label>
        <Button variant="ghost" size="sm" onClick={() => exportArtifact()}><ArrowDownToLine size={13} />Download this network</Button>
      </div>}
    </section>

    <section data-tour="bio"><h3>Start from a bio</h3>
      <p className="blurb">Describe yourself and name people you know. A research assistant looks for their coauthors and committees, with a source for every link. Everything arrives <strong>unreviewed</strong>.</p>
      <div className="workspace-form">
        <input aria-label="Your name" placeholder="Your name" value={brief.owner} onChange={e => setBrief({ ...brief, owner: e.target.value })} />
        <textarea aria-label="Short bio" rows={4} placeholder="A paragraph about your research, where you studied, what you work on…" value={brief.bio} onChange={e => setBrief({ ...brief, bio: e.target.value })} />
        <input aria-label="People you know" placeholder="People you know (advisor, coauthors…), comma-separated" value={brief.people} onChange={e => setBrief({ ...brief, people: e.target.value })} />
        <input aria-label="Dream destinations" placeholder="Dream destinations, comma-separated" value={brief.destinations} onChange={e => setBrief({ ...brief, destinations: e.target.value })} />
      </div>
      <div className="workspace-actions">
        <Button size="sm" onClick={research} disabled={researching || !brief.people.trim()}><Sparkle size={13} />{researching ? 'Researching… (about a minute)' : 'Research it for me'}</Button>
        <Button variant="ghost" size="sm" onClick={() => { void navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy prompt for your own agent'}</Button>
      </div>
      <p className="blurb">Uses Lovable AI credits. Links without a source are dropped. Using your own agent? Paste its reply here:</p>
      <div className="workspace-form"><textarea aria-label="Paste agent reply" rows={2} placeholder='Paste the JSON your agent returned…' value={pasted} onChange={e => setPasted(e.target.value)} /><div><Button size="sm" variant="outline" disabled={!pasted.trim()} onClick={guard(() => { stageText('pasted-agent-reply.json', pasted.slice(pasted.indexOf('{'), pasted.lastIndexOf('}') + 1)); setPasted(''); })}>Preview findings</Button></div></div>
    </section>

    <section><details><summary><h3>Advanced: upload a findings file</h3></summary>
      <p className="blurb">Upload coauthor or committee findings from a research tool. Every source keeps its address and retrieval date. New links stay <strong>unreviewed</strong> until you approve them.</p>
      <div className="workspace-actions">
        <label className="file-button"><FileUp size={13} />Upload findings (JSON or CSV)<input type="file" accept=".json,.csv,application/json,text/csv" onChange={e => { const f = e.target.files?.[0]; if (f) onFindings(f); e.target.value = ''; }} /></label>
        <Button variant="ghost" size="sm" onClick={() => download('findings-template.json', JSON.stringify(findingsTemplate, null, 2))}>JSON template</Button>
        <Button variant="ghost" size="sm" onClick={() => download('findings-template.csv', `${csvColumns.join(',')}\nDirect contact name,Coauthor name,person,coauthorship,"Coauthored “Paper title” (2024).",https://doi.org/10.0000/example,2026-10-08,grok,5\n`, 'text/csv')}>CSV template</Button>
      </div></details>
      {staged && <div className="import-preview">
        <strong>{staged.upload.name}</strong>
        <ul>
          <li>{staged.preview.report.added} new unreviewed links</li>
          <li>{staged.preview.report.newNodes.length} new provisional records</li>
          <li>{staged.preview.report.merged} existing findings gained sources</li>
          {staged.preview.report.duplicateInFile > 0 && <li>{staged.preview.report.duplicateInFile} repeated rows combined</li>}
          {staged.preview.report.alreadyRecorded > 0 && <li>{staged.preview.report.alreadyRecorded} already recorded by you — left unchanged</li>}
          {staged.preview.report.skippedRejected > 0 && <li>{staged.preview.report.skippedRejected} previously rejected — skipped</li>}
          {staged.preview.report.invalid.length > 0 && <li className="workspace-error">{staged.preview.report.invalid.length} rows skipped: {staged.preview.report.invalid.slice(0, 3).map(r => `row ${r.row} (${r.reason})`).join('; ')}</li>}
        </ul>
        <div><Button size="sm" onClick={commit} disabled={!staged.preview.report.added && !staged.preview.report.merged}>Add to network</Button><Button variant="ghost" size="sm" onClick={() => { discardStaged(staged.upload.id); setStaged(null); }}>Discard</Button></div>
      </div>}
    </section>

    <section><h3>Waiting for your review <small>{pending.length}</small></h3>
      {!pending.length ? <p className="blurb">Nothing to review.</p> : <ul className="review-list">{pending.slice(0, 40).map(({ edge, i }) => <li key={i}>
        <Button variant="ghost" className="review-title" onClick={() => onSelect(`edge-${i}`)}><ShieldQuestion size={13} /><span>{label(edge.source)} ↔ {label(edge.target)}</span><small>{edge.evidence.basis.replaceAll('_', ' ')} · {edge.evidence.provenance?.length ?? 0} sources · found by {edge.evidence.provenance?.[0]?.source_tool ?? 'import'}</small></Button>
        <div><Button size="sm" variant="secondary" onClick={() => review(i, 'reviewed')}><Check size={12} />Approve</Button><Button size="sm" variant="ghost" onClick={() => review(i, 'rejected')}><X size={12} />Reject</Button></div>
      </li>)}</ul>}
    </section>

    <section><h3>Clean up</h3>
      <p className="blurb">Ready to remove: {cleanupPreview.orphanNodes.length} unlinked records, {cleanupPreview.mergedEdges} duplicate links, {cleanupPreview.duplicateSources} repeated sources, {cleanupPreview.temp.staged + cleanupPreview.temp.detachedNetworks} temporary files. You, your destinations, and rejected-link memory are kept.</p>
      <Button variant="outline" size="sm" onClick={runCleanup}><Trash2 size={13} />Run cleanup</Button>
      {cleanupDone && <p className="blurb" role="status">{cleanupDone}</p>}
    </section>
  </aside>;
}
