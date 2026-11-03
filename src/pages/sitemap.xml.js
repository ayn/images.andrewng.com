import config from '../../site.config.mjs';
import { albumPath } from '../lib/data.mjs';
export function GET() {
  const paths = [...config.albums.map(albumPath), '/about/'];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${config.url}${path}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
