import { defineConfig } from 'astro/config';
import site from './site.config.mjs';

try { process.loadEnvFile(new URL('.env', import.meta.url)); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const previewHosts = (process.env.DEV_ALLOWED_HOSTS || '').split(',').map(host => host.trim()).filter(Boolean);

export default defineConfig({
  site: site.url,
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
  server: { host: '0.0.0.0', port: 4327, allowedHosts: previewHosts },
  vite: { server: { strictPort: true }, build: { assetsInlineLimit: 0 } },
});
