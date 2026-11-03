import { createPhotoNavigation } from './navigation.mjs';
import { renderExif } from './exif-format.mjs';
import { restorePhotoIndex, rememberPhoto, wantsFullscreen } from './album-navigation.mjs';
import { containImageRect, createPhotoTransitionGate } from './photo-motion.mjs';

const navigate = createPhotoNavigation();
const transitions = createPhotoTransitionGate();
const photos = [...document.querySelectorAll('[data-photo]')];
const viewer = document.querySelector('.viewer');
let image = document.querySelector('#viewer-image');
const stack = document.querySelector('.viewer-photo-stack');
const details = document.querySelector('#photo-details');
const detailsToggle = document.querySelector('.details-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let current = 0;
let displayed = -1;
let closeTimer;
let fadeTimer;
let closing = false;
let touch;
const nativeTouch = window.matchMedia('(any-pointer: coarse)').matches;
let nativeTrack;
let nativeImages;
let nativeNavigation = false;
let nativeScrollTimer;
let swipeRestoreTimer;
let morph;
let morphTarget;
let targetVisibility;
let morphParent;
let morphSibling;

function updateMetadata(target) {
  const photo = photos[target];
  displayed = target;
  rememberPhoto(photo.dataset.id);
  document.querySelector('#position').textContent = `${target + 1} / ${photos.length}`;
  const hasExif = renderExif(details, JSON.parse(photo.dataset.exif || '{}'));
  detailsToggle.hidden = !hasExif;
  details.hidden = !hasExif || detailsToggle.getAttribute('aria-expanded') !== 'true';
}

function ensureNativeTrack() {
  if (nativeTrack) return nativeImages;
  image.remove();
  nativeTrack = document.createElement('div');
  nativeTrack.className = 'viewer-native-track';
  nativeImages = photos.map(photo => {
    const frame = document.createElement('div');
    frame.className = 'viewer-native-slide';
    const picture = new Image();
    picture.loading = 'lazy';
    picture.alt = photo.dataset.title;
    picture.tabIndex = -1;
    picture.sizes = `${Math.max(1, Math.floor(Math.min(window.innerWidth - 24, (window.innerHeight - 200) * photo.dataset.width / photo.dataset.height)))}px`;
    picture.srcset = photo.dataset.srcset;
    picture.src = photo.dataset.full;
    picture.style.maxWidth = `min(100%, ${photo.dataset.width}px)`;
    picture.style.maxHeight = `min(100%, ${photo.dataset.height}px)`;
    frame.append(picture);
    nativeTrack.append(frame);
    return picture;
  });
  stack.append(nativeTrack);
  image = nativeImages[0];
  function sync() {
    if (!viewer.open || closing || nativeNavigation || !nativeTrack.clientWidth) return;
    const index = Math.max(0, Math.min(photos.length - 1, Math.round(nativeTrack.scrollLeft / nativeTrack.clientWidth)));
    image.removeAttribute('id');
    image = nativeImages[index];
    image.id = 'viewer-image';
    current = index;
    updateMetadata(index);
  }
  const settle = () => { nativeNavigation = false; sync(); };
  nativeTrack.addEventListener('pointerdown', () => { nativeNavigation = false; transitions.cancel(); }, { passive: true });
  nativeTrack.addEventListener('scroll', () => {
    sync();
    clearTimeout(nativeScrollTimer);
    nativeScrollTimer = setTimeout(settle, 160);
  }, { passive: true });
  nativeTrack.addEventListener('scrollend', settle);
  return nativeImages;
}

async function show(index, animate = true) {
  if (closing) return false;
  current = (index + photos.length) % photos.length;
  const target = current;
  const request = transitions.request();
  const photo = photos[target];
  const prepared = nativeTouch ? ensureNativeTrack()[target] : new Image();
  prepared.loading = 'eager';
  prepared.sizes = `${Math.max(1, Math.floor(Math.min(window.innerWidth - (window.innerWidth > 600 ? 210 : 24), (window.innerHeight - 200) * photo.dataset.width / photo.dataset.height, photo.dataset.width)))}px`;
  prepared.srcset = photo.dataset.srcset;
  prepared.src = photo.dataset.full;
  try { await prepared.decode(); } catch { /* Keep alt text available if a file cannot be decoded. */ }
  if (!await request.ready() || closing) return false;

  if (nativeTouch) {
    image.removeAttribute('id');
    image = prepared;
    image.id = 'viewer-image';
    if (viewer.open) {
      nativeNavigation = true;
      nativeTrack.scrollTo({ left: target * nativeTrack.clientWidth, behavior: animate && !reducedMotion.matches ? 'smooth' : 'instant' });
    }
    nativeImages[(target + 1) % photos.length].loading = 'eager';
    nativeImages[(target - 1 + photos.length) % photos.length].loading = 'eager';
    updateMetadata(target);
    return true;
  }
  clearTimeout(fadeTimer);
  stack.querySelectorAll('.viewer-image-previous').forEach(previous => previous.remove());
  const fade = animate && viewer.open && displayed >= 0 && displayed !== target && !reducedMotion.matches;
  const previous = image;
  const wasFocused = document.activeElement === previous;
  previous.removeAttribute('id');
  prepared.id = 'viewer-image';
  prepared.alt = photo.dataset.title;
  prepared.tabIndex = -1;
  prepared.style.maxWidth = `min(100%, ${photo.dataset.width}px)`;
  prepared.style.maxHeight = `min(100%, ${photo.dataset.height}px)`;
  // Render the already-decoded Image itself; do not clone/reload the displayed image.
  stack.append(prepared);
  image = prepared;
  if (wasFocused) image.focus({ preventScroll: true });
  if (fade) {
    const layer = document.createElement('div');
    layer.className = 'viewer-image-previous';
    layer.setAttribute('aria-hidden', 'true');
    previous.removeAttribute('tabindex');
    previous.alt = '';
    layer.append(previous);
    stack.append(layer);
    // Only fade the opaque outgoing scene. Two semi-transparent scenes cause a white flash.
    layer.getBoundingClientRect();
    layer.classList.add('is-fading');
    fadeTimer = setTimeout(() => layer.remove(), 420);
    transitions.hold(420);
  } else {
    previous.remove();
    transitions.hold(0);
  }
  updateMetadata(target);
  return true;
}

function finishClose() {
  // Reveal the decoded destination synchronously, before removing the top layer.
  // The dialog close event is queued and can run after a paint.
  if (morphTarget) morphTarget.style.visibility = targetVisibility;
  if (viewer.open) viewer.close();
  cleanupViewer();
}

async function closeViewer() {
  if (!viewer.open || closing) return;
  closing = true;
  transitions.cancel();
  clearTimeout(fadeTimer);
  stack.querySelectorAll('.viewer-image-previous').forEach(previous => previous.remove());
  if (displayed >= 0) current = displayed;
  rememberPhoto(photos[current].dataset.id, { fullscreen: false });
  const restoration = { index: current, ready: Promise.resolve() };
  window.dispatchEvent(new CustomEvent('portfolio:viewer-close', { detail: restoration }));
  await restoration.ready;
  if (!viewer.open || !closing) return;
  const inline = photos[current].querySelector('img');
  if (!reducedMotion.matches && image.animate && inline?.naturalWidth) {
    const from = containImageRect(image.getBoundingClientRect(), image.naturalWidth, image.naturalHeight);
    const to = containImageRect(inline.getBoundingClientRect(), inline.naturalWidth, inline.naturalHeight);
    if (from.width && from.height && to.width && to.height) {
      morphTarget = inline;
      targetVisibility = inline.style.visibility;
      inline.style.visibility = 'hidden';
      Object.assign(image.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, maxWidth: 'none', maxHeight: 'none', transform: 'none', transformOrigin: '0 0', zIndex: '2' });
      morphParent = image.parentNode;
      morphSibling = image.nextSibling;
      stack.append(image); // Escape the native scroll track's clipping during the morph.
      viewer.style.removeProperty('background-color');
      viewer.style.removeProperty('--swipe-progress');
      viewer.classList.remove('is-touch-dragging');
      viewer.classList.add('is-morphing');
      viewer.classList.remove('is-visible');
      morph = image.animate([
        { transform: 'translate(0, 0) scale(1, 1)' },
        { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})` },
      ], { duration: 380, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
      try { await morph.finished; } catch { /* An external close may cancel the animation. */ }
      finishClose();
      return;
    }
  }
  viewer.classList.remove('is-visible');
  if (reducedMotion.matches) finishClose();
  else closeTimer = setTimeout(finishClose, 300);
}

photos.forEach((photo, index) => photo.addEventListener('click', async event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  closing = false;
  if (!await show(index, false)) return;
  photo.querySelector('img').focus({ preventScroll: true });
  viewer.showModal();
  if (nativeTouch) { nativeNavigation = true; nativeTrack.scrollLeft = index * nativeTrack.clientWidth; }
  image.focus({ preventScroll: true });
  viewer.getBoundingClientRect();
  viewer.classList.add('is-visible');
  rememberPhoto(photo.dataset.id, { fullscreen: true });
  window.dispatchEvent(new Event('portfolio:viewer-open'));
}));
document.querySelector('.close').addEventListener('click', closeViewer);
document.querySelector('.previous').addEventListener('click', () => show(current - 1));
document.querySelector('.next').addEventListener('click', () => show(current + 1));
detailsToggle.addEventListener('click', () => {
  const expanded = detailsToggle.getAttribute('aria-expanded') !== 'true';
  detailsToggle.setAttribute('aria-expanded', String(expanded));
  details.hidden = !expanded;
});
viewer.addEventListener('cancel', event => { event.preventDefault(); closeViewer(); });
function cleanupViewer() {
  clearTimeout(closeTimer);
  clearTimeout(fadeTimer);
  transitions.cancel();
  morph?.cancel();
  morph = null;
  if (morphTarget) morphTarget.style.visibility = targetVisibility;
  morphTarget = null;
  if (morphParent) morphParent.insertBefore(image, morphSibling);
  morphParent = morphSibling = null;
  closing = false;
  displayed = -1;
  clearTimeout(swipeRestoreTimer);
  nativeNavigation = false;
  viewer.style.removeProperty('background-color');
  viewer.style.removeProperty('--swipe-progress');
  viewer.classList.remove('is-visible', 'is-morphing', 'is-touch-dragging');
  stack.querySelectorAll('.viewer-image-previous').forEach(previous => previous.remove());
  image.removeAttribute('style');
  if (nativeTouch) {
    const photo = photos[current];
    image.style.maxWidth = `min(100%, ${photo.dataset.width}px)`;
    image.style.maxHeight = `min(100%, ${photo.dataset.height}px)`;
  } else { image.removeAttribute('srcset'); image.removeAttribute('src'); }
  photos[current]?.querySelector('img')?.focus({ preventScroll: true });
}
viewer.addEventListener('close', () => { if (!viewer.open && closing) cleanupViewer(); });
window.addEventListener('resize', () => { if (viewer.open && !closing) show(current, false); });
viewer.addEventListener('keydown', event => {
  if (closing || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (event.key === 'd') { event.preventDefault(); event.stopPropagation(); if (!detailsToggle.hidden) detailsToggle.click(); return; }
  if (event.key === 'f') { event.preventDefault(); event.stopPropagation(); closeViewer(); return; }
  const index = navigate(event.key, current, photos.length);
  if (index === null) return;
  event.preventDefault();
  show(index);
});
function resetSwipe() {
  image.style.transition = reducedMotion.matches ? 'none' : 'transform 220ms cubic-bezier(.22,.61,.36,1)';
  image.style.transform = 'none';
  viewer.style.backgroundColor = 'white';
  viewer.style.setProperty('--swipe-progress', '0');
  swipeRestoreTimer = setTimeout(() => {
    if (!closing) {
      viewer.classList.remove('is-touch-dragging');
      viewer.style.removeProperty('background-color');
      viewer.style.removeProperty('--swipe-progress');
      image.style.removeProperty('transform');
      image.style.removeProperty('transition');
    }
  }, reducedMotion.matches ? 0 : 230);
}
stack.addEventListener('touchstart', event => {
  if (closing || event.touches.length !== 1) { touch = null; return; }
  clearTimeout(swipeRestoreTimer);
  transitions.cancel();
  touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: performance.now(), axis: null, dy: 0 };
}, { passive: true });
stack.addEventListener('touchmove', event => {
  if (!touch || closing || event.touches.length !== 1) return;
  const dx = event.touches[0].clientX - touch.x;
  const dy = event.touches[0].clientY - touch.y;
  if (!touch.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 7) touch.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  if (touch.axis !== 'y') return; // Horizontal movement stays native scroll + snap.
  if (event.cancelable) event.preventDefault();
  touch.dy = dy;
  const drag = dy > 0 ? dy : dy * .2;
  image.style.transition = 'none';
  image.style.transform = `translateY(${drag}px) scale(${1 - Math.min(Math.max(dy, 0) / window.innerHeight, 1) * .12})`;
  viewer.classList.add('is-touch-dragging');
  const progress = Math.min(Math.max(dy, 0) / window.innerHeight, .7);
  viewer.style.backgroundColor = `rgba(255,255,255,${1 - progress})`;
  viewer.style.setProperty('--swipe-progress', String(progress));
}, { passive: false });
stack.addEventListener('touchend', event => {
  if (!touch || closing) return;
  const dy = event.changedTouches[0].clientY - touch.y;
  const velocity = dy / Math.max(1, performance.now() - touch.time);
  if (touch.axis === 'y') {
    if (dy > Math.max(75, window.innerHeight * .18) || (dy > 28 && velocity > .55)) closeViewer();
    else resetSwipe();
  }
  touch = null;
}, { passive: true });
stack.addEventListener('touchcancel', () => { if (touch?.axis === 'y') resetSwipe(); touch = null; }, { passive: true });
if (photos.length && wantsFullscreen()) photos[restorePhotoIndex(photos)].click();
