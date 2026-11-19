import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

const productionSite = 'https://resolty.com';
const configuredSite = new URL(process.env.SITE_URL || productionSite);
const legacyHosts = ['resolty.vercel.app', 'resolty.example'];

export default defineConfig({
  site: legacyHosts.includes(configuredSite.hostname) ? productionSite : configuredSite.href,
  adapter: vercel(),
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
