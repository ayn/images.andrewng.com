import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import config from '../../site.config.mjs';

export const albumPath = album => album.slug === 'selected-images' ? '/' : `/albums/${album.slug}/`;
export async function loadPortfolio({ localImages = true } = {}) {
  const data = JSON.parse(await readFile(resolve('data/albums.json'), 'utf8'));
  if (data.userId !== config.flickrUserId || data.albums.length !== config.albums.length ||
      !config.albums.every(a => data.albums.some(b => b.slug === a.slug && b.tags.join(',') === a.tags.join(',')))) {
    throw new Error('Snapshot does not match site.config.mjs. Sync Flickr again.');
  }
  const local = JSON.parse(await readFile(resolve('.cache/local-photos.json'), 'utf8'));
  for (const album of data.albums) album.photos.unshift(...local.filter(photo => photo.albums.includes(album.slug)));
  if (localImages) {
    const images = JSON.parse(await readFile(resolve('.cache/images.json'), 'utf8'));
    const exif = JSON.parse(await readFile(resolve('.cache/exif.json'), 'utf8'));
    for (const album of data.albums) for (const photo of album.photos) {
      if (!images[photo.id]?.length) throw new Error(`Missing prepared image ${photo.id}. Run npm run dev or npm run build.`);
      photo.sizes = images[photo.id];
      if (exif[photo.id]) photo.exif = exif[photo.id];
    }
  }
  return data;
}
