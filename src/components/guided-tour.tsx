import { useEffect, useLayoutEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Mode } from '@/lib/network';
import mapArt from '@/assets/onboarding-map.jpg';
import { PrivacyChoices } from '@/components/privacy-choices';

export const TOUR_KEY = 'an:tour-done';
type Step = { target: string; title: string; body: string; mode?: Mode };
const steps: Step[] = [
  { target: '', title: 'Welcome to Synodos', body: 'A private map of the people and places around your work. Find hidden ways into the places you dream of reaching, and trace your academic family — every link with its source.', mode: 'path' },
  { target: '.wordmark', title: 'Why “Synodos”', body: 'Greek σύνοδος: syn (“with”) + hodos (“a way, a road”) — journeying together. The same word once meant a gathering or assembly. This map is both: a road travelled with others, and the company kept along it.', mode: 'path' },
  { target: '.network-canvas', title: 'This is your map', body: 'You sit at the centre. Each line is a recorded relationship. Solid teal lines have a public source; thin dashed ones are weak or still unverified.', mode: 'path' },
  { target: '[data-tour="modes"]', title: 'Two ways to explore', body: 'Path finds routes to places you want to reach. Lineage explores academic family: advisors, committees and frequent coauthors.' },
  { target: '[data-tour="mission"]', title: 'Pick a destination', body: 'Type a place you’d love to work or collaborate with. We rank up to three recorded routes through people you already know.', mode: 'path' },
  { target: '[data-tour="branches"]', title: 'Open an academic branch', body: 'Each branch is one of your direct contacts. Opening it reveals their recorded academic family, one hop at a time.', mode: 'lineage' },
  { target: '.network-canvas', title: 'Click anyone for evidence', body: 'Every record shows where each link came from and when it was found. Nothing is presented as confirmed without a source.', mode: 'lineage' },
  { target: '[data-tour="data"]', title: 'Grow your network', body: 'This button opens search, destinations, your data, settings and help. Research finds sourced links; conservative source checks accept explicit roles, while uncertain claims wait for your review.', mode: 'path' },
  { target: '', title: 'Your data, your choice', body: 'Read the terms and choose only the permissions you want. Leaving everything off keeps exploration local.', mode: 'path' },
];

export function GuidedTour({ onDone, onMode }: { onDone: () => void; onMode: (mode: Mode) => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index] ?? steps[0];
  const privacyStep = index === steps.length - 1;
  useEffect(() => { if (step.mode) onMode(step.mode); }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const measure = () => { const el = step.target ? document.querySelector(step.target) : null; setRect(el ? el.getBoundingClientRect() : null); };
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
  const dots = <div className="tour-dots" aria-hidden="true">{steps.map((_, i) => <span key={i} data-on={i <= index} />)}</div>;
  const nav = <footer><Button variant="ghost" size="sm" onClick={finish}>Skip</Button><div>{index > 0 && <Button variant="ghost" size="sm" onClick={() => setIndex(index - 1)}>Back</Button>}<Button size="sm" onClick={() => index === steps.length - 1 ? finish() : setIndex(index + 1)}>{index === 0 ? 'Begin the tour' : index === steps.length - 1 ? 'Start exploring' : 'Next'}</Button></div></footer>;
  if (index === 0) return <div className="tour-layer tour-welcome-layer" role="dialog" aria-modal="true" aria-label="Welcome">
    <section className="tour-welcome glass"><img src={mapArt} alt="" width={1088} height={608} /><div><span className="micro-label">Field guide · {steps.length - 1} quick stops</span><h2>{step.title}</h2><p>{step.body}</p>{dots}{nav}</div></section>
  </div>;
  return <div className={`tour-layer${privacyStep ? ' tour-privacy-layer' : ''}`} role="dialog" aria-modal="true" aria-label="Guided tour">
    {spot ? <div className="tour-spot" style={spot} /> : <div className="tour-spot" style={{ left: '50%', top: '50%', width: 0, height: 0, border: 0 }} />}
    <section className={`tour-card glass${privacyStep ? ' tour-privacy-card' : ''}`} style={privacyStep ? undefined : { top, left }}>
      <span className="micro-label">Stop {index} of {steps.length - 1}</span>
      <h3>{step.title}</h3><p>{step.body}</p>{dots}
      {privacyStep && <PrivacyChoices />}
      <footer><Button variant="ghost" size="sm" onClick={finish}>Skip</Button><div>{index > 0 && <Button variant="ghost" size="sm" onClick={() => setIndex(index - 1)}>Back</Button>}<Button size="sm" onClick={() => index === steps.length - 1 ? finish() : setIndex(index + 1)}>{index === steps.length - 1 ? 'Start exploring' : 'Next'}</Button></div></footer>
    </section>
  </div>;
}
