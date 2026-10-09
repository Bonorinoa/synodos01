import { useEffect } from 'react';
import { BookOpen, Compass, Database, ListTree, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountCard } from '@/components/account-card';
import { ShareCard } from '@/components/share-card';

type Option = { id: string; label: string; active: boolean };
type Props = {
  mode: 'path' | 'lineage';
  options: Option[];
  pending: number;
  onClose: () => void;
  onPick: (id: string | null) => void;
  onSearch: () => void;
  onData: () => void;
  onSettings: () => void;
  onTour: () => void;
  onDocs: () => void;
};

/** The one header entry point: every secondary feature lives in this pane so the top bar stays quiet. */
export function CommandPanel(p: Props) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') p.onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [p]);
  const go = (fn: () => void) => () => { p.onClose(); fn(); };
  return <div className="command-backdrop" onClick={p.onClose}>
    <section className="command-panel glass" role="dialog" aria-label="Command panel" onClick={e => e.stopPropagation()}>
      <header><div><span className="micro-label">Command panel</span><h2>What do you need?</h2></div><Button variant="ghost" size="icon" aria-label="Close command panel" onClick={p.onClose}><X /></Button></header>
      <Button variant="outline" className="panel-search" onClick={go(p.onSearch)}><Search size={14} />Search people & places<kbd>⌘K</kbd></Button>
      <div className="panel-group">
        <span className="micro-label">{p.mode === 'path' ? 'Destination' : 'Academic branch'}</span>
        <div className="panel-chips">
          {p.mode === 'path' && <button aria-pressed={!p.options.some(o => o.active)} onClick={go(() => p.onPick(null))}>Overview</button>}
          {p.options.map(o => <button key={o.id} aria-pressed={o.active} onClick={go(() => p.onPick(o.id))}>{o.label}</button>)}
          {!p.options.length && <small>No destinations yet — add one on the map.</small>}
        </div>
      </div>
      <div className="panel-grid">
        <button onClick={go(p.onData)}><Database size={16} /><strong>Your data</strong><small>Research, uploads, review{p.pending > 0 ? ` · ${p.pending} waiting` : ''}</small></button>
        <button onClick={go(p.onSettings)}><SlidersHorizontal size={16} /><strong>Map settings</strong><small>Links, rings, names, motion</small></button>
        <button onClick={go(p.onTour)}><Compass size={16} /><strong>Take the tour</strong><small>A two-minute walkthrough</small></button>
        <button onClick={go(p.onDocs)}><BookOpen size={16} /><strong>How it works</strong><small>Methods, sources, hop rules</small></button>
        <a href="/people"><ListTree size={16} /><strong>People summary</strong><small>Everyone, their hop and co-authors</small></a>
      </div>
      <AccountCard />
      <ShareCard />
      <footer><Sparkles size={12} />Press ⌘K anywhere to search.</footer>
    </section>
  </div>;
}
