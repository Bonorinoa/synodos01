import seed from '@/data/network.json';
import { artifactSchema, graphSchema, type Artifact, type ArtifactMeta } from '@/lib/schema';

/**
 * Browser-only workspace: every network the user uploaded or created lives in localStorage.
 * The bundled seed is a read-only starting artifact until it is first changed.
 */
const INDEX = 'an:workspace';
const ARTIFACT = 'an:artifact:';
export const STAGING = 'an:staging:';
const SEED_ID = 'seed';
type WorkspaceIndex = { active: string; artifacts: ArtifactMeta[] };
const storage = () => (typeof window === 'undefined' ? null : window.localStorage);

export function seedArtifact(): Artifact {
  const g = graphSchema.parse(seed);
  return { format: 'network-artifact', version: 1, meta: { id: SEED_ID, title: 'Augusto Network', ego: 'augusto', created_at: '2026-10-07', updated_at: '2026-10-07', origin: 'seed' }, ...g };
}
export function readIndex(): WorkspaceIndex {
  const s = storage(); const fallback = { active: SEED_ID, artifacts: [seedArtifact().meta] };
  if (!s) return fallback;
  try { const v = JSON.parse(s.getItem(INDEX) ?? 'null') as WorkspaceIndex | null; return v?.artifacts?.length ? v : fallback; } catch { return fallback; }
}
const writeIndex = (index: WorkspaceIndex) => storage()?.setItem(INDEX, JSON.stringify(index));
export function loadArtifact(id: string): Artifact | null {
  const raw = storage()?.getItem(ARTIFACT + id);
  if (raw) { const parsed = artifactSchema.safeParse(JSON.parse(raw)); if (parsed.success) return parsed.data; }
  return id === SEED_ID ? seedArtifact() : null;
}
export function loadActiveArtifact(): Artifact {
  const index = readIndex();
  return loadArtifact(index.active) ?? seedArtifact();
}
export function saveArtifact(artifact: Artifact, activate = true) {
  storage()?.setItem(ARTIFACT + artifact.meta.id, JSON.stringify(artifact));
  const index = readIndex();
  const artifacts = [...index.artifacts.filter(m => m.id !== artifact.meta.id), artifact.meta];
  writeIndex({ active: activate ? artifact.meta.id : index.active, artifacts });
}
export function setActiveArtifact(id: string) { writeIndex({ ...readIndex(), active: id }); }
export function deleteArtifact(id: string) {
  const index = readIndex(); if (index.active === id) throw new Error('Switch to another network before deleting this one.');
  storage()?.removeItem(ARTIFACT + id);
  writeIndex({ ...index, artifacts: index.artifacts.filter(m => m.id !== id) });
}

// ---------- Temporary files ----------
export type StagedUpload = { id: string; name: string; created_at: string; content: string };
export function stageUpload(name: string, content: string): StagedUpload {
  const staged = { id: `stage-${Date.now().toString(36)}`, name, created_at: new Date().toISOString(), content };
  storage()?.setItem(STAGING + staged.id, JSON.stringify(staged));
  return staged;
}
export function discardStaged(id: string) { storage()?.removeItem(STAGING + id); }
/** Removes staged uploads (except `keep`) and stored copies of networks no longer in the workspace. */
export function collectTemporaryFiles(options: { keep?: string; olderThanMs?: number; dryRun?: boolean } = {}) {
  const s = storage(); if (!s) return { staged: 0, detachedNetworks: 0 };
  const known = new Set(readIndex().artifacts.map(m => m.id)); const now = Date.now();
  const removable: string[] = []; let staged = 0, detachedNetworks = 0;
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i); if (!key) continue;
    if (key.startsWith(STAGING) && key !== STAGING + options.keep) {
      let created = 0; try { created = Date.parse((JSON.parse(s.getItem(key) ?? '{}') as StagedUpload).created_at) || 0; } catch { /* unreadable → removable */ }
      if (now - created >= (options.olderThanMs ?? 0)) { removable.push(key); staged++; }
    } else if (key.startsWith(ARTIFACT) && !known.has(key.slice(ARTIFACT.length))) { removable.push(key); detachedNetworks++; }
  }
  if (!options.dryRun) for (const key of removable) s.removeItem(key);
  return { staged, detachedNetworks };
}
