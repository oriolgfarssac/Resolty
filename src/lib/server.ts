import type { APIContext } from 'astro';

export const configured = () => Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.WAITLIST_RATE_SECRET?.length ?? 0) >= 32,
);

export async function rpc(name: string, args: object): Promise<unknown> {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Missing storage configuration');
  const url = new URL('/rest/v1/rpc/' + name, base);
  if (url.protocol !== 'https:' && !(import.meta.env.DEV && url.hostname === '127.0.0.1')) {
    throw new Error('Invalid storage URL');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Storage returned ${response.status}`);
  return response.json();
}

export function isSameOrigin({ request, url }: APIContext) {
  return request.headers.get('Origin') === url.origin && request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}

export async function readBody(request: Request, max: number): Promise<URLSearchParams | null> {
  if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return null;
  if (Number(request.headers.get('Content-Length')) > max || !request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return new URLSearchParams(text + decoder.decode());
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export const analyticsEnabled = () => process.env.ANALYTICS_ENABLED === 'true';
export const trackingAllowed = (request: Request) =>
  request.headers.get('DNT') !== '1' && request.headers.get('Sec-GPC') !== '1';
