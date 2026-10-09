import { describe, expect, it } from 'vitest';
import { createOwnNetwork, validateArtifact } from '@/lib/ingest';
describe('createOwnNetwork', () => {
  it('builds gateways only from stated contacts', () => {
    const a = validateArtifact(createOwnNetwork('Ada Lovelace', { catalogId: 'https://openalex.org/A123', contacts: [{ name: 'Charles Babbage', relation: 'advisor' }, { name: 'Mary', relation: 'coauthor', url: 'https://x.edu/p' }, { name: ' ', relation: 'colleague' }], destinations: ['DeepMind', ''] }));
    expect(a.nodes[0]!.catalog_id).toBe('openalex:A123');
    expect(a.edges).toHaveLength(2);
    expect(a.edges.every(e => e.evidence.ego_gateway && e.evidence.attestation === 'user' && e.source === a.meta.ego)).toBe(true);
    expect(a.edges[0]!.evidence.urls).toEqual([]); expect(a.edges[0]!.evidence.confidence).toBe('low');
    expect(a.nodes.filter(n => n.target).map(n => n.label)).toEqual(['DeepMind']);
  });
});
