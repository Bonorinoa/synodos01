import { useEffect, useState } from 'react';
import { Cloud } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { NetworkExplorer, type SharedInfo } from '@/components/network-explorer';
import { refreshActiveNetwork } from '@/lib/network';
import { catalogCoverage, findHandshakes, openSharedNetwork, setHandshakeIds } from '@/lib/sharing';
import { loadOwnActiveArtifact, setSharedView } from '@/lib/workspace';

type State = { kind: 'loading' } | { kind: 'signin' } | { kind: 'missing' } | { kind: 'error'; message: string } | { kind: 'ready'; info: SharedInfo };

/** Loads a friend's shared network into memory only; the viewer's own networks are never written. */
export function SharedNetwork({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { if (!cancelled) setState({ kind: 'signin' }); return; }
      try {
        const shared = await openSharedNetwork(token);
        if (cancelled) return;
        if (!shared) { setState({ kind: 'missing' }); return; }
        const own = loadOwnActiveArtifact();
        const hasOwnNetwork = own.meta.ego !== shared.meta.ego || own.meta.id !== shared.meta.id;
        const handshakes = hasOwnNetwork ? findHandshakes(shared, own) : [];
        setSharedView(shared); setHandshakeIds(handshakes.map(h => h.sharedId)); refreshActiveNetwork();
        setState({ kind: 'ready', info: { ownerName: shared.nodes.find(n => n.id === shared.meta.ego)?.label ?? 'A friend', handshakes, coverage: catalogCoverage(shared), hasOwnNetwork } });
      } catch (e) { if (!cancelled) setState({ kind: 'error', message: (e as Error).message }); }
    };
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_IN') void load(); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); setSharedView(null); setHandshakeIds([]); refreshActiveNetwork(); };
  }, [token]);

  if (state.kind === 'ready') return <NetworkExplorer shared={state.info} />;
  const signIn = () => void lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.href });
  return <main className="shared-gate"><div>
    <span className="micro-label">Synodos · shared network</span>
    {state.kind === 'loading' && <p>Opening the shared network…</p>}
    {state.kind === 'signin' && <><h1>A friend shared their network with you</h1><p>Sign in with Google to explore it read-only. Nothing you do here changes your own networks or theirs.</p><Button onClick={signIn}><Cloud size={14} />Sign in with Google</Button></>}
    {state.kind === 'missing' && <><h1>This link isn't available</h1><p>The owner may have turned it off, or the network hasn't been saved to their account.</p><a href="/">Go to your map</a></>}
    {state.kind === 'error' && <><h1>Couldn't open this network</h1><p role="alert">{state.message}</p><a href="/">Go to your map</a></>}
  </div></main>;
}
