import { supabase } from '@/integrations/supabase/client';
import { artifactSchema, type Artifact } from '@/lib/schema';

export type Share = { id: string; network_id: string; token: string; active: boolean; created_at: string };
export type Handshake = { catalogId: string; sharedId: string; ownId: string; label: string; sharedHops: number | null; ownHops: number | null };

/** Recorded-link hops from the owner; the owner's own links count only through ego-gateway edges. */
export function recordedHops(artifact: Artifact) {
  const ego = artifact.meta.ego; const depth = new Map([[ego, 0]]); const queue = [ego];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]!;
    for (const e of artifact.edges) {
      if (e.evidence.review_status === 'rejected') continue;
      if ((e.source === ego || e.target === ego) && e.evidence.ego_gateway !== true) continue;
      const next = e.source === cur ? e.target : e.target === cur ? e.source : null;
      if (next && !depth.has(next)) { depth.set(next, depth.get(cur)! + 1); queue.push(next); }
    }
  }
  return depth;
}

/** Same person in both networks only when both records carry the identical catalog ID. Names never match. */
export function findHandshakes(shared: Artifact, own: Artifact): Handshake[] {
  const ownByCatalog = new Map(own.nodes.filter(n => n.catalog_id).map(n => [n.catalog_id!, n]));
  const sh = recordedHops(shared), oh = recordedHops(own);
  return shared.nodes.flatMap(n => {
    const mine = n.catalog_id ? ownByCatalog.get(n.catalog_id) : undefined;
    return mine ? [{ catalogId: n.catalog_id!, sharedId: n.id, ownId: mine.id, label: n.label, sharedHops: sh.get(n.id) ?? null, ownHops: oh.get(mine.id) ?? null }] : [];
  }).sort((a, b) => ((a.sharedHops ?? 99) + (a.ownHops ?? 99)) - ((b.sharedHops ?? 99) + (b.ownHops ?? 99)));
}
export const catalogCoverage = (a: Artifact) => ({ withId: a.nodes.filter(n => n.kind === 'person' && n.catalog_id).length, people: a.nodes.filter(n => n.kind === 'person').length });

/** Ids of shared-network nodes that are handshakes; the canvas reads this to draw the badge. */
export let handshakeIds = new Set<string>();
export function setHandshakeIds(ids: string[]) { handshakeIds = new Set(ids); }

export async function openSharedNetwork(token: string): Promise<Artifact | null> {
  const { data, error } = await supabase.rpc('get_shared_network', { _token: token });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const parsed = artifactSchema.safeParse(data);
  if (!parsed.success) throw new Error('This shared network could not be read.');
  return parsed.data;
}
export async function listShares(): Promise<Share[]> {
  const { data, error } = await supabase.from('network_shares').select('id,network_id,token,active,created_at').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function createShare(userId: string, networkId: string) {
  const { error } = await supabase.from('network_shares').insert({ owner_id: userId, network_id: networkId });
  if (error) throw new Error(error.message);
}
export async function setShareActive(id: string, active: boolean) {
  const { error } = await supabase.from('network_shares').update({ active }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function listViewers(shareId: string): Promise<{ email: string; viewed_at: string }[]> {
  const { data, error } = await supabase.rpc('list_share_viewers', { _share_id: shareId });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export const shareUrl = (token: string) => `${window.location.origin}/shared/${token}`;
