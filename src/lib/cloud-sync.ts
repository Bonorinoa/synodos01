import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { artifactSchema, type Artifact } from '@/lib/schema';
import { loadArtifact, readIndex, saveArtifact } from '@/lib/workspace';

export type Access = 'signed_out' | 'checking' | 'owner' | 'tester' | 'none';
type State = { session: Session | null; access: Access; syncedAt: string | null; error: string | null };
let state: State = { session: null, access: 'checking', syncedAt: null, error: null };
const listeners = new Set<(s: State) => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(l => l(state)); };
let pulling = false;

const stamp = (a: Artifact) => Date.parse(a.meta.updated_at) || 0;

/** Accounts mirror browser networks: newest copy wins on sign-in, every later save is pushed. */
async function pullAndMerge(userId: string) {
  pulling = true;
  try {
    const { data, error } = await supabase.from('networks').select('id,data,updated_at');
    if (error) throw error;
    const remote = new Map<string, Artifact>();
    for (const row of data ?? []) { const p = artifactSchema.safeParse(row.data); if (p.success) remote.set(row.id, p.data); }
    const active = readIndex().active;
    for (const [id, art] of remote) { const local = loadArtifact(id); if (!local || stamp(art) > stamp(local) || (id === 'seed' && local.meta.origin === 'seed' && art.edges.length > local.edges.length)) saveArtifact(art, id === active); }
    for (const meta of readIndex().artifacts) { const local = loadArtifact(meta.id); const r = remote.get(meta.id); if (local && (!r || stamp(local) > stamp(r))) await push(userId, local); }
    set({ syncedAt: new Date().toISOString(), error: null });
  } catch (e) { set({ error: e instanceof Error ? e.message : 'Could not sync your networks.' }); }
  finally { pulling = false; }
}
async function push(userId: string, artifact: Artifact) {
  const { error } = await supabase.from('networks').upsert({ user_id: userId, id: artifact.meta.id, data: artifact as never, updated_at: new Date().toISOString() });
  if (error) set({ error: error.message }); else set({ syncedAt: new Date().toISOString(), error: null });
}
export async function deleteRemoteNetwork(id: string) {
  const uid = state.session?.user.id; if (!uid || !['owner', 'tester'].includes(state.access)) return;
  await supabase.from('networks').delete().eq('user_id', uid).eq('id', id);
}

async function onSession(session: Session | null) {
  set({ session, access: session ? 'checking' : 'signed_out' });
  if (!session) return;
  const { data, error } = await supabase.rpc('claim_access');
  if (error) { set({ access: 'none', error: error.message }); return; }
  const access = (data as Access) ?? 'none';
  set({ access });
  if (access === 'owner' || access === 'tester') await pullAndMerge(session.user.id);
}

let started = false;
export function startCloudSync() {
  if (started || typeof window === 'undefined') return; started = true;
  supabase.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') setTimeout(() => void onSession(session), 0); });
  window.addEventListener('an:artifact-saved', e => {
    const id = (e as CustomEvent<string | undefined>).detail; const uid = state.session?.user.id;
    if (pulling || !id || !uid || !['owner', 'tester'].includes(state.access)) return;
    const art = loadArtifact(id); if (art) void push(uid, art);
  });
}
export function useCloudAccount() {
  const [s, setS] = useState(state);
  useEffect(() => { listeners.add(setS); setS(state); return () => { listeners.delete(setS); }; }, []);
  return s;
}
