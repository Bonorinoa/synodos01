import { useEffect, useLayoutEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Mode } from '@/lib/network';

export const TOUR_KEY = 'an:tour-done';
type Step = { target: string; title: string; body: string; mode?: Mode };
const steps: Step[] = [
  { target: '.network-canvas', title: 'This is your map', body: 'You sit at the centre. Each line is a recorded relationship. Solid teal lines have a public source; thin dashed ones are weak or still unverified.', mode: 'path' },
  { target: '[data-tour="modes"]', title: 'Two ways to explore', body: 'Path finds routes to places you want to reach. Lineage explores academic family: advisors, committees and frequent coauthors.' },
  { target: '[data-tour="mission"]', title: 'Pick a destination', body: 'Type a place you’d love to work or collaborate with. We rank up to three recorded routes through people you already know.', mode: 'path' },
  { target: '[data-tour="branches"]', title: 'Open an academic branch', body: 'Each branch is one of your direct contacts. Opening it reveals their recorded academic family, one hop at a time.', mode: 'lineage' },
  { target: '.network-canvas', title: 'Click anyone for evidence', body: 'Every record shows where each link came from and when it was found. Nothing is presented as confirmed without a source.', mode: 'lineage' },
  { target: '[data-tour="data"]', title: 'Grow your network', body: 'Describe yourself and name people you know. A research assistant finds sourced links, and you approve each one.', mode: 'path' },
];

export function GuidedTour({ onDone, onMode }: { onDone: () => void; onMode: (mode: Mode) => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index]!;
  useEffect(() => { if (step.mode) onMode(step.mode); }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const measure = () => { const el = document.querySelector(step.target); setRect(el ? el.getBoundingClientRect() : null); };
    const t = setTimeout(measure, 80); window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [step.target, index]);
  const finish = () => { localStorage.setItem(TOUR_KEY, '1'); onMode('path'); onDone(); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); if (e.key === 'ArrowRight') setIndex(i => Math.min(steps.length - 1, i + 1)); if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1)); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  const big = rect && rect.width > window.innerWidth * .6;
  const spot = rect && !big ? { left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 } : null;
  const below = rect && !big ? rect.bottom + 16 : window.innerHeight / 2 - 90;
  const top = Math.min(below, window.innerHeight - 220);
  const left = rect && !big ? Math.min(Math.max(12, rect.left), window.innerWidth - 332) : window.innerWidth / 2 - 160;
  return <div className="tour-layer" role="dialog" aria-modal="true" aria-label="Guided tour">
    {spot ? <div className="tour-spot" style={spot} /> : <div className="tour-spot" style={{ left: '50%', top: '50%', width: 0, height: 0, border: 0 }} />}
    <section className="tour-card glass" style={{ top, left }}>
      <span className="micro-label">{index + 1} of {steps.length}</span>
      <h3>{step.title}</h3><p>{step.body}</p>
      <footer><Button variant="ghost" size="sm" onClick={finish}>Skip</Button><div>{index > 0 && <Button variant="ghost" size="sm" onClick={() => setIndex(index - 1)}>Back</Button>}<Button size="sm" onClick={() => index === steps.length - 1 ? finish() : setIndex(index + 1)}>{index === steps.length - 1 ? 'Start exploring' : 'Next'}</Button></div></footer>
    </section>
  </div>;
}
