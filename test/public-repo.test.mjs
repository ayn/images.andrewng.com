import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { parseEnv } from 'node:util';

test('credentials and source or generated JPEGs stay out of Git', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  assert.ok(!files.includes('.env'));
  assert.ok(!files.some(file => /\.(jpe?g|tiff?|png)$/i.test(file)));
  for (const path of ['.env', 'photos/selected-images/example.jpg', 'photos/flickr-overrides/236208468.jpg', 'public/photos/example.jpg', '.cache/images.json']) {
    const ignored = execFileSync('git', ['check-ignore', path], { encoding: 'utf8' }).trim();
    assert.equal(ignored, path);
  }
});


test('tracked source excludes private values from local build settings and personal home paths', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const env = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
  const privateValues = Object.entries(env)
    .filter(([key, value]) => /(?:API_KEY|TOKEN|SECRET|PASSWORD)$/.test(key) && value.length >= 8)
    .map(([, value]) => value);
  privateValues.push(...(env.DEV_ALLOWED_HOSTS || '').split(',').map(value => value.trim()).filter(Boolean));
  privateValues.push(`${homedir()}/`);
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    assert.ok(!privateValues.some(value => content.includes(value)), `${file} contains a private local build value`);
  }
});
