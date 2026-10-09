import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const input = z.object({ prompt: z.string().min(40).max(12000) });

/** Runs the shared research brief with web search; output is only ever staged as unreviewed findings. */
export const runResearch = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { ok: false as const, error: 'The research assistant is not configured yet.' };
    const response = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'fetch' },
      body: JSON.stringify({ model: 'openai/gpt-6-astra', input: data.prompt, stream: true, store: false, reasoning: { effort: 'medium' }, tools: [{ type: 'web_search' }] }),
    });
    if (!response.ok || !response.body) {
      const message = response.status === 402 ? 'You are out of AI credits. Add credits in Settings → Plans & credits, then try again.'
        : response.status === 429 ? 'Too many requests right now. Wait a minute and try again.'
        : `The research assistant could not run (error ${response.status}).`;
      return { ok: false as const, error: message };
    }
    const reader = response.body.getReader(); const decoder = new TextDecoder();
    let buffer = '', text = ''; const cited = new Set<string>();
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        try {
          const event = JSON.parse(line.slice(5)) as { type?: string; delta?: string; annotation?: { url?: string } };
          if (event.type === 'response.output_text.delta' && event.delta) text += event.delta;
          if (event.type === 'response.output_text.annotation.added' && event.annotation?.url) cited.add(event.annotation.url);
        } catch { /* partial event */ }
      }
    }
    const start = text.indexOf('{'), end = text.lastIndexOf('}');
    if (start < 0 || end < start) return { ok: false as const, error: 'The assistant found nothing it could cite. Try adding more names.' };
    return { ok: true as const, text: text.slice(start, end + 1), cited: [...cited] };
  });
