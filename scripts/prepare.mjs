import { sync } from './sync.mjs';
import { loadPortfolio } from '../src/lib/data.mjs';
import { prepareImages } from './images.mjs';
import { loadLocalPhotos } from './local-photos.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

try {
  if (process.env.FLICKR_API_KEY) await sync(process.env.FLICKR_API_KEY);
  const localPhotos = await loadLocalPhotos();
  await mkdir('.cache', { recursive: true });
  await writeFile('.cache/local-photos.json', JSON.stringify(localPhotos, null, 2));
  console.log(`Found ${localPhotos.length} local photographs`);
  const data = await loadPortfolio({ localImages: false });
  console.log(`Using Flickr snapshot from ${data.fetchedAt}`);
  await prepareImages(data);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
