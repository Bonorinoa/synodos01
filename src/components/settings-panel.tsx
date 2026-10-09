import { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DISPLAY_DEFAULTS, readDisplay, saveDisplay, type DisplaySettings } from '@/lib/display-settings';

type Choice<K extends keyof DisplaySettings> = { key: K; title: string; hint: string; options: { value: DisplaySettings[K]; label: string }[] };
const rows: Choice<'contours' | 'paper' | 'motion' | 'labels'>[] = [
  { key: 'contours', title: 'Hop contours', hint: 'Rings that mark how many hops away a record sits.', options: [{ value: 'full', label: 'Full' }, { value: 'faint', label: 'Faint' }, { value: 'off', label: 'Off' }] },
  { key: 'labels', title: 'Name size', hint: 'Size of names on the map.', options: [{ value: 'compact', label: 'S' }, { value: 'regular', label: 'M' }, { value: 'large', label: 'L' }] },
  { key: 'paper', title: 'Map paper', hint: 'Pixel grid or plain paper behind the map.', options: [{ value: 'grid', label: 'Grid' }, { value: 'plain', label: 'Plain' }] },
  { key: 'motion', title: 'Movement', hint: 'Glide between layouts, or jump instantly.', options: [{ value: 'smooth', label: 'Glide' }, { value: 'instant', label: 'Jump' }] },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<DisplaySettings>(readDisplay);
  const set = (next: DisplaySettings) => { setS(next); saveDisplay(next); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="command-backdrop" onClick={onClose}>
    <section className="settings-sheet glass" role="dialog" aria-label="Map settings" onClick={e => e.stopPropagation()}>
      <header><div><span className="micro-label">Control panel</span><h2>Map settings</h2></div><Button variant="ghost" size="icon" aria-label="Close settings" onClick={onClose}><X /></Button></header>
      <div className="setting-row">
        <div><strong>Background links</strong><small>How visible the links outside your current focus are.</small></div>
        <input type="range" min={0} max={2} step={.25} value={s.ghosts} aria-label="Background link visibility" onChange={e => set({ ...s, ghosts: Number(e.target.value) })} />
        <output>{Math.round(s.ghosts * 100)}%</output>
      </div>
      {rows.map(row => <div className="setting-row" key={row.key}>
        <div><strong>{row.title}</strong><small>{row.hint}</small></div>
        <div className="pixel-segment" role="radiogroup" aria-label={row.title}>{row.options.map(o => <button key={o.value} role="radio" aria-checked={s[row.key] === o.value} onClick={() => set({ ...s, [row.key]: o.value })}>{o.label}</button>)}</div>
      </div>)}
      <footer><small>Display only — your links and evidence never change.</small><Button variant="ghost" size="sm" onClick={() => set(DISPLAY_DEFAULTS)}><RotateCcw size={13} />Reset</Button></footer>
    </section>
  </div>;
}
