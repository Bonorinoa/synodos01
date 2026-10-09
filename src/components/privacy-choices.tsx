import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { usePrivacy } from '@/lib/privacy';
export function PrivacyChoices() {
  const id = useId(); const { choices, update } = usePrivacy();
  return <div className="privacy-notes">
    <p>Explore without an account. These permissions are optional, off by default, and can be changed here at any time. Choices apply to this account in this browser.</p>
    <details><summary>Terms & conditions · v1.0</summary>
      <p>Synodos is an experimental network explorer, provided as-is without guarantees of accuracy or availability. Paths are not introductions, endorsements, or proof of an advisor relationship. Check original sources before relying on a claim.</p>
      <p>Only add information you have permission to use. Do not upload confidential, sensitive, or private information about others. You are responsible for what you add, approve, export, or share. Do not use Synodos for harassment, unlawful profiling, or unauthorized access.</p>
      <p>You retain rights to your contributions. Account saving permits storing and processing your network to provide that feature; research permits sending your brief and retrieved academic text to the providers below. You can decline both and still explore locally.</p>
    </details>
    <details><summary>Data privacy · what goes where</summary>
      <p><strong>In this browser:</strong> networks, evidence, settings, tour progress, and privacy choices are stored locally. Anyone using the same browser profile may access local networks. Download a backup before clearing browser data.</p>
      <p><strong>Sign-in:</strong> Google and Lovable Cloud process account identity, email, and session to sign you in, check invitations, and protect research credits. This is necessary only if you choose to sign in. No extra profile is requested.</p>
      <p><strong>Optional account saving:</strong> Lovable Cloud stores network names, people, links, evidence, and dates under your account to restore them across browsers. Other accounts cannot read those cloud copies. Augusto’s bundled starter map is visible to every visitor.</p>
      <p><strong>Optional research:</strong> names, affiliation hints, topics, and destinations go to OpenAlex / Firecrawl for source discovery. Your brief and retrieved public text go to xAI (Grok) for extraction. Your entire saved network is not sent as a research request. Provider processing and retention follow their own policies; Synodos cannot promise deletion of their logs.</p>
      <p>Turning off account saving stops future synchronization, but does not delete existing cloud copies. Turning off research stops new requests, not a request already sent. Delete unwanted networks in Your data; download a backup first. Signing out does not erase local networks.</p>
      <p>Hosting, sign-in, security diagnostics, and external fonts may process technical details such as IP addresses and request errors. These essential operations are not optional feature permissions. Sharing and combining networks are not enabled in v1.0.</p>
      <p>Updated 9 October 2026. These are early-access terms and privacy notes, not a claim of legal certification.</p>
    </details>
    <label className="privacy-choice" htmlFor={`${id}-cloud`}><Checkbox id={`${id}-cloud`} checked={choices.cloudSync} onCheckedChange={v => update({ cloudSync: v === true })}/><span><strong>Allow account saving</strong><small>Save and restore my networks through Lovable Cloud. Requires sign-in and an invite.</small></span></label>
    <label className="privacy-choice" htmlFor={`${id}-research`}><Checkbox id={`${id}-research`} checked={choices.research} onCheckedChange={v => update({ research: v === true })}/><span><strong>Allow external research</strong><small>Send my brief to OpenAlex, Firecrawl, and xAI only when I start research.</small></span></label>
    <label className="privacy-choice" htmlFor={`${id}-terms`}><Checkbox id={`${id}-terms`} checked={choices.termsRead} onCheckedChange={v => update({ termsRead: v === true })}/><span><strong>I’ve read these notes (optional)</strong><small>Not required to explore; this does not enable either permission.</small></span></label>
  </div>;
}
