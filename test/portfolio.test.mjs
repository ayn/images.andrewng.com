import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fetchAlbum, parseExif } from '../scripts/flickr.mjs';
import { albumPath, loadPortfolio } from '../src/lib/data.mjs';
import config from '../site.config.mjs';

const photo = (id, extra = {}) => ({ id, owner: config.flickrUserId, ispublic: 1,
  title: '<script>alert("title")</script>', url_l: `https://live.staticflickr.com/1/${id}_secret_b.jpg`,
  width_l: 1024, height_l: 683, ...extra });

test('EXIF exposes only camera, lens, and exposure fields', () => {
  const exif = parseExif({ camera: 'Camera', exif: [
    { tag: 'LensModel', raw: { _content: '50mm' } },
    { tag: 'FNumber', raw: { _content: '2' }, clean: { _content: 'f/2' } },
    { tag: 'ISO', raw: { _content: '200' } },
    { tag: 'GPSLatitude', raw: { _content: 'private' } },
    { tag: 'SerialNumber', raw: { _content: 'private' } },
  ] });
  assert.deepEqual(exif, { camera: 'Camera', lens: '50mm', aperture: 'f/2', iso: '200' });
});

test('Flickr search scopes owner, requires both tags, paginates, and deduplicates', async () => {
  const calls = [];
  const album = await fetchAlbum(config.albums[0], 'test-key', async url => {
    calls.push(url);
    const page = url.searchParams.get('page');
    return { ok: true, json: async () => ({ stat: 'ok', photos: { pages: 2,
      photo: page === '1' ? [photo('1')] : [photo('1'), photo('2')] } }) };
  });
  assert.equal(calls.length, 2);
  for (const url of calls) {
    assert.equal(url.searchParams.get('user_id'), config.flickrUserId);
    assert.equal(url.searchParams.get('tags'), 'pullfolio,selectedimages');
    assert.equal(url.searchParams.get('tag_mode'), 'all');
    assert.equal(url.searchParams.get('privacy_filter'), '1');
  }
  assert.deepEqual(album.photos.map(p => p.id), ['1', '2']);
});

test('private photos and photos from another account are excluded', async () => {
  const album = await fetchAlbum(config.albums[0], 'key', async () => ({ ok: true, json: async () => ({
    stat: 'ok', photos: { pages: 1, photo: [photo('1', { ispublic: 0 }), photo('2', { owner: 'someone-else' }), photo('3')] },
  }) }));
  assert.deepEqual(album.photos.map(p => p.id), ['3']);
});

test('API errors fail the sync without exposing credentials', async () => {
  await assert.rejects(fetchAlbum(config.albums[0], 'secret', async () => ({ ok: true,
    json: async () => ({ stat: 'fail', code: 100, message: 'secret' }),
  })), error => error.message.includes('100') && !error.message.includes('secret'));
  await assert.rejects(fetchAlbum(config.albums[0], 'secret', async () => { throw Error('secret'); }),
    error => !error.message.includes('secret'));
});

test('built album routes contain locally hosted responsive photos and Flickr links', async () => {
  const data = await loadPortfolio();
  for (const album of data.albums) {
    const html = await readFile(new URL(`../dist${albumPath(album)}index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`<title>${album.title} — Andrew Ng Photography</title>`));
    assert.equal((html.match(/<a\s[^>]*\bdata-photo(?:\s|=|>)/g) || []).length, album.photos.length);
    assert.ok(html.includes('src="/photos/'));
    assert.ok(html.includes('srcset="/photos/'));
    assert.ok(!html.includes('src="https://live.staticflickr.com'));
    assert.ok(!html.includes('api_key'));
    assert.ok(!html.includes('astro-island'));
    for (const photo of album.photos) if (photo.href) assert.ok(html.includes(photo.href));
  }
});

test('snapshot contains all configured albums and no API credentials', async () => {
  const data = JSON.parse(await readFile(new URL('../data/albums.json', import.meta.url)));
  assert.equal(data.userId, config.flickrUserId);
  assert.deepEqual(data.albums.map(a => [a.slug, a.tags]), config.albums.map(a => [a.slug, a.tags]));
  assert.ok(!JSON.stringify(data).match(/api_key|auth_token|oauth_token/));
  for (const album of data.albums) {
    assert.ok(album.photos.length > 0);
    for (const photo of album.photos) {
      assert.ok(photo.sizes.length > 0);
      for (const size of photo.sizes) assert.ok(size.width > 0 && size.height > 0);
    }
  }
});
