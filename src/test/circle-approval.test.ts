import { test, expect } from 'vitest';
import { seedArtifact } from '@/lib/workspace';
import { applyCircleApproval, applyFernandoApproval } from '@/lib/approved-fernando';
const egoEdges = (a: ReturnType<typeof seedArtifact>) => a.edges.filter(e => e.source === 'augusto' || e.target === 'augusto').length;
test('circle approval adds co-authors, no ego links, idempotent', () => {
  const seed = seedArtifact(); const a = applyCircleApproval(applyFernandoApproval(seed)); const b = applyCircleApproval(a);
  console.log(seed.edges.length, '→', a.edges.length, 'nodes', seed.nodes.length, '→', a.nodes.length, 'auto', a.edges.filter(e => e.evidence.review_method === 'source_checks').length);
  expect(egoEdges(a)).toBe(egoEdges(seed));
  expect(a.edges.length).toBeGreaterThan(seed.edges.length);
  expect(b.edges.length).toBe(a.edges.length);
});
