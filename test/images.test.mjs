import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import sharp from 'sharp';
import { loadLocalPhotos } from '../scripts/local-photos.mjs';
import { buildVariants, indexOriginals } from '../scripts/images.mjs';

test('local JPEGs deduplicate across albums, preserve display EXIF, and produce 6K variants without embedded EXIF', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'images-portfolio-'));
  await mkdir(join(dir, 'selected-images'));
  await mkdir(join(dir, 'portraits'));
  const source = await sharp({ create: { width: 6400, height: 4266, channels: 3, background: '#b3c1c9' } })
    .jpeg().withMetadata({ exif: { IFD0: { Model: 'Test Camera' } } }).toBuffer();
  await writeFile(join(dir, 'selected-images', 'test-photo.jpg'), source);
  await writeFile(join(dir, 'selected-images', 'test-photo.json'), JSON.stringify({ title: '<A title>' }));
  await writeFile(join(dir, 'portraits', 'test-photo.jpg'), source);
  const photos = await loadLocalPhotos(dir);
  assert.equal(photos.length, 1);
  assert.deepEqual(photos[0].albums, ['selected-images', 'portraits']);
  assert.equal(photos[0].title, '<A title>');
  assert.equal(photos[0].exif.camera, 'Test Camera');
  const output = join(dir, 'output');
  const variants = await buildVariants(source, photos[0].id, output);
  assert.deepEqual(variants.map(size => Math.max(size.width, size.height)), [640, 1280, 1920, 2560, 3840, 6144]);
  for (const variant of variants) {
    const metadata = await sharp(join(output, basename(variant.src))).metadata();
    assert.equal(metadata.exif, undefined);
    assert.ok(Math.max(metadata.width, metadata.height) <= 6400);
    assert.ok(Math.abs(metadata.width / metadata.height - 6400 / 4266) < 0.005);
  }
});

test('Lightroom replacement files match Flickr IDs without matching partial IDs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'images-overrides-'));
  await writeFile(join(dir, 'sand-harbor_236208468.jpg'), 'fixture');
  await writeFile(join(dir, 'not-a-match_1236208468.jpg'), 'fixture');
  const matches = await indexOriginals(dir, ['236208468', '999']);
  assert.equal(matches.size, 1);
  assert.equal(basename(matches.get('236208468')), 'sand-harbor_236208468.jpg');
});
