import type { APIRoute } from 'astro';
import { locales, pathFor } from '../lib/i18n';

export const GET: APIRoute = ({ site }) => {
  const entries = locales.map((lang) => `<url><loc>${new URL(pathFor(lang), site)}</loc>${
    locales.map((item) => `<xhtml:link rel="alternate" hreflang="${item === 'es' ? 'es-ES' : item}" href="${new URL(pathFor(item), site)}"/>`).join('')
  }<xhtml:link rel="alternate" hreflang="x-default" href="${new URL('/', site)}"/></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
