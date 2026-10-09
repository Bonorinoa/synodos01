import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createOwnNetwork, type StartContact } from '@/lib/ingest';
import { saveArtifact } from '@/lib/workspace';

export const OWN_KEY = 'an:own-network';
const relations: StartContact['relation'][] = ['advisor', 'committee', 'coauthor', 'colleague'];
const blank = (): StartContact => ({ name: '', relation: 'coauthor', url: '' });

/** Welcome choice + three-step builder for a network centred on the visitor. */
export function CreateNetworkWizard({ onClose, skipWelcome }: { onClose: () => void; skipWelcome?: boolean }) {
  const [step, setStep] = useState(skipWelcome ? 1 : 0);
  const [name, setName] = useState(''); const [catalog, setCatalog] = useState('');
  const [contacts, setContacts] = useState<StartContact[]>([blank()]);
  const [dest, setDest] = useState('');
  const done = () => { localStorage.setItem(OWN_KEY, '1'); onClose(); };
  const finish = () => {
    saveArtifact(createOwnNetwork(name, { catalogId: catalog, contacts, destinations: dest.split(',') }));
    localStorage.setItem(OWN_KEY, '1'); window.location.reload();
  };
  const edit = (i: number, patch: Partial<StartContact>) => setContacts(cs => cs.map((c, j) => j === i ? { ...c, ...patch } : c));
  return <div className="command-backdrop">
    <section className="command-panel glass own-wizard" role="dialog" aria-label="Start your own network">
      <header><div><span className="micro-label">{step ? `Step ${step} of 3` : 'Welcome'}</span><h2>{['Whose map is this?', 'You', 'First contacts', 'Where to? (optional)'][step]}</h2></div><Button variant="ghost" size="icon" aria-label="Close" onClick={done}><X /></Button></header>
      {step === 0 && <><p>Start a network centred on you, or look around Augusto’s example first. You can switch anytime in Your data.</p>
        <div className="own-actions"><Button onClick={() => setStep(1)}>Start my own network</Button><Button variant="outline" onClick={done}>Explore Augusto’s example</Button></div></>}
      {step === 1 && <><label>Your name<input value={name} onChange={e => setName(e.target.value)} placeholder="Ada Lovelace" /></label>
        <label>OpenAlex author link or ID <small>(optional — helps research and 🤝 matches)</small><input value={catalog} onChange={e => setCatalog(e.target.value)} placeholder="https://openalex.org/A5023888391" /></label></>}
      {step === 2 && <><p>People you know personally. They become the only ways routes leave you. Without a source link they stay marked as your own, unverified statement.</p>
        {contacts.map((c, i) => <div className="own-contact" key={i}>
          <input aria-label="Contact name" placeholder="Name" value={c.name} onChange={e => edit(i, { name: e.target.value })} />
          <select aria-label="Relationship" value={c.relation} onChange={e => edit(i, { relation: e.target.value as StartContact['relation'] })}>{relations.map(r => <option key={r}>{r}</option>)}</select>
          <input aria-label="Source link" placeholder="Source link (optional)" value={c.url} onChange={e => edit(i, { url: e.target.value })} />
        </div>)}
        {contacts.length < 6 && <Button variant="ghost" size="sm" onClick={() => setContacts(cs => [...cs, blank()])}>+ Add contact</Button>}</>}
      {step === 3 && <label>Places or people you’d like to reach, separated by commas<input value={dest} onChange={e => setDest(e.target.value)} placeholder="DeepMind, Santa Fe Institute" /></label>}
      {step > 0 && <footer className="own-actions">
        <Button variant="ghost" onClick={() => setStep(s => s - 1)}>Back</Button>
        {step < 3 ? <Button disabled={step === 1 && !name.trim()} onClick={() => setStep(s => s + 1)}>Next</Button> : <Button onClick={finish}>Create my network</Button>}
      </footer>}
    </section>
  </div>;
}
