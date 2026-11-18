import type { APIRoute } from 'astro';
import { isLocale } from '../../lib/i18n';
import { analyticsEnabled, isSameOrigin, readBody, rpc, trackingAllowed } from '../../lib/server';

export const prerender = false;
const events = ['page_view', 'cta_click', 'form_start', 'language_select'];

export const POST: APIRoute = async (context) => {
  const { request } = context;
  if (!analyticsEnabled() || !trackingAllowed(request)) return new Response(null, { status: 204 });
  const body = isSameOrigin(context) ? await readBody(request, 256) : null;
  const event = body?.get('event');
  const lang = body?.get('lang');
  if (!event || !events.includes(event) || !isLocale(lang)) return new Response(null, { status: 400 });
  try {
    await rpc('count_landing_event', { p_event: event, p_locale: lang });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
};
