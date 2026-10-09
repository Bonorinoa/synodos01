import { useEffect, useState } from 'react';
export const PRIVACY_VERSION = '2026-10-09';
export type PrivacyChoices = { cloudSync: boolean; research: boolean; termsRead: boolean };
export const PRIVATE_DEFAULTS: PrivacyChoices = { cloudSync: false, research: false, termsRead: false };
let scope = 'browser';
const key = () => `an:privacy:${scope}`;
export function readPrivacy(): PrivacyChoices {
  if (typeof window === 'undefined') return { ...PRIVATE_DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem(key()) ?? 'null');
    if (saved?.version !== PRIVACY_VERSION) return { ...PRIVATE_DEFAULTS };
    return { cloudSync: saved.cloudSync === true, research: saved.research === true, termsRead: saved.termsRead === true };
  } catch { return { ...PRIVATE_DEFAULTS }; }
}
export function setPrivacyScope(userId?: string) { scope = userId ?? 'browser'; window.dispatchEvent(new Event('an:privacy-changed')); }
export function savePrivacy(choices: PrivacyChoices) {
  localStorage.setItem(key(), JSON.stringify({ ...choices, version: PRIVACY_VERSION, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('an:privacy-changed'));
}
export function usePrivacy() {
  const [choices, setChoices] = useState<PrivacyChoices>(PRIVATE_DEFAULTS);
  useEffect(() => {
    const refresh = () => setChoices(readPrivacy());
    refresh(); window.addEventListener('an:privacy-changed', refresh); window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('an:privacy-changed', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  return { choices, update: (patch: Partial<PrivacyChoices>) => savePrivacy({ ...readPrivacy(), ...patch }) };
}
