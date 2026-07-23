export type ProviderId = 'gemini' | 'openai' | 'anthropic';
export const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic Claude' },
];

const STORAGE_KEY = 'promptlab.byok';

export function getKeyConfig(): { provider: ProviderId; key: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function saveKeyConfig(provider: ProviderId, key: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, key }));
}
export function clearKeyConfig(): void { localStorage.removeItem(STORAGE_KEY); }

async function readError(res: Response): Promise<never> {
  const detail = await res.text().catch(() => '');
  if (res.status === 401 || res.status === 403) throw new Error('The API key was rejected — check it in Settings.');
  if (res.status === 429) throw new Error('Rate limit or quota exceeded — try again in a minute.');
  throw new Error(`Provider error ${res.status}: ${detail.slice(0, 200)}`);
}

export async function complete(provider: ProviderId, key: string, prompt: string): Promise<string> {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) await readError(res);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || text === '') {
      throw new Error('The provider returned an empty or unexpected response (possibly a safety block) — try rephrasing your prompt.');
    }
    return text;
  }
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': key,
        'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) await readError(res);
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== 'string' || text === '') {
      throw new Error('The provider returned an empty or unexpected response (possibly a safety block) — try rephrasing your prompt.');
    }
    return text;
  }
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) },
  );
  if (!res.ok) await readError(res);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || text === '') {
    throw new Error('The provider returned an empty or unexpected response (possibly a safety block) — try rephrasing your prompt.');
  }
  return text;
}
