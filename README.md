# Resolty

Resolty is a multilingual prelaunch landing page for an AI management and optimization platform. Astro prerenders the English, Spanish, and Catalan pages. The Vercel adapter runs the waitlist and analytics endpoints on the server.

## Local development

Use Node.js 24 and npm. From this directory:

```sh
npm ci
npm run dev
npm run check
npm run build
```

Open the localhost URL printed by Astro. The site renders without Supabase. In that configuration valid requests return a localized service-unavailable message. The dashboard is an HTML and SVG concept with example data.

## Connect Supabase

1. Create a Supabase project and apply [supabase/schema.sql](supabase/schema.sql) in its SQL editor. This creates the private waitlist tables, rate buckets, analytics counters, and two service-role-only RPCs.
2. Copy [.env.example](.env.example) to `.env`. Set the variables below and restart Astro.
3. Submit a test request from the landing page. Confirm that a row appears in `public.early_access_requests`, including `consent_version` and `consented_at`. Submit the same email with different casing and confirm the duplicate message. Delete the test row in Supabase before collecting real requests.

| Variable | Value |
| --- | --- |
| `SITE_URL` | Public HTTPS origin. Required for production canonicals, alternate links, and sitemap URLs. |
| `SUPABASE_URL` | Supabase project URL, such as `https://your-project.supabase.co`. |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key starting with `sb_secret_`. Keep it in deployment secrets and out of browser code. |
| `WAITLIST_RATE_SECRET` | Server-only random secret of at least 32 characters. Generate it with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. |
| `ANALYTICS_ENABLED` | Optional. Set to `true` to save daily event counts by language. Defaults to off. Rebuild and deploy after changing this flag. |

For an existing Supabase project, rerun the schema before deploying the updated spending options. Existing requests keep their original range values.

The form checks consent and lengths, normalizes emails, and uses an atomic rate counter and unique email constraint. The rate identifier is an hourly HMAC of the client address. Expired rate buckets are pruned on subsequent valid submission attempts. A successful response requires an explicit success result from the database RPC.

Analytics use first-party requests and daily aggregate counts in `public.landing_event_counts`. Only the event and language are counted. No analytics cookies or form values are used. Requests with Do Not Track or Global Privacy Control signals are excluded. Counts are directional and can be affected by automated traffic. A successful submission is counted by the same database transaction that writes the waitlist entry.

## Enable confirmation emails

Verify the sending domain `resolty.com` in [Resend](https://resend.com/docs/dashboard/domains/introduction), then set `RESEND_API_KEY` in the local `.env` or in Vercel's Production environment and redeploy. Each successful signup sends two emails from `hello@resolty.com`: a localized confirmation to the applicant and a Spanish registration notice with the form details to `hello@resolty.com`. The API key is server-only. Signups continue to save if the key is absent or the provider returns an error. Delivery failures are logged without recipient data. Verify delivery with an address you control.

## Deploy on Vercel

1. Import the repository using the Astro framework preset and Node.js 24. Use `npm run build`. Let the adapter configure the static output and server functions.
2. Add the variables above in Vercel Project Settings. Use separate storage for preview testing if needed. Enable Vercel System Environment Variables so the API can identify the Vercel runtime and use its platform-provided client IP header.
3. Set `SITE_URL` to the production HTTPS origin and deploy. Verify `/`, `/es/`, `/ca/`, `/robots.txt`, and `/sitemap.xml`. Repeat the Supabase smoke test on the deployment.

See the [official Astro Vercel adapter guide](https://docs.astro.build/en/guides/integrations-guide/vercel/).

## Before public collection

Finalize the legal and privacy copy in English, Spanish, and Catalan. Supply the actual operator and controller details, contact address, data retention and deletion process, hosting and Supabase processing details, and any other disclosures required for your operation. The included legal pages are drafts. Update the form’s consent version in the SQL when the consent text materially changes. Review the optional analytics configuration for your deployment before enabling it.

## Source map

- `src/components/` holds the landing sections and accessible native form.
- `src/lib/{en,es,ca}.ts` contains localized copy.
- `src/styles/` holds shared, dashboard, and section SCSS.
- `src/pages/api/` contains the Astro endpoints.
- `supabase/schema.sql` contains the waitlist and analytics database setup.
