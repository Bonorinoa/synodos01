import { test, expect } from 'vitest';
import { seedArtifact } from '@/lib/workspace';
import { applyCircleApproval, applyFernandoApproval } from '@/lib/approved-fernando';
test('circle', () => { const a = applyCircleApproval(applyFernandoApproval(seedArtifact())); const b = applyCircleApproval(a);
  console.log(a.nodes.length, a.edges.length, a.edges.filter((e:any)=>e.evidence.review_status==='reviewed').length, b.edges.length);
  expect(a.edges.some((e:any)=>e.source==='augusto'&&!['monica-capra','eitel-lauria','erik-johnston','raymond-duch'].includes(e.target))).toBe(false);
  expect(b.edges.length).toBe(a.edges.length); });
