import { describe, it, expect } from 'vitest';
import { collectGarbage, createArtifact, ingestFindings, parseFindings, reviewEdge, artifactFromUpload } from '@/lib/ingest';
import { seedArtifact } from '@/lib/workspace';

const base = () => { const a = createArtifact('Test', 'Ada Owner', '2026-10-01'); a.nodes.push({ id: 'bo', label: 'Bo Contact', kind: 'person', blurb: '', tags: [], evidence_packet: { urls: [], notes: '' } }); a.edges.push({ source: 'ada-owner', target: 'bo', strength: 8, evidence: { claim: 'Colleague', basis: 'joint_project', urls: [], ego_gateway: true, attestation: 'user' } }); return a; };
const json = (findings: unknown[]) => JSON.stringify({ format: 'network-findings', version: 1, source_tool: 'grok', findings });
const f = (to: string, url = 'https://doi.org/10.1/x', date = '2026-10-08') => ({ from: { label: 'Bo Contact' }, to: { label: to }, basis: 'coauthorship', sources: [{ url, retrieved_at: date }] });

describe('Findings ingestion', () => {
  it('records provenance and keeps discoveries unreviewed', () => {
    const { artifact, report } = ingestFindings(base(), parseFindings(json([f('Cy Coauthor')]), 'f.json'), 'f.json');
    expect(report.added).toBe(1); expect(report.newNodes).toEqual(['cy-coauthor']);
    const edge = artifact.edges.at(-1)!;
    expect(edge.evidence).toMatchObject({ review_status: 'pending', discovery: 'algorithmic', confidence: 'low', expansion_root: 'bo' });
    expect(edge.evidence.provenance).toEqual([{ url: 'https://doi.org/10.1/x', retrieved_at: '2026-10-08', source_tool: 'grok', artifact: 'f.json', title: undefined }]);
    expect(artifact.nodes.find(n => n.id === 'cy-coauthor')?.candidate).toBe(true);
  });
  it('deduplicates repeated findings and sources across files and spellings', () => {
    const once = ingestFindings(base(), parseFindings(json([f('Cy Coauthor'), f('cy  coauthor', 'https://www.doi.org/10.1/x/')]), 'a.json'), 'a.json');
    expect(once.report).toMatchObject({ added: 1, duplicateInFile: 1 });
    const twice = ingestFindings(once.artifact, parseFindings(json([f('Cy Coauthor', 'https://doi.org/10.1/x', '2026-10-09')]), 'b.json'), 'b.json');
    expect(twice.report.merged).toBe(1); const edge = twice.artifact.edges.at(-1)!;
    expect(edge.evidence.urls).toHaveLength(1); expect(edge.evidence.provenance).toHaveLength(2);
    expect(twice.artifact.edges.filter(e => e.evidence.basis === 'coauthorship')).toHaveLength(1);
  });
  it('rejects rows without a source or retrieval date and never alters owner-recorded links', () => {
    const parsed = parseFindings(json([{ ...f('X'), sources: [] }, { ...f('Y'), sources: [{ url: 'https://a.org' }] }, { from: { label: 'Ada Owner' }, to: { label: 'Bo Contact' }, basis: 'joint_project', sources: [{ url: 'https://a.org', retrieved_at: '2026-10-08' }] }]), 'f.json');
    const { artifact, report } = ingestFindings(base(), parsed, 'f.json');
    expect(report.invalid).toHaveLength(2); expect(report.alreadyRecorded).toBe(1); expect(artifact.edges[0]?.evidence.urls).toEqual([]);
  });
  it('parses CSV with quoted claims', () => {
    const parsed = parseFindings('from,to,basis,claim,source_url,retrieved_at,source_tool\nBo Contact,Di Committee,committee,"Served on committee, 2019",https://a.org/t,2026-10-08,grok\n', 'f.csv');
    expect(parsed.findings[0]?.finding?.claim).toBe('Served on committee, 2019'); expect(parsed.source_tool).toBe('grok');
  });
  it('lets the owner approve or reject, and remembers rejections', () => {
    const { artifact } = ingestFindings(base(), parseFindings(json([f('Cy Coauthor')]), 'f.json'), 'f.json');
    const i = artifact.edges.length - 1;
    expect(reviewEdge(artifact, i, 'reviewed', '2026-10-10').edges[i]?.evidence).toMatchObject({ review_status: 'reviewed', confidence: 'medium', reviewed_at: '2026-10-10' });
    const rejected = reviewEdge(artifact, i, 'rejected');
    const again = ingestFindings(rejected, parseFindings(json([f('Cy Coauthor')]), 'g.json'), 'g.json');
    expect(again.report.skippedRejected).toBe(1);
  });
  it('promotes an approved owner link to a direct connection', () => {
    const { artifact } = ingestFindings(base(), parseFindings(json([{ ...f('Ev New'), from: { label: 'Ada Owner' } }]), 'f.json'), 'f.json');
    const i = artifact.edges.length - 1; expect(artifact.edges[i]?.evidence.ego_gateway).toBeUndefined();
    expect(reviewEdge(artifact, i, 'reviewed').edges[i]?.evidence.ego_gateway).toBe(true);
  });
});

describe('Garbage collector', () => {
  it('removes orphans and duplicate sources but keeps owner, destinations and parallel claims', () => {
    const a = base(); a.nodes.push({ id: 'lonely', label: 'Lonely', kind: 'lab', blurb: '', tags: [], evidence_packet: { urls: [], notes: '' } }, { id: 'goal', label: 'Goal', kind: 'institution', blurb: '', tags: [], target: true, evidence_packet: { urls: [], notes: '' } });
    a.edges.push({ source: 'bo', target: 'ada-owner', strength: 8, evidence: { claim: 'colleague', basis: 'joint_project', urls: ['https://a.org/x', 'https://www.a.org/x/'], provenance: [{ url: 'https://a.org/x', retrieved_at: '2026-10-08' }, { url: 'https://a.org/x', retrieved_at: '2026-10-08' }] } });
    a.edges.push({ source: 'bo', target: 'ada-owner', strength: 6, evidence: { claim: 'A different recorded claim', basis: 'joint_project', urls: [] } });
    const { artifact, report } = collectGarbage(a);
    expect(report.orphanNodes).toEqual(['lonely']); expect(report.mergedEdges).toBe(1); expect(report.duplicateSources).toBe(2);
    expect(artifact.nodes.map(n => n.id)).toEqual(['ada-owner', 'bo', 'goal']); expect(artifact.edges).toHaveLength(2);
  });
  it('leaves the supplied seed network unchanged', () => {
    const seed = seedArtifact(); const { report } = collectGarbage(seed);
    expect(report).toEqual({ orphanNodes: [], mergedEdges: 0, duplicateSources: 0 });
  });
  it('accepts plain uploaded graphs and infers the owner from direct connections', () => {
    const a = artifactFromUpload(JSON.stringify({ nodes: seedArtifact().nodes, edges: seedArtifact().edges }), 'mine.json');
    expect(a.meta.ego).toBe('augusto'); expect(a.meta.origin).toBe('uploaded');
  });
});
