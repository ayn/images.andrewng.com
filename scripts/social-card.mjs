import sharp from 'sharp';
import { basename } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { loadPortfolio } from '../src/lib/data.mjs';

export async function createSocialCard() {
  const { albums } = await loadPortfolio();
  const selected = albums.find(album => album.slug === 'selected-images');
  const photo = selected.photos.find(photo => photo.source && basename(photo.source) === '_MG_5833.jpg') || selected.photos[0];
  const source = photo.sizes.find(size => Math.max(size.width, size.height) >= 1280) || photo.sizes.at(-1);
  const picture = await sharp(`public${source.src}`).resize(760, 550, { fit: 'contain', background: '#fff' }).jpeg({ quality: 94 }).toBuffer();
  const typography = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#fff"/>
    <text x="52" y="71" fill="#777" font-family="Helvetica, sans-serif" font-size="11" letter-spacing="3">PHOTOGRAPHS</text>
    <text x="48" y="230" fill="#242424" font-family="Baskerville, Georgia, serif" font-size="76" letter-spacing="-3">Andrew</text>
    <text x="48" y="311" fill="#242424" font-family="Baskerville, Georgia, serif" font-size="76" letter-spacing="-3">Ng</text>
    <text x="53" y="359" fill="#555" font-family="Helvetica, sans-serif" font-size="13" letter-spacing="5">IMAGES</text>
    <text x="53" y="572" fill="#777" font-family="Helvetica, sans-serif" font-size="12">images.andrewng.com</text>
  </svg>`);
  const output = await sharp(typography).composite([{ input: picture, left: 400, top: 40 }]).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
  await writeFile('public/og.jpg', output);
  console.log('Prepared 1200×630 social sharing card');
}
