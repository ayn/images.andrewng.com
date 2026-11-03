import { defineConfig } from 'astro/config';
import site from './site.config.mjs';

export default defineConfig({
  site: site.url,
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
  server: { host: '0.0.0.0', port: 4327, allowedHosts: ['aynstudio.tail23b3c.ts.net'] },
  vite: { server: { strictPort: true }, build: { assetsInlineLimit: 0 } },
});
