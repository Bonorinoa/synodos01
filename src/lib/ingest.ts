import { z } from 'zod';
import { artifactSchema, graphSchema, isoDate, nodeKinds, type Artifact, type EdgeRecord, type NodeRecord, type Provenance } from '@/lib/schema';

/**
 * Provenance-aware ingestion for discovered relationships.
 * Pure functions only: every function takes an artifact and returns a new one plus a report.
 */
export const discoveryBases = ['coauthorship', 'committee', 'phd_advisor', 'joint_project', 'research_group'] as const;
const nodeRef = z.object({ id: z.string().optional(), label: z.string().min(1), kind: z.enum(nodeKinds).optional() });
const sourceSchema = z.object({ url: z.string().url(), retrieved_at: isoDate.optional(), title: z.string().optional() });
export const findingSchema = z.object({ from: nodeRef, to: nodeRef, basis: z.enum(discoveryBases), claim: z.string().optional(), strength: z.number().int().min(1).max(10).optional(), sources: z.array(sourceSchema).min(1, 'Each finding needs at least one source') });
export const findingsFileSchema = z.object({ format: z.literal('network-findings'), version: z.literal(1), source_tool: z.string().min(1), retrieved_at: isoDate.optional(), findings: z.array(z.unknown()) });
export type Finding = z.infer<typeof findingSchema>;
export type ParsedFindings = { source_tool: string; findings: { row: number; finding?: Finding; error?: string }[] };

export const today = () => new Date().toISOString().slice(0, 10);
export const normalizeLabel = (label: string) => label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const slugify = (label: string) => normalizeLabel(label).replaceAll(' ', '-') || 'node';
export function normalizeUrl(url: string) {
  try { const u = new URL(url); u.hash = ''; u.hostname = u.hostname.toLowerCase().replace(/^www\./, ''); u.protocol = 'https:'; return u.toString().replace(/\/$/, ''); } catch { return url.trim(); }
}
const pairKey = (a: string, b: string, basis: string) => `${[a, b].sort().join('|')}|${basis}`;
const labelKey = (nodes: Map<string, NodeRecord>, e: { source: string; target: string; evidence: { basis: string } }) => pairKey(normalizeLabel(nodes.get(e.source)?.label ?? e.source), normalizeLabel(nodes.get(e.target)?.label ?? e.target), e.evidence.basis);
const provKey = (p: Provenance) => `${normalizeUrl(p.url)}@${p.retrieved_at.slice(0, 10)}`;
const defaultStrength: Record<string, number> = { coauthorship: 5, committee: 5, phd_advisor: 6, joint_project: 5, research_group: 4 };

// ---------- Parsing ----------
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch; continue; }
    if (ch === '"') quoted = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(c => c.trim())) rows.push(row); row = []; cell = ''; } else cell += ch;
  }
  row.push(cell); if (row.some(c => c.trim())) rows.push(row);
  return rows;
}
export const csvColumns = ['from', 'to', 'to_kind', 'basis', 'claim', 'source_url', 'retrieved_at', 'source_tool', 'strength'] as const;

