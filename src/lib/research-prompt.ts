import { discoveryBases } from '@/lib/ingest';

export type ResearchBrief = { owner: string; bio: string; people: string; destinations: string };

/** One prompt shared by the copyable agent brief and the in-app researcher, so both follow identical honesty rules. */
export function buildResearchPrompt(brief: ResearchBrief, today = new Date().toISOString().slice(0, 10)) {
  return `You are a careful academic research assistant building a relationship map for ${brief.owner || 'the owner'}.

ABOUT THE OWNER
${brief.bio.trim() || '(no bio given)'}

NAMED DIRECT CONTACTS
${brief.people.trim() || '(none given)'}

DREAM DESTINATIONS (institutions the owner would love to reach)
${brief.destinations.trim() || '(none given)'}

TASK
1. For each named direct contact, find their frequent coauthors, PhD advisor, and PhD committee members.
2. Find any recorded link between those people and the dream destinations (appointments, joint projects, coauthorship).

STRICT RULES
- Only report a link you can cite with a public URL you actually found. Never guess or invent a person, paper, or URL.
- One finding per relationship. If unsure, leave it out.
- Use publication author lists for coauthorship and dissertation front matter, university records, or an explicit CV for committee/advisor claims. Never infer a relationship from a citation or shared institution.
- Disambiguate people by full name and research context; omit uncertain identities. Never scrape Academic Tree or access private pages.
- Quote an exact source passage naming both people and the relationship. A readable URL is not proof of the claim. All findings remain pending for the network owner.
- "from" is a direct contact (or ${brief.owner || 'the owner'} for links to the owner); "to" is the other person or place.
- basis must be one of: ${discoveryBases.join(', ')}.
- claim is one short factual sentence, e.g. 'Coauthored "Paper title" (2023).'
- retrieved_at is ${today}.

OUTPUT: only JSON, no prose, in exactly this shape:
{"format":"network-findings","version":1,"source_tool":"research-agent","retrieved_at":"${today}","findings":[{"from":{"label":"Name"},"to":{"label":"Name","kind":"person"},"basis":"coauthorship","claim":"…","sources":[{"url":"https://…","retrieved_at":"${today}","title":"…"}]}]}
kind is one of person, lab, institution, university.`;
}
