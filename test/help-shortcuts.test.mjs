import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyboardHelpAction } from '../src/help-shortcuts.mjs';

test('question mark opens help unless typing or using modified browser shortcuts', () => {
  assert.equal(keyboardHelpAction({ key: '?' }, false), 'open');
  assert.equal(keyboardHelpAction({ key: '?', typing: true }, false), null);
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) {
    assert.equal(keyboardHelpAction({ key: '?', [modifier]: true }, false), null);
  }
});

test('help consumes photo/album keys and closes on Escape without closing the viewer beneath', () => {
  assert.equal(keyboardHelpAction({ key: 'Escape' }, true), 'close');
  assert.equal(keyboardHelpAction({ key: '?' }, true), 'close');
  for (const key of ['h', 'l', 'j', 'k', 'f', 'd', 'Tab']) {
    assert.equal(keyboardHelpAction({ key }, true), 'block');
  }
  assert.equal(keyboardHelpAction({ key: 'Escape' }, false), null);
});
