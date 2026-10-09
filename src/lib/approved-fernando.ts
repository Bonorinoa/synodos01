import findings from '@/data/fernando-findings.json';
import circle from '@/data/augusto-circle-findings.json';
import { passesAutomaticChecks } from '@/lib/research';
import { acceptCheckedResearch, ingestFindings, normalizeLabel, parseFindings, reviewEdge, type Finding } from '@/lib/ingest';
import type { Artifact } from '@/lib/schema';

/** Explicit approval given by Augusto in chat; no ego link is implied or created. */
export function applyFernandoApproval(artifact: Artifact): Artifact {
  if (artifact.meta.ego !== 'augusto' || artifact.meta.id !== 'seed') return artifact;
  const result = ingestFindings(artifact, parseFindings(JSON.stringify(findings), 'fernando-approved.json'), 'fernando-approved.json');
  const nodes = new Map(result.artifact.nodes.map(n => [n.id, normalizeLabel(n.label)]));
  const index = result.artifact.edges.findIndex(e => e.evidence.basis === 'phd_advisor' && nodes.get(e.source) === 'fernando lozano' && nodes.get(e.target) === 'peter j kuhn' && e.evidence.review_status === 'pending');
  if (index < 0) return artifact;
  return reviewEdge(result.artifact, index, 'reviewed');
}
/** Owner-requested 3-hop circle (OpenAlex co-authors via the four gateways); idempotent, never creates an ego link. */
export function applyCircleApproval(artifact: Artifact): Artifact {
  if (artifact.meta.ego !== 'augusto' || artifact.meta.id !== 'seed') return artifact;
  const file = parseFindings(JSON.stringify(circle), 'augusto-circle.json');
  const result = ingestFindings(artifact, file, 'augusto-circle.json');
  const { artifact: accepted, accepted: count } = acceptCheckedResearch(result.artifact, circle.findings.filter(f => passesAutomaticChecks(f as Finding)) as Finding[]);
  return count || result.artifact.edges.length !== artifact.edges.length ? accepted : artifact;
}
