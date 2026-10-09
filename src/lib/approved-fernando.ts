import findings from '@/data/fernando-findings.json';
import { ingestFindings, normalizeLabel, parseFindings, reviewEdge } from '@/lib/ingest';
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