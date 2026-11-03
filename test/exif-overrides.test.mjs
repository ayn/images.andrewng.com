import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyExifOverrides } from '../src/lib/exif-overrides.mjs';

test('confirmed EXIF corrections apply by photo ID across albums without changing similar focal-length shots', () => {
  const photo = id => ({ id, exif: { camera: 'Canon', lens: '100.0 mm', iso: '100' } });
  const albums = [{ photos: [photo('a'), photo('b')] }, { photos: [photo('a')] }];
  applyExifOverrides(albums, { a: { lens: 'Confirmed lens model' } });
  assert.equal(albums[0].photos[0].exif.lens, 'Confirmed lens model');
  assert.equal(albums[1].photos[0].exif.lens, 'Confirmed lens model');
  assert.equal(albums[0].photos[1].exif.lens, '100.0 mm');
  assert.equal(albums[0].photos[0].exif.iso, '100');
});

test('EXIF overrides reject location/serial fields and unknown photos', () => {
  const albums = [{ photos: [{ id: 'a' }] }];
  for (const field of ['latitude', 'GPSLatitude', 'serialNumber']) {
    assert.throws(() => applyExifOverrides(albums, { a: { [field]: 'private' } }));
  }
  assert.throws(() => applyExifOverrides(albums, { missing: { lens: 'Lens' } }));
});
