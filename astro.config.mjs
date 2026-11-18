import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  site: process.env.SITE_URL || 'https://resolty.example',
  adapter: vercel(),
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
