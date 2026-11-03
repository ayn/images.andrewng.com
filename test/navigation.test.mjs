import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPhotoNavigation } from '../src/navigation.mjs';

test('arrow and vi keys navigate photos with wraparound', () => {
  const navigate = createPhotoNavigation();
  for (const key of ['ArrowLeft', 'h', 'k']) assert.equal(navigate(key, 0, 5), 4);
  for (const key of ['ArrowRight', 'j', 'l']) assert.equal(navigate(key, 4, 5), 0);
  assert.equal(navigate('Home', 3, 5), 0);
  assert.equal(navigate('G', 0, 5), 4);
  assert.equal(navigate('End', 0, 5), 4);
});

test('gg goes to the first photo only as a timely uninterrupted sequence', () => {
  const navigate = createPhotoNavigation();
  assert.equal(navigate('g', 3, 5, 1000), null);
  assert.equal(navigate('g', 3, 5, 1100), 0);
  assert.equal(navigate('g', 3, 5, 2000), null);
  assert.equal(navigate('g', 3, 5, 3000), null);
  assert.equal(navigate('j', 3, 5, 3100), 4);
  assert.equal(navigate('g', 4, 5, 3200), null);
  assert.equal(navigate('?', 4, 5), null);
  assert.equal(navigate('l', 0, 0), null);
});