/** Accepts the JSON findings format or a CSV with csvColumns. Rows without a source URL and retrieval date are rejected. */
export function parseFindings(text: string, fileName: string): ParsedFindings {
  if (fileName.toLowerCase().endsWith('.csv') || !text.trim().startsWith('{')) {
    const [header, ...body] = parseCsv(text);
    if (!header) throw new Error('The CSV file is empty.');
    const cols = header.map(h => h.trim().toLowerCase());
    for (const required of ['from', 'to', 'basis', 'source_url', 'retrieved_at']) if (!cols.includes(required)) throw new Error(`The CSV is missing the “${required}” column.`);
    const get = (r: string[], c: string) => (r[cols.indexOf(c)] ?? '').trim();
    let tool = '';
    const findings = body.map((r, i) => {
      tool ||= get(r, 'source_tool');
      const strength = Number(get(r, 'strength'));
      const raw = { from: { label: get(r, 'from') }, to: { label: get(r, 'to'), kind: get(r, 'to_kind') || undefined }, basis: get(r, 'basis'), claim: get(r, 'claim') || undefined, strength: strength || undefined, sources: [{ url: get(r, 'source_url'), retrieved_at: get(r, 'retrieved_at') }] };
      return validateFinding(raw, i + 2, undefined);
    });
    return { source_tool: tool || 'unspecified tool', findings };
  }
  const file = findingsFileSchema.safeParse(JSON.parse(text));
  if (!file.success) throw new Error(`This is not a findings file: ${file.error.issues[0]?.path.join('.')} ${file.error.issues[0]?.message}`);
  return { source_tool: file.data.source_tool, findings: file.data.findings.map((raw, i) => validateFinding(raw, i + 1, file.data.retrieved_at)) };
}
function validateFinding(raw: unknown, row: number, fileDate?: string) {
  const parsed = findingSchema.safeParse(raw);
  if (!parsed.success) { const issue = parsed.error.issues[0]; return { row, error: `${issue?.path.join('.') || 'row'}: ${issue?.message}` }; }
  const missingDate = parsed.data.sources.some(s => !s.retrieved_at && !fileDate);
  if (missingDate) return { row, error: 'Each source needs a retrieval date (retrieved_at).' };
  return { row, finding: { ...parsed.data, sources: parsed.data.sources.map(s => ({ ...s, retrieved_at: s.retrieved_at ?? fileDate! })) } };
}

