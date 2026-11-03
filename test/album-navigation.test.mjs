import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectedPhotoIndex, albumDestination } from '../src/album-navigation.mjs';

test('returning to an album restores its photo, with explicit shared URLs taking priority', () => {
  const ids = ['first', 'middle', 'last'];
  assert.equal(selectedPhotoIndex(ids, '', 'middle'), 1);
  assert.equal(selectedPhotoIndex(ids, '#photo=last', 'middle'), 2);
  assert.equal(selectedPhotoIndex(ids, '#photo=deleted', 'middle'), 1);
  assert.equal(selectedPhotoIndex(ids, '', 'deleted'), 0);
});

test('album navigation remembers each selection', () => {
  const paths = ['/', '/albums/portraits/', '/albums/objects/'];
  const remembered = { '/': 'selected-12', '/albums/portraits/': 'portrait-4' };
  assert.equal(albumDestination(paths, '/', 1, remembered), '/albums/portraits/#photo=portrait-4');
  assert.equal(albumDestination(paths, '/albums/portraits/', -1, remembered), '/#photo=selected-12');
  assert.equal(albumDestination(paths, '/', -1, remembered), '/albums/objects/');
  assert.equal(albumDestination(paths, '/about/', 1, remembered), null);
});
