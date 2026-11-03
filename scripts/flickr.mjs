import config from '../site.config.mjs';

export async function fetchAlbum(album, apiKey, fetcher = fetch) {
  const photos = [];
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    const url = new URL('https://www.flickr.com/services/rest/');
    url.search = new URLSearchParams({
      method: 'flickr.photos.search', api_key: apiKey,
      user_id: config.flickrUserId, tags: album.tags.join(','), tag_mode: 'all',
      privacy_filter: '1', media: 'photos', sort: 'date-posted-desc',
      extras: 'url_m,url_z,url_c,url_l,url_h,url_k',
      per_page: '500', page: String(page), format: 'json', nojsoncallback: '1',
    });
    let response;
    try { response = await fetcher(url, { signal: AbortSignal.timeout(30000) }); }
    catch { throw new Error(`Could not reach Flickr for ${album.title}. Try syncing again.`); }
    if (!response.ok) throw new Error(`Flickr HTTP ${response.status} for ${album.title}`);
    const result = await response.json();
    if (result.stat !== 'ok' || !result.photos) {
      throw new Error(`Flickr rejected ${album.title} (code ${result.code ?? 'unknown'}). Check the API key.`);
    }
    pages = Number(result.photos.pages);
    if (!Number.isInteger(pages) || pages < 0 || pages > 100) throw new Error('Unexpected Flickr pagination');
    for (const photo of result.photos.photo) {
      if (Number(photo.ispublic) !== 1 || photo.owner !== config.flickrUserId) continue;
      const sizes = ['m', 'z', 'c', 'l', 'h', 'k'].flatMap(size => {
        const src = photo[`url_${size}`];
        const width = Number(photo[`width_${size}`]);
        const height = Number(photo[`height_${size}`]);
        if (!src || !width || !height) return [];
        const url = new URL(src);
        if (url.protocol !== 'https:' || !url.hostname.endsWith('.staticflickr.com')) throw new Error('Unexpected photo host');
        return [{ src, width, height }];
      }).sort((a, b) => a.width - b.width);
      if (!sizes.length) throw new Error(`No display sizes for Flickr photo ${photo.id}`);
      photos.push({ id: String(photo.id), title: photo.title || 'Untitled', sizes,
        href: `https://www.flickr.com/photos/${config.flickrUserId}/${photo.id}/` });
    }
  }
  return { ...album, photos: [...new Map(photos.map(p => [p.id, p])).values()] };
}

export function parseExif(photo) {
  const entries = photo.exif || [];
  const value = (...tags) => {
    for (const tag of tags) {
      const entry = entries.find(item => String(item.tag) === tag);
      const text = entry?.clean?._content || entry?.raw?._content;
      if (text != null && String(text).trim()) return String(text).trim().slice(0, 180);
    }
    return '';
  };
  // Only these fields can reach the public snapshot. Never include GPS or serial numbers.
  return Object.fromEntries(Object.entries({
    camera: value('Model', '272') || String(photo.camera || '').slice(0, 180),
    lens: value('LensModel', 'Lens', '42036'),
    focalLength: value('FocalLength', '37386'),
    aperture: value('FNumber', '33437'),
    shutter: value('ExposureTime', '33434'),
    iso: value('ISO', 'ISOSpeedRatings', 'PhotographicSensitivity', '34855'),
  }).filter(([, text]) => text));
}

export async function fetchPhotoExif(photoId, apiKey, fetcher = fetch) {
  const url = new URL('https://www.flickr.com/services/rest/');
  url.search = new URLSearchParams({ method: 'flickr.photos.getExif', api_key: apiKey,
    photo_id: photoId, format: 'json', nojsoncallback: '1' });
  let response;
  try { response = await fetcher(url, { signal: AbortSignal.timeout(30000) }); }
  catch { throw new Error(`Could not reach Flickr for EXIF on photo ${photoId}.`); }
  if (!response.ok) throw new Error(`Flickr EXIF HTTP ${response.status}`);
  const result = await response.json();
  if (result.stat !== 'ok') {
    if ([1, 2].includes(Number(result.code))) return {};
    throw new Error(`Flickr EXIF failed (code ${result.code ?? 'unknown'}).`);
  }
  return parseExif(result.photo);
}

export async function fetchPortfolio(apiKey, fetcher = fetch) {
  if (!apiKey) throw new Error('Set FLICKR_API_KEY before syncing.');
  const albums = [];
  for (const album of config.albums) albums.push(await fetchAlbum(album, apiKey, fetcher));
  const ids = [...new Set(albums.flatMap(album => album.photos.map(photo => photo.id)))];
  const exif = new Map();
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      exif.set(id, await fetchPhotoExif(id, apiKey, fetcher));
    }
  }));
  for (const album of albums) for (const photo of album.photos) photo.exif = exif.get(photo.id);
  return { fetchedAt: new Date().toISOString(), userId: config.flickrUserId, albums };
}