// ---------- Ingestion ----------
export type IngestReport = { added: number; merged: number; alreadyRecorded: number; skippedRejected: number; duplicateInFile: number; newNodes: string[]; invalid: { row: number; reason: string }[] };
export function gatewayIds(artifact: Artifact) {
  return [...new Set(artifact.edges.filter(e => e.evidence.ego_gateway && [e.source, e.target].includes(artifact.meta.ego)).map(e => e.source === artifact.meta.ego ? e.target : e.source))];
}
export function ingestFindings(artifact: Artifact, parsed: ParsedFindings, fileName: string, date = today()): { artifact: Artifact; report: IngestReport } {
  const nodes = artifact.nodes.map(n => ({ ...n }));
  const edges: EdgeRecord[] = artifact.edges.map(e => ({ ...e, evidence: { ...e.evidence } }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const byLabel = new Map(nodes.map(n => [normalizeLabel(n.label), n]));
  const rejected = new Set((artifact.rejected ?? []).map(r => r.key));
  const gateways = new Set(gatewayIds(artifact));
  const report: IngestReport = { added: 0, merged: 0, alreadyRecorded: 0, skippedRejected: 0, duplicateInFile: 0, newNodes: [], invalid: [] };
  const resolve = (ref: Finding['from']) => {
    const found = (ref.id && byId.get(ref.id)) || byLabel.get(normalizeLabel(ref.label));
    if (found) return found;
    let id = ref.id && !byId.has(ref.id) ? ref.id : slugify(ref.label); let n = 2; while (byId.has(id)) id = `${slugify(ref.label)}-${n++}`;
    const node: NodeRecord = { id, label: ref.label.trim(), kind: ref.kind ?? 'person', blurb: `Added by a findings import (${fileName}). Not reviewed.`, tags: ['imported'], candidate: true, evidence_packet: { urls: [], notes: `Created on ${date} from ${parsed.source_tool} findings. Identity not reviewed.` } };
    nodes.push(node); byId.set(id, node); byLabel.set(normalizeLabel(node.label), node); report.newNodes.push(id);
    return node;
  };
  const seenInFile = new Set<string>();
  for (const { row, finding, error } of parsed.findings) {
    if (!finding) { report.invalid.push({ row, reason: error ?? 'Invalid row' }); continue; }
    const a = resolve(finding.from), b = resolve(finding.to);
    if (a.id === b.id) { report.invalid.push({ row, reason: 'A finding cannot link a record to itself.' }); continue; }
    const provenance: Provenance[] = finding.sources.map(s => ({ url: s.url, retrieved_at: s.retrieved_at!, source_tool: parsed.source_tool, title: s.title, artifact: fileName }));
    const key = pairKey(a.id, b.id, finding.basis);
    const tomb = pairKey(normalizeLabel(a.label), normalizeLabel(b.label), finding.basis);
    if (rejected.has(tomb)) { report.skippedRejected++; continue; }
    const existing = edges.find(e => pairKey(e.source, e.target, e.evidence.basis) === key);
    if (existing && existing.evidence.discovery !== 'algorithmic') { report.alreadyRecorded++; continue; }
    if (existing) {
      if (seenInFile.has(key)) report.duplicateInFile++; else report.merged++;
      existing.evidence.provenance = dedupeProvenance([...(existing.evidence.provenance ?? []), ...provenance]);
      existing.evidence.urls = dedupeUrls([...existing.evidence.urls, ...provenance.map(p => p.url)]);
      seenInFile.add(key); continue;
    }
    seenInFile.add(key);
    const root = gateways.has(a.id) ? a.id : gateways.has(b.id) ? b.id : undefined;
    edges.push({ source: a.id, target: b.id, strength: finding.strength ?? defaultStrength[finding.basis] ?? 4, evidence: { claim: finding.claim ?? `${finding.basis.replaceAll('_', ' ')} reported by ${parsed.source_tool}`, basis: finding.basis, urls: dedupeUrls(provenance.map(p => p.url)), confidence: 'low', discovery: 'algorithmic', review_status: 'pending', provenance: dedupeProvenance(provenance), ...(root ? { expansion_root: root } : {}) } });
    report.added++;
  }
  return { artifact: { ...artifact, meta: { ...artifact.meta, updated_at: date }, nodes, edges }, report };
}
export const dedupeUrls = (urls: string[]) => { const seen = new Set<string>(); return urls.filter(u => { const k = normalizeUrl(u); if (seen.has(k)) return false; seen.add(k); return true; }); };
export const dedupeProvenance = (list: Provenance[]) => { const seen = new Set<string>(); return list.filter(p => { const k = provKey(p); if (seen.has(k)) return false; seen.add(k); return true; }); };

// ---------- Review (network owner only) ----------
export function reviewEdge(artifact: Artifact, index: number, decision: 'reviewed' | 'rejected', date = today()): Artifact {
  const edge = artifact.edges[index];
  if (!edge || edge.evidence.review_status !== 'pending') throw new Error('Only unreviewed findings can be reviewed.');
  const nodes = new Map(artifact.nodes.map(n => [n.id, n]));
  if (decision === 'rejected') return { ...artifact, meta: { ...artifact.meta, updated_at: date }, edges: artifact.edges.filter((_, i) => i !== index), rejected: [...(artifact.rejected ?? []), { key: labelKey(nodes, edge), from_label: nodes.get(edge.source)?.label ?? edge.source, to_label: nodes.get(edge.target)?.label ?? edge.target, basis: edge.evidence.basis, rejected_at: date }] };
  const touchesEgo = [edge.source, edge.target].includes(artifact.meta.ego);
  const reviewed: EdgeRecord = { ...edge, evidence: { ...edge.evidence, review_status: 'reviewed', reviewed_at: date, confidence: edge.evidence.urls.length ? 'medium' : 'low', ...(touchesEgo ? { ego_gateway: true } : {}) } };
  return { ...artifact, meta: { ...artifact.meta, updated_at: date }, edges: artifact.edges.map((e, i) => i === index ? reviewed : e) };
}

// ---------- Garbage collection ----------
export type CleanupReport = { orphanNodes: string[]; mergedEdges: number; duplicateSources: number };
/** Removes unlinked records, merges exact duplicate relationships, and drops repeated source retrievals. Never touches the owner or destinations. */
export function collectGarbage(artifact: Artifact): { artifact: Artifact; report: CleanupReport } {
  const report: CleanupReport = { orphanNodes: [], mergedEdges: 0, duplicateSources: 0 };
  const merged: EdgeRecord[] = []; const index = new Map<string, EdgeRecord>();
  for (const edge of artifact.edges) {
    const key = `${pairKey(edge.source, edge.target, edge.evidence.basis)}|${normalizeLabel(edge.evidence.claim)}`;
    const copy: EdgeRecord = { ...edge, evidence: { ...edge.evidence } };
    const urls = dedupeUrls(copy.evidence.urls); const prov = copy.evidence.provenance ? dedupeProvenance(copy.evidence.provenance) : undefined;
    report.duplicateSources += copy.evidence.urls.length - urls.length + (copy.evidence.provenance?.length ?? 0) - (prov?.length ?? 0);
    if (urls.length !== copy.evidence.urls.length) { copy.evidence.urls = urls; if (copy.evidence.source_checks) copy.evidence.source_checks = copy.evidence.source_checks.filter(c => urls.includes(c.url)).filter((c, i, all) => all.findIndex(o => o.url === c.url) === i); }
    if (prov) copy.evidence.provenance = prov;
    const prior = index.get(key);
    if (!prior) { index.set(key, copy); merged.push(copy); continue; }
    report.mergedEdges++;
    prior.evidence.urls = dedupeUrls([...prior.evidence.urls, ...copy.evidence.urls]);
    if (prior.evidence.provenance || copy.evidence.provenance) prior.evidence.provenance = dedupeProvenance([...(prior.evidence.provenance ?? []), ...(copy.evidence.provenance ?? [])]);
    if (copy.evidence.review_status === 'reviewed' || copy.evidence.review_status === undefined) prior.evidence.review_status = prior.evidence.review_status === 'pending' ? copy.evidence.review_status : prior.evidence.review_status;
  }
  const linked = new Set(merged.flatMap(e => [e.source, e.target]));
  const nodes = artifact.nodes.filter(n => { const keep = linked.has(n.id) || n.id === artifact.meta.ego || n.target; if (!keep) report.orphanNodes.push(n.id); return keep; });
  return { artifact: { ...artifact, nodes, edges: merged }, report };
}

// ---------- Artifact files ----------
export function artifactFromUpload(text: string, fileName: string, date = today()): Artifact {
  const json: unknown = JSON.parse(text);
  const full = artifactSchema.safeParse(json);
  if (full.success) return { ...full.data, meta: { ...full.data.meta, id: `net-${Date.now().toString(36)}`, origin: 'uploaded', updated_at: date } };
  const plain = graphSchema.safeParse(json);
  if (!plain.success) throw new Error(`This file is not a network: ${plain.error.issues[0]?.path.join('.')} ${plain.error.issues[0]?.message}`);
  const counts = new Map<string, number>();
  for (const e of plain.data.edges) if (e.evidence.ego_gateway) for (const id of [e.source, e.target]) counts.set(id, (counts.get(id) ?? 0) + 1);
  const ego = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? plain.data.nodes.find(n => n.kind === 'person')?.id ?? plain.data.nodes[0]?.id;
  if (!ego) throw new Error('This network has no people or places.');
  return validateArtifact({ format: 'network-artifact', version: 1, meta: { id: `net-${Date.now().toString(36)}`, title: fileName.replace(/\.json$/i, ''), ego, created_at: date, updated_at: date, origin: 'uploaded' }, ...plain.data });
}
export function createArtifact(title: string, ownerName: string, date = today()): Artifact {
  const ego = slugify(ownerName);
  return { format: 'network-artifact', version: 1, meta: { id: `net-${Date.now().toString(36)}`, title: title.trim() || `${ownerName}’s network`, ego, created_at: date, updated_at: date, origin: 'created' }, nodes: [{ id: ego, label: ownerName.trim(), kind: 'person', blurb: 'Network owner.', tags: ['owner'], evidence_packet: { urls: [], notes: 'Owner record.' } }], edges: [] };
}
export function validateArtifact(value: unknown): Artifact {
  const a = artifactSchema.parse(value);
  const ids = new Set(a.nodes.map(n => n.id));
  if (ids.size !== a.nodes.length) throw new Error('Two records share the same id.');
  if (!ids.has(a.meta.ego)) throw new Error('The network owner is not in the network.');
  for (const e of a.edges) if (!ids.has(e.source) || !ids.has(e.target)) throw new Error(`A link points to a missing record (${e.source} ↔ ${e.target}).`);
  return a;
}
export const findingsTemplate = { format: 'network-findings', version: 1, source_tool: 'grok', retrieved_at: '2026-10-08', findings: [{ from: { label: 'Direct contact name' }, to: { label: 'Coauthor name', kind: 'person' }, basis: 'coauthorship', claim: 'Coauthored “Paper title” (2024).', sources: [{ url: 'https://doi.org/10.0000/example', retrieved_at: '2026-10-08', title: 'Paper title' }] }] };
