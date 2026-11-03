import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import exifr from 'exifr';
import sharp from 'sharp';
import config from '../site.config.mjs';

export function formatLocalExif(tags = {}) {
  const text = value => value == null ? '' : String(value).trim().slice(0, 180);
  const shutter = Number(tags.ExposureTime);
  return Object.fromEntries(Object.entries({
    camera: text(tags.Model), lens: text(tags.LensModel),
    focalLength: tags.FocalLength ? `${Number(tags.FocalLength)} mm` : '',
    aperture: tags.FNumber ? `f/${Number(tags.FNumber)}` : '',
    shutter: shutter > 0 ? (shutter < 1 ? `1/${Math.round(1 / shutter)}s` : `${shutter}s`) : '',
    iso: text(tags.ISO),
  }).filter(([, value]) => value));
}

async function* files(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (/\.jpe?g$/i.test(entry.name)) yield path;
  }
}

export async function loadLocalPhotos(root = resolve('photos')) {
  const photos = new Map();
  for (const album of config.albums) {
    for await (const source of files(resolve(root, album.slug))) {
      const bytes = await readFile(source);
      const id = `local-${createHash('sha256').update(bytes).digest('hex').slice(0, 20)}`;
      if (photos.has(id)) { photos.get(id).albums.push(album.slug); continue; }
      const metadata = await sharp(bytes).metadata();
      const tags = await exifr.parse(bytes, ['Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal']) || {};
      let sidecar = {};
      try { sidecar = JSON.parse(await readFile(source.slice(0, -extname(source).length) + '.json', 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const title = sidecar.title || basename(source, extname(source)).replace(/[-_]+/g, ' ');
      if (typeof title !== 'string') throw new Error(`Photo title must be text: ${basename(source)}`);
      photos.set(id, { id, title, source, albums: [album.slug], exif: formatLocalExif(tags),
        capturedAt: tags.DateTimeOriginal instanceof Date ? tags.DateTimeOriginal.toISOString() : (await stat(source)).mtime.toISOString(),
        sizes: [{ width: metadata.width, height: metadata.height }] });
    }
  }
  return [...photos.values()].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt) || a.id.localeCompare(b.id));
}
