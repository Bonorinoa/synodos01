import { describe, it, expect } from 'vitest';
import { acceptCheckedResearch, createArtifact, ingestFindings, parseFindings, type Finding } from '@/lib/ingest';
import { passesAutomaticChecks } from '@/lib/research';
import { applyFernandoApproval } from '@/lib/approved-fernando';
import { seedArtifact } from '@/lib/workspace';

const f: Finding = { from: { label: 'Jane Scholar' }, to: { label: 'John Mentor' }, basis: 'phd_advisor', claim: 'Doctoral advisor.', sources: [{ url: 'https://school.edu/cv', retrieved_at: '2026-10-09', checked_at: '2026-10-09', accessible: true, status: 200, excerpt: 'Jane Scholar earned a Ph.D. in economics. Dissertation advisor: John Mentor.' }] };
const ingest = (finding = f) => ingestFindings(createArtifact('Test', 'Owner'), parseFindings(JSON.stringify({ format: 'network-findings', version: 1, source_tool: 'research', findings: [finding] }), 'r.json'), 'r.json').artifact;
describe('Conservative source-check acceptance', () => {
  it('accepts explicit academic roles without promoting confidence or identity', () => {
    expect(passesAutomaticChecks(f)).toBe(true);
    const out = acceptCheckedResearch(ingest(), [f]);
    expect(out.accepted).toBe(1);
    expect(out.artifact.edges[0]?.evidence).toMatchObject({ review_status: 'reviewed', review_method: 'source_checks', confidence: 'low' });
    expect(out.artifact.nodes.find(n => n.label === 'John Mentor')?.candidate).toBe(true);
    expect(acceptCheckedResearch(out.artifact, [f]).accepted).toBe(0);
  });
  it('leaves namesakes, co-mentions, unreliable sources and publication lists for review', () => {
    for (const changed of [
      { ...f, basis: 'coauthorship' as const },
      { ...f, sources: [{ ...f.sources[0], url: 'https://random.example/cv' }] },
      { ...f, sources: [{ ...f.sources[0], status: null }] },
      { ...f, sources: [{ ...f.sources[0], excerpt: 'Jane Scholar earned a Ph.D. John Mentor is mentioned. Advisor: Different Person.' }] },
      { ...f, sources: [{ ...f.sources[0], excerpt: 'Jane Scholar possibly earned a Ph.D. Dissertation advisor: John Mentor.' }] },
    ]) expect(passesAutomaticChecks(changed as Finding)).toBe(false);
    expect(acceptCheckedResearch(ingest(), []).accepted).toBe(0);
  });
  it('never grants a personal gateway automatically', () => {
    const own = { ...f, from: { label: 'Owner' } };
    expect(acceptCheckedResearch(ingest(own), [own]).accepted).toBe(0);
  });
});
describe('Explicit Fernando owner approval', () => {
  it('is idempotent and adds no personal gateway or seed mutation', () => {
    const seed = seedArtifact(); const approved = applyFernandoApproval(seed);
    expect(seed.edges).toHaveLength(approved.edges.length - 1);
    expect(approved.edges.at(-1)?.evidence).toMatchObject({ review_status: 'reviewed', review_method: 'owner', basis: 'phd_advisor' });
    expect(approved.edges.at(-1)?.evidence.ego_gateway).toBeUndefined();
    expect(applyFernandoApproval(approved)).toBe(approved);
    const other = createArtifact('Other', 'Someone Else');
    expect(applyFernandoApproval(other)).toBe(other);
  });
});