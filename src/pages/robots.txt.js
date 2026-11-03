import config from '../../site.config.mjs';
export function GET() {
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${config.url}/sitemap.xml\n`);
}
