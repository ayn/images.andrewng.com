import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containImageRect, createPhotoTransitionGate, clampPhotoPan, autoplayPermitted, rememberAutoplayPause, clearAutoplayPause } from '../src/photo-motion.mjs';

test('return animation targets the drawn image, excluding contain letterboxing', () => {
  assert.deepEqual(containImageRect({ left: 100, top: 50, width: 800, height: 600 }, 400, 600), { left: 300, top: 50, width: 400, height: 600 });
  assert.deepEqual(containImageRect({ left: 100, top: 50, width: 800, height: 600 }, 800, 400), { left: 100, top: 150, width: 800, height: 400 });
});

test('rapid paging waits for the displayed transition and commits only the newest decoded photo', async () => {
  let time = 0;
  const sleepers = [];
  const gate = createPhotoTransitionGate({ now: () => time, sleep: ms => new Promise(resolve => sleepers.push({ ms, resolve })) });
  gate.hold(420);
  const first = gate.request().ready();
  const latest = gate.request().ready();
  assert.equal(sleepers.length, 2);
  assert.equal(sleepers[0].ms, 420);
  time = 420;
  sleepers.forEach(wait => wait.resolve());
  assert.equal(await first, false);
  assert.equal(await latest, true);
});

test('closing cancels pending image swaps and instant inline restoration skips the fade delay', async () => {
  const gate = createPhotoTransitionGate({ now: () => 0, sleep: () => { throw Error('Unexpected delay'); } });
  const pending = gate.request();
  gate.cancel();
  assert.equal(await pending.ready(), false);
  gate.hold(420);
  assert.equal(await gate.request().ready(true), true);
});

test('autoplay starts on a fresh visit, pauses for the tab after interaction, and respects reduced motion', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  assert.equal(autoplayPermitted(false, storage), true);
  assert.equal(autoplayPermitted(true, storage), false);
  rememberAutoplayPause(storage);
  assert.equal(autoplayPermitted(false, storage), false);
  clearAutoplayPause(storage);
  assert.equal(autoplayPermitted(false, storage), true);
});


test('zoom panning keeps photo edges inside the viewport and centers axes that still fit', () => {
  const viewport = { width: 390, height: 844 };
  assert.deepEqual(clampPhotoPan({ x: 900, y: -900 }, { width: 390, height: 260 }, viewport, 2.5), { x: 292.5, y: 0 });
  assert.deepEqual(clampPhotoPan({ x: -900, y: 900 }, { width: 390, height: 585 }, viewport, 2.5), { x: -292.5, y: 309.25 });
  assert.deepEqual(clampPhotoPan({ x: 90, y: -90 }, { width: 390, height: 585 }, viewport, 1), { x: 0, y: 0 });
});
