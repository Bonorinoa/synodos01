import { extractionSchema } from '@/lib/research';

const endpoint = 'https://api.x.ai/v1';
function providerError(status: number): Error {
  return new Error(status === 402 || status === 403
    ? 'Grok is unavailable: check your xAI credits, spending limit, and key permissions. No findings were added.'
    : status === 401 ? 'The saved xAI key was rejected. Update it in secure settings.'
    : `Grok could not complete this request (${status}). No findings were added.`);
}

/** Discover an account-supported text model before spending any search credits. */
export async function discoverGrokModel(key: string): Promise<string> {
  const response = await fetch(`${endpoint}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw providerError(response.status);
  const result = await response.json() as { data?: { id?: string }[] };
  const ids = (result.data ?? []).flatMap(m => typeof m.id === 'string' && /^grok-/.test(m.id) && !/vision|image|video/.test(m.id) ? [m.id] : []);
  const model = ids.find(id => id === 'grok-4.7') ?? ids.find(id => /fast.*non-reasoning/.test(id)) ?? ids.find(id => /fast/.test(id)) ?? ids[0];
  if (!model) throw new Error('This xAI key has no available Grok text model. Check its model permissions.');
  return model;
}

export async function extractWithGrok(key: string, model: string, system: string, user: string): Promise<unknown> {
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST', signal: AbortSignal.timeout(120000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], stream: false,
      response_format: { type: 'json_schema', json_schema: { name: 'academic_findings', strict: true, schema: extractionSchema } } }),
  });
  if (!response.ok) throw providerError(response.status);
  const result = await response.json() as { choices?: { finish_reason?: string; message?: { content?: string; refusal?: string } }[] };
  const choice = result.choices?.[0];
  if (choice?.message?.refusal || choice?.finish_reason !== 'stop' || !choice.message?.content) throw new Error('Grok returned incomplete or refused findings. Nothing was added.');
  return JSON.parse(choice.message.content);
}