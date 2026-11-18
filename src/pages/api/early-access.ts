import type { APIContext, APIRoute } from 'astro';
import { createHmac } from 'node:crypto';
import { copy, isLocale, pathFor, acceptedSpending, tools, type Locale } from '../../lib/i18n';
import { analyticsEnabled, configured, isSameOrigin, readBody, rpc, trackingAllowed } from '../../lib/server';

export const prerender = false;

type Result = 'success' | 'invalid' | 'duplicate' | 'unavailable' | 'limited';
const status: Record<Result, number> = { success: 201, invalid: 422, duplicate: 409, unavailable: 503, limited: 429 };

function reply(context: APIContext, lang: Locale, result: Result) {
  const t = copy[lang];
  const ok = result === 'success';
  const headers = { 'Cache-Control': 'no-store' };
  if (context.request.headers.get('Accept')?.includes('application/json')) {
    return Response.json({ ok, message: t.form[result] }, { status: status[result], headers });
  }
  const title = t.form[result];
  const detail = ok ? `<p>${t.form.successBody}</p>` : '';
  return new Response(`<!doctype html><html lang="${lang}"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${title} — Resolty</title><style>body{margin:0;background:#f8f8f4;color:#14172c;font:1rem system-ui}
main{max-width:38rem;margin:12vh auto;padding:2rem}h1{font-size:clamp(1.8rem,5vw,3rem);line-height:1.08}
a{color:#254cf2}</style><main><a href="${pathFor(lang)}#early-access">${t.back}</a><h1>${title}</h1>${detail}</main></html>`, {
    status: status[result], headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const body = await readBody(request, 8192);
  const locale = body?.get('locale');
  const lang = isLocale(locale) ? locale : 'en';
  if (!body || !isSameOrigin(context)) return reply(context, lang, 'invalid');

  const field = (key: string) => (body.get(key) ?? '').trim();
  const name = field('name');
  const email = field('email').toLowerCase();
  const company = field('company');
  const spend = field('spend');
  const use = field('use');
  const choices = [...new Set(body.getAll('tools'))];
  if (field('website') || field('consent') !== 'yes' || name.length < 2 || name.length > 120 ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      company.length < 2 || company.length > 160 || !acceptedSpending.includes(spend) || use.length > 500 ||
      choices.some((item) => !tools.includes(item)) || (choices.includes('none') && choices.length > 1)) {
    return reply(context, lang, 'invalid');
  }
  if (!configured()) return reply(context, lang, 'unavailable');

  try {
    const address = process.env.VERCEL === '1'
      ? request.headers.get('x-vercel-forwarded-for') || context.clientAddress
      : context.clientAddress || 'unknown';
    const bucket = createHmac('sha256', process.env.WAITLIST_RATE_SECRET!)
      .update(`${Math.floor(Date.now() / 3_600_000)}:${address}`).digest('hex');
    const outcome = await rpc('submit_early_access', {
      p_ip_bucket: bucket, p_name: name, p_email: email, p_company: company, p_spend: spend,
      p_tools: choices, p_use: use || null, p_locale: lang,
      p_track: analyticsEnabled() && trackingAllowed(request),
    });
    if (outcome === 'success' || outcome === 'duplicate' || outcome === 'limited') {
      return reply(context, lang, outcome);
    }
  } catch {
    console.error('Early-access storage is unavailable');
  }
  return reply(context, lang, 'unavailable');
};
