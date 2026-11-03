import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatShutter, formatAperture, formatIso } from '../src/exif-format.mjs';

test('shutter speeds use photographic fractions instead of decimal seconds', () => {
  for (const text of ['0.02 sec', '0.02 sec (1/50)', '1/50', '1/50s']) {
    assert.equal(formatShutter(text).text, '1/50s');
    assert.equal(formatShutter(text).denominator, '50');
  }
  assert.equal(formatShutter('0.05 sec (1/20)').text, '1/20s');
  assert.equal(formatShutter('2 sec').text, '2s');
  assert.equal(formatShutter('0.4 sec').text, '2/5s');
  assert.equal(formatShutter('0.8 sec').text, '4/5s');
  assert.equal(formatShutter('10/1000').text, '1/100s');
  assert.equal(formatShutter(''), null);
});

test('aperture uses the photographic f symbol and ISO values have no duplicated label', () => {
  assert.equal(formatAperture('f/2.0'), 'ƒ/2');
  assert.equal(formatAperture('2.8'), 'ƒ/2.8');
  assert.equal(formatIso('ISO 800'), '800');
  assert.equal(formatIso('200'), '200');
});
