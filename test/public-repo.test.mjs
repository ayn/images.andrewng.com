import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('credentials and source or generated JPEGs stay out of Git', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  assert.ok(!files.includes('.env'));
  assert.ok(!files.some(file => /\.(jpe?g|tiff?|png)$/i.test(file)));
  for (const path of ['.env', 'photos/selected-images/example.jpg', 'photos/flickr-overrides/236208468.jpg', 'public/photos/example.jpg', '.cache/images.json']) {
    const ignored = execFileSync('git', ['check-ignore', path], { encoding: 'utf8' }).trim();
    assert.equal(ignored, path);
  }
});
