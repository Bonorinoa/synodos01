import { describe, expect, it, beforeEach } from 'vitest';
import { findHandshakes } from '@/lib/sharing';
import { saveArtifact, seedArtifact, setSharedView, loadActiveArtifact, readIndex } from '@/lib/workspace';
import type { Artifact } from '@/lib/schema';

const person = (id: string, label: string, catalog_id?: string) => ({ id, label, kind: 'person' as const, blurb: '', tags: [], evidence_packet: { urls: [], notes: '' }, ...(catalog_id ? { catalog_id } : {}) });
const edge = (source: string, target: string, ego_gateway = false) => ({ source, target, strength: 5, evidence: { claim: 'x', basis: 'coauthorship' as const, urls: [], ...(ego_gateway ? { ego_gateway: true } : {}) } });
const net = (id: string, ego: string, nodes: ReturnType<typeof person>[], edges: ReturnType<typeof edge>[]): Artifact => ({ format: 'network-artifact', version: 1, meta: { id, title: id, ego, created_at: '2026-10-09', updated_at: '2026-10-09', origin: 'created' }, nodes, edges });

describe('sharing', () => {
  beforeEach(() => { localStorage.clear(); setSharedView(null); });
  it('matches handshakes only by identical catalog id, never by name', () => {
    const a = net('a', 'me', [person('me', 'Me'), person('x', 'Jane Doe', 'openalex:A1'), person('y', 'Same Name')], [edge('me', 'x', true), edge('x', 'y')]);
    const b = net('b', 'you', [person('you', 'You'), person('j', 'J. Doe', 'openalex:A1'), person('z', 'Same Name')], [edge('you', 'j', true)]);
    const hs = findHandshakes(a, b);
    expect(hs.map(h => h.sharedId)).toEqual(['x']);
    expect(hs[0]).toMatchObject({ sharedHops: 1, ownHops: 1 });
  });
  it('read-only view never writes to the viewer storage', () => {
    const before = JSON.stringify(readIndex());
    const shared = net('friend', 'f', [person('f', 'Friend')], []);
    setSharedView(shared);
    expect(loadActiveArtifact().meta.id).toBe('friend');
    saveArtifact({ ...seedArtifact(), meta: { ...seedArtifact().meta, id: 'hijack' } });
    expect(JSON.stringify(readIndex())).toBe(before);
    expect(localStorage.getItem('an:artifact:hijack')).toBeNull();
  });
});
