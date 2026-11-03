import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAlbumWarmer } from '../src/album-preload.mjs';

test('large neighboring albums warm only one restored photo each and never more than two documents', async () => {
  const jobs = [], requests = [], prepared = [];
  const photos = Array.from({ length: 200 }, (_, i) => ({ id: `photo${i}` }));
  const warm = createAlbumWarmer({
    schedule: job => { jobs.push(job); return () => {}; }, connection: () => undefined,
    request: async (url, options) => { requests.push(url); assert.equal(options.priority, 'low'); return { ok: true, text: async () => 'album with 200 photos' }; },
    parsePhotos: () => photos,
    preparePhoto: photo => { prepared.push(photo.id); return { decode: () => Promise.resolve() }; },
  });
  const options = { destinations: ['/albums/portraits/photo12/', '/albums/objects/', '/albums/landscape/', '/albums/denim/'], sizesFor: () => '600px', active: () => true };
  warm(options); await Promise.resolve(); await jobs.shift()();
  assert.deepEqual(requests, ['/albums/portraits/photo12/', '/albums/objects/']);
  assert.deepEqual(prepared, ['photo12', 'photo0']);
  // Reopening the viewer must not repeatedly fetch the same album HTML.
  warm(options); await Promise.resolve(); await jobs.shift()();
  assert.equal(requests.length, 2);
  assert.deepEqual(prepared, ['photo12', 'photo0', 'photo12', 'photo0']);
});

test('cancelling an in-flight album request prevents its image and subsequent album from loading', async () => {
  const jobs = []; let finishRequest; let requests = 0; let prepared = 0;
  const warm = createAlbumWarmer({ schedule: job => { jobs.push(job); return () => {}; }, connection: () => undefined,
    request: () => { requests++; return new Promise(resolve => { finishRequest = resolve; }); },
    parsePhotos: () => [{ id: 'first' }], preparePhoto: () => { prepared++; return { decode: () => Promise.resolve() }; },
  });
  const cancel = warm({ destinations: ['/albums/portraits/', '/albums/objects/'], sizesFor: () => '600px', active: () => true });
  await Promise.resolve(); const pending = jobs.shift()();
  cancel(); finishRequest({ ok: true, text: async () => '' }); await pending;
  assert.equal(requests, 1); assert.equal(prepared, 0);
});

test('album requests never start while hidden, saving data, or on 3G/2G', async () => {
  for (const [active, connection] of [[false, undefined], [true, { saveData: true }], [true, { effectiveType: '3g' }], [true, { effectiveType: '2g' }]]) {
    let jobs = 0; let requests = 0;
    const warm = createAlbumWarmer({ schedule: () => { jobs++; return () => {}; }, connection: () => connection,
      request: async () => { requests++; },
    });
    warm({ destinations: ['/albums/portraits/'], sizesFor: () => '600px', active: () => active });
    await Promise.resolve(); assert.equal(jobs, 0); assert.equal(requests, 0);
  }
});
