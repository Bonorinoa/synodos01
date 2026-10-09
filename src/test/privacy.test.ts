import { beforeEach, describe, expect, it } from 'vitest';
import { PRIVATE_DEFAULTS, PRIVACY_VERSION, readPrivacy, savePrivacy, setPrivacyScope } from '@/lib/privacy';
describe('Optional data permissions', () => {
  beforeEach(() => { localStorage.clear(); setPrivacyScope(); });
  it('defaults to no optional permissions', () => { expect(readPrivacy()).toEqual(PRIVATE_DEFAULTS); });
  it('persists independent choices without bundling acknowledgment', () => {
    savePrivacy({ ...PRIVATE_DEFAULTS, termsRead: true });
    expect(readPrivacy()).toEqual({ cloudSync: false, research: false, termsRead: true });
    savePrivacy({ ...PRIVATE_DEFAULTS, research: true });
    expect(readPrivacy().cloudSync).toBe(false); expect(readPrivacy().research).toBe(true);
  });
  it('does not transfer permission between accounts', () => {
    setPrivacyScope('owner'); savePrivacy({ ...PRIVATE_DEFAULTS, cloudSync: true });
    setPrivacyScope('tester'); expect(readPrivacy().cloudSync).toBe(false);
    setPrivacyScope('owner'); expect(readPrivacy().cloudSync).toBe(true);
  });
  it('rejects corrupt, outdated and non-boolean grants', () => {
    for (const value of ['invalid', JSON.stringify({ version: 'old', cloudSync: true }), JSON.stringify({ version: PRIVACY_VERSION, cloudSync: 'yes' })]) {
      localStorage.setItem('an:privacy:browser', value); expect(readPrivacy().cloudSync).toBe(false);
    }
  });
});
