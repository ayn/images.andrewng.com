import { mkdir, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchPortfolio } from './flickr.mjs';

export const dataPath = new URL('../data/albums.json', import.meta.url);
export async function sync(apiKey) {
  const data = await fetchPortfolio(apiKey);
  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  const temp = `${fileURLToPath(dataPath)}.tmp`;
  await writeFile(temp, JSON.stringify(data, null, 2) + '\n');
  await rename(temp, dataPath);
  for (const album of data.albums) {
    const largest = album.photos.map(p => Math.max(...p.sizes.map(s => Math.max(s.width, s.height))));
    console.log(`${album.title}: ${album.photos.length} photos; largest edges ${largest.length ? Math.min(...largest) + '–' + Math.max(...largest) : 0}px`);
  }
  return data;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { await sync(process.env.FLICKR_API_KEY); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
