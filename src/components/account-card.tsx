import { useEffect, useState } from 'react';
import { Cloud, LogOut, UserPlus, X } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { useCloudAccount } from '@/lib/cloud-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PrivacyChoices } from '@/components/privacy-choices';
import { usePrivacy } from '@/lib/privacy';

/** Sign-in and sync status; the owner also manages the tester invite list here. */
export function AccountCard() {
  const a = useCloudAccount();
  const { choices } = usePrivacy();
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const signIn = async () => { setBusy(true); setMsg(null); const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin }); if (r.error) setMsg(r.error.message ?? 'Sign-in failed.'); setBusy(false); };
  if (a.access === 'signed_out' || (a.access === 'checking' && !a.session)) return <div className="panel-group account-card">
    <span className="micro-label">Account</span>
    <p className="account-line">Sign in to keep your networks across browsers. Invited testers only.</p>
    <Button variant="outline" onClick={signIn} disabled={busy}><Cloud size={14} />Sign in with Google</Button>
    {msg && <small role="alert">{msg}</small>}
    <details><summary>Terms & privacy choices</summary><PrivacyChoices /></details>
  </div>;
  const email = a.session?.user.email ?? '';
  return <div className="panel-group account-card">
    <span className="micro-label">Account · {a.access === 'owner' ? 'Owner' : a.access === 'tester' ? 'Tester' : a.access === 'checking' ? 'Checking…' : 'Not invited'}</span>
    <p className="account-line">{email}</p>
    {a.access === 'none' && <small role="alert">This email isn't on the tester list yet. Your networks stay in this browser only.</small>}
    {(a.access === 'owner' || a.access === 'tester') && <small>{!choices.cloudSync ? 'Account saving is off · networks stay in this browser.' : a.error ? `Sync problem: ${a.error}` : a.syncedAt ? `Networks saved to your account · ${new Date(a.syncedAt).toLocaleTimeString()}` : 'Syncing…'}</small>}
    <details><summary>Terms & privacy choices</summary><PrivacyChoices /></details>
    {a.access === 'owner' && <Invites />}
    <Button variant="ghost" size="sm" onClick={() => void supabase.auth.signOut()}><LogOut size={14} />Sign out</Button>
  </div>;
}

function Invites() {
  const [list, setList] = useState<string[]>([]); const [email, setEmail] = useState(''); const [err, setErr] = useState<string | null>(null);
  const load = async () => { const { data } = await supabase.from('tester_invites').select('email').order('created_at'); setList((data ?? []).map(r => r.email)); };
  useEffect(() => { void load(); }, []);
  const add = async () => { const e = email.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr('Enter a valid email.'); return; }
    const { error } = await supabase.from('tester_invites').insert({ email: e }); if (error) setErr(error.message); else { setEmail(''); setErr(null); void load(); } };
  const remove = async (e: string) => { await supabase.from('tester_invites').delete().eq('email', e); void load(); };
  return <div className="invite-list">
    <span className="micro-label">Testers ({list.length})</span>
    <div className="invite-add"><Input value={email} placeholder="tester@email.com" onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} /><Button size="sm" variant="outline" onClick={add}><UserPlus size={14} />Invite</Button></div>
    {err && <small role="alert">{err}</small>}
    {list.map(e => <div key={e} className="invite-row"><span>{e}</span><Button variant="ghost" size="icon" aria-label={`Remove ${e}`} onClick={() => remove(e)}><X size={12} /></Button></div>)}
  </div>;
}
