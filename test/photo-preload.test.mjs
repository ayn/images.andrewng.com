import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearbyPhotoIndices, canPreloadAlbums, createPhotoCache, createPhotoBuffer } from '../src/photo-preload.mjs';

test('photo buffer wraps two ahead and one behind without duplicating tiny albums', () => {
  assert.deepEqual(nearbyPhotoIndices(0, 5), [1, 2, 4]);
  assert.deepEqual(nearbyPhotoIndices(4, 5), [0, 1, 3]);
  assert.deepEqual(nearbyPhotoIndices(0, 2), [1]);
  assert.deepEqual(nearbyPhotoIndices(0, 1), []);
  assert.deepEqual(nearbyPhotoIndices(0, 0), []);
});

test('data saving and slow connections limit speculation without disabling ordinary navigation', () => {
  for (const connection of [{ saveData: true }, { effectiveType: '2g' }, { effectiveType: 'slow-2g' }]) {
    assert.deepEqual(nearbyPhotoIndices(0, 5, connection), []);
    assert.equal(canPreloadAlbums(connection), false);
  }
  assert.deepEqual(nearbyPhotoIndices(0, 5, { effectiveType: '3g' }), [1]);
  assert.equal(canPreloadAlbums({ effectiveType: '3g' }), false);
  assert.equal(canPreloadAlbums(undefined), true);
});

test('responsive cache reuses decoded image elements, restores cleared sources, and stays bounded', () => {
  let created = 0;
  const cache = createPhotoCache({ limit: 2, makeImage: () => ({ serial: ++created }) });
  const photo = id => ({ full: `/${id}-large.jpg`, srcset: `/${id}-small.jpg 640w, /${id}-large.jpg 1920w` });
  const first = cache.get(photo('a'), '800px');
  assert.equal(first.fetchPriority, 'low');
  assert.equal(cache.get(photo('a'), '800px', 'high'), first);
  assert.equal(first.fetchPriority, 'high');
  first.src = ''; first.srcset = '';
  assert.equal(cache.get(photo('a'), '800px').src, '/a-large.jpg');
  cache.get(photo('b'), '800px'); cache.get(photo('c'), '800px');
  assert.equal(cache.size, 2);
  assert.notEqual(cache.get(photo('a'), '800px'), first);
  assert.notEqual(cache.get(photo('a'), '1200px'), cache.get(photo('a'), '800px'));
});

test('new selections replace stale idle work and demote images outside the rolling buffer', () => {
  const jobs = [];
  const images = Array.from({ length: 6 }, () => ({ complete: true, loading: 'lazy', decoded: 0, decode() { this.decoded++; return Promise.resolve(); } }));
  const buffer = createPhotoBuffer({ photos: images, imageFor: i => images[i], sizesFor: () => '800px',
    active: () => true, connection: () => undefined, schedule: job => { jobs.push(job); return () => {}; } });
  buffer.update(0); buffer.update(3);
  jobs.forEach(job => job());
  assert.equal(images[0].loading, 'lazy');
  assert.equal(images[3].fetchPriority, 'high');
  assert.deepEqual(images.map((image, i) => image.decoded ? i : null).filter(i => i !== null), [2, 4, 5]);
});

test('closing during decode or hiding a tab prevents background requests', async () => {
  let decoded; let scheduled = 0;
  const selected = { complete: false, decode: () => new Promise(resolve => { decoded = resolve; }) };
  const buffer = createPhotoBuffer({ photos: [selected, {}], imageFor: () => selected, sizesFor: () => '800px', active: () => true,
    schedule: () => { scheduled++; return () => {}; } });
  buffer.update(0); buffer.pause(); decoded(); await Promise.resolve();
  assert.equal(scheduled, 0);
  const hidden = createPhotoBuffer({ photos: [{}, {}], sizesFor: () => '800px', active: () => false,
    schedule: () => { scheduled++; return () => {}; } });
  hidden.update(0);
  assert.equal(scheduled, 0);
});
