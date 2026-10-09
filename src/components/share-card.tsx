import { useEffect, useState } from 'react';
import { Copy, Link2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCloudAccount } from '@/lib/cloud-sync';
import { usePrivacy } from '@/lib/privacy';
import { readIndex } from '@/lib/workspace';
import { createShare, listShares, listViewers, setShareActive, shareUrl, type Share } from '@/lib/sharing';

/** Owner/tester controls for read-only share links. Sharing is off until a link is created. */
export function ShareCard() {
  const a = useCloudAccount(); const { choices } = usePrivacy();
  const [shares, setShares] = useState<Share[]>([]); const [err, setErr] = useState<string | null>(null);
  const [viewers, setViewers] = useState<Record<string, { email: string; viewed_at: string }[]>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const uid = a.session?.user.id; const allowed = a.access === 'owner' || a.access === 'tester';
  const networkId = readIndex().active;
  const load = async () => { try { setShares(await listShares()); } catch (e) { setErr((e as Error).message); } };
  useEffect(() => { if (uid && allowed) void load(); }, [uid, allowed]);
  if (!uid || !allowed) return null;
  const mine = shares.filter(s => s.network_id === networkId);
  const run = (fn: () => Promise<void>) => async () => { setErr(null); try { await fn(); await load(); } catch (e) { setErr((e as Error).message); } };
  return <div className="panel-group share-card">
    <span className="micro-label">Share this network · read-only</span>
    {!choices.cloudSync ? <small>Turn on “Allow account saving” first — friends open the copy saved to your account.</small> : <>
      <p className="account-line">Signed-in friends can explore it. Their own networks are never changed.</p>
      {!mine.some(s => s.active) && <Button variant="outline" size="sm" onClick={run(() => createShare(uid, networkId))}><Link2 size={14} />Create share link</Button>}
      {mine.map(s => <div key={s.id} className="share-row" data-active={s.active}>
        <code>{s.active ? shareUrl(s.token).replace(/^https?:\/\//, '') : 'Link turned off'}</code>
        <div className="share-actions">
          {s.active && <Button variant="ghost" size="sm" onClick={() => { void navigator.clipboard.writeText(shareUrl(s.token)); setCopied(s.id); setTimeout(() => setCopied(null), 1500); }}><Copy size={13} />{copied === s.id ? 'Copied' : 'Copy'}</Button>}
          <Button variant="ghost" size="sm" onClick={run(() => setShareActive(s.id, !s.active))}>{s.active ? 'Turn off' : 'Turn on'}</Button>
          <Button variant="ghost" size="sm" onClick={run(async () => { setViewers(v => ({ ...v, [s.id]: [] })); const list = await listViewers(s.id); setViewers(v => ({ ...v, [s.id]: list })); })}><Users size={13} />Who opened</Button>
        </div>
        {viewers[s.id] && <ul className="share-viewers">{viewers[s.id]!.length ? viewers[s.id]!.map(v => <li key={v.email}>{v.email} · {new Date(v.viewed_at).toLocaleDateString()}</li>) : <li>No one has opened it yet.</li>}</ul>}
      </div>)}
    </>}
    {err && <small role="alert">{err}</small>}
  </div>;
}
