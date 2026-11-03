import { keyboardHelpAction } from './help-shortcuts.mjs';

const help = document.querySelector('.keyboard-help');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let previousFocus;
let closing = false;
let closeTimer;

function openHelp() {
  if (help.open) return;
  previousFocus = document.activeElement;
  help.classList.toggle('is-fullscreen', Boolean(document.querySelector('.viewer')?.open));
  help.showModal();
  help.querySelector('h2').focus({ preventScroll: true });
  help.getBoundingClientRect();
  help.classList.add('is-visible');
  window.dispatchEvent(new Event('portfolio:help-open'));
}

function closeHelp() {
  if (!help.open || closing) return;
  closing = true;
  help.classList.remove('is-visible');
  if (reducedMotion.matches) help.close();
  else closeTimer = setTimeout(() => help.close(), 180);
}

// Capture before either slideshow handler, so help never pages an image underneath.
document.addEventListener('keydown', event => {
  const action = keyboardHelpAction({
    key: event.key, altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
    typing: Boolean(event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')),
  }, help.open);
  if (!action) return;
  event.stopImmediatePropagation();
  if (action === 'block') return; // Keep native Tab navigation and browser shortcuts.
  event.preventDefault();
  if (action === 'open') openHelp();
  else closeHelp();
}, true);

help.querySelector('[data-help-close]').addEventListener('click', closeHelp);
help.addEventListener('cancel', event => { event.preventDefault(); closeHelp(); });
help.addEventListener('close', () => {
  clearTimeout(closeTimer);
  closing = false;
  help.classList.remove('is-visible');
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
});
