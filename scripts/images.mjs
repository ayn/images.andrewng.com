import { mkdir, readFile, writeFile, stat, readdir, rename } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { readDisplayExif } from './local-photos.mjs';

export const imageEdges = [640, 1280, 1920, 2560, 3840, 6144];
const exists = async path => { try { return (await stat(path)).size > 0; } catch { return false; } };

export async function buildVariants(bytes, id, outputDirectory = resolve('public/photos')) {
  await mkdir(outputDirectory, { recursive: true });
  const metadata = await sharp(bytes).metadata();
  const nativeEdge = Math.max(metadata.width, metadata.height);
  const edges = [...new Set([...imageEdges.filter(edge => edge <= nativeEdge), Math.min(nativeEdge, 6144)])].sort((a, b) => a - b);
  const version = createHash('sha256').update(bytes).update('jpeg88-444-v1').digest('hex').slice(0, 12);
  const sizes = [];
  for (const edge of edges) {
    const name = `${id}-${version}-${edge}.jpg`;
    const output = resolve(outputDirectory, name);
    if (!await exists(output)) {
      await sharp(bytes).rotate().resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88, progressive: true, chromaSubsampling: '4:4:4' }).toFile(`${output}.tmp`);
      await rename(`${output}.tmp`, output);
    }
    const result = await sharp(output).metadata();
    sizes.push({ src: `/photos/${name}`, width: result.width, height: result.height });
  }
  return sizes.sort((a, b) => a.width - b.width);
}

export async function indexOriginals(dir, ids, found = new Map()) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await indexOriginals(path, ids, found);
    else if (/\.(jpe?g|png|webp|tiff?|avif)$/i.test(entry.name)) {
      for (const id of ids) if (new RegExp(`(^|[_-])${id}(?=[_.-]|$)`).test(entry.name)) {
        if (found.has(id)) throw new Error(`Multiple original files match Flickr ID ${id}. Keep one source per photo.`);
        found.set(id, path);
      }
    }
  }
  return found;
}

async function downloadPhoto(src, path) {
  if (await exists(path)) return;
  const url = new URL(src);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.staticflickr.com')) throw new Error('Unexpected Flickr image host');
  let bytes;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw Error('Invalid image response');
      bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw Error('Invalid image size');
      break;
    } catch {
      if (attempt === 2) throw new Error(`Could not download ${basename(path)} from Flickr.`);
    }
  }
  await writeFile(`${path}.tmp`, bytes);
  await rename(`${path}.tmp`, path);
}

export async function prepareImages(data) {
  await mkdir('.cache/downloads', { recursive: true });
  await mkdir('public/photos', { recursive: true });
  const photos = [...new Map(data.albums.flatMap(album => album.photos).map(photo => [photo.id, photo])).values()];
  const originals = await indexOriginals(resolve(process.env.ORIGINALS_DIR || 'photos/flickr-overrides'), photos.filter(photo => !photo.source).map(photo => photo.id));
  const missingOriginals = photos.filter(photo => !photo.source && !originals.has(photo.id));
  if (process.env.REQUIRE_ORIGINALS === '1' && missingOriginals.length) {
    throw new Error(`Originals are required: missing ${missingOriginals.length} source files. Set ORIGINALS_DIR to a complete Flickr source folder.`);
  }
  const manifest = {};
  const exif = {};
  let done = 0;
  let next = 0;
  let limited = 0;
  async function worker() {
    while (next < photos.length) {
      const photo = photos[next++];
      const largest = photo.sizes.at(-1);
      const source = photo.source || originals.get(photo.id) || resolve('.cache/downloads', basename(new URL(largest.src).pathname));
      if (!photo.source && !originals.has(photo.id)) await downloadPhoto(largest.src, source);
      const bytes = await readFile(source);
      const metadata = await sharp(bytes).metadata();
      const nativeEdge = Math.max(metadata.width, metadata.height);
      if (nativeEdge < 3840) limited++;
      manifest[photo.id] = await buildVariants(bytes, photo.id);
      if (photo.source || originals.has(photo.id)) exif[photo.id] = { ...photo.exif, ...await readDisplayExif(bytes) };
      if (++done % 10 === 0 || done === photos.length) console.log(`Prepared ${done}/${photos.length} photos`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  await writeFile('.cache/images.json', JSON.stringify(manifest, null, 2));
  await writeFile('.cache/exif.json', JSON.stringify(exif, null, 2));
  console.log(`${originals.size} originals matched; ${limited} photos have source resolution below 3840px. No images were upscaled.`);
}
