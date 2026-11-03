import { createPhotoNavigation } from './navigation.mjs';
import { renderExif } from './exif-format.mjs';
import { restorePhotoIndex, rememberPhoto, navigateAlbum, wantsFullscreen } from './album-navigation.mjs';

const navigate = createPhotoNavigation();
const photos = [...document.querySelectorAll('[data-photo]')];
const viewer = document.querySelector('.viewer');
const image = document.querySelector('#viewer-image');
const stack = document.querySelector('.viewer-photo-stack');
const details = document.querySelector('#photo-details');
const detailsToggle = document.querySelector('.details-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let current = 0;
let displayed = -1;
let revision = 0;
let closeTimer;
let fadeTimer;
let closing = false;
let touch;

async function show(index, animate = true) {
  current = (index + photos.length) % photos.length;
  const target = current;
  const version = ++revision;
  const photo = photos[target];
  const sizes = `${Math.max(1, Math.floor(Math.min(window.innerWidth - (window.innerWidth > 600 ? 210 : 24), (window.innerHeight - 200) * photo.dataset.width / photo.dataset.height, photo.dataset.width)))}px`;
  const prepared = new Image();
  prepared.sizes = sizes;
  prepared.srcset = photo.dataset.srcset;
  prepared.src = photo.dataset.full;
  try { await prepared.decode(); } catch { /* The photograph's alt text remains available on errors. */ }
  if (version !== revision || closing) return false;

  clearTimeout(fadeTimer);
  stack.querySelectorAll('.viewer-image-previous').forEach(previous => previous.remove());
  const fade = animate && viewer.open && displayed >= 0 && displayed !== target && !reducedMotion.matches;
  let previous;
  if (fade) {
    previous = image.cloneNode();
    previous.removeAttribute('id');
    previous.removeAttribute('tabindex');
    previous.removeAttribute('srcset');
    previous.src = image.currentSrc || image.src;
    previous.alt = '';
    previous.setAttribute('aria-hidden', 'true');
    previous.className = 'viewer-image-previous';
    previous.style.opacity = '1';
    stack.append(previous);
    image.style.opacity = '0';
  }
  image.sizes = sizes;
  image.srcset = photo.dataset.srcset;
  image.src = photo.dataset.full;
  image.alt = photo.dataset.title;
  image.style.maxWidth = `min(100%, ${photo.dataset.width}px)`;
  image.style.maxHeight = `min(100%, ${photo.dataset.height}px)`;
  if (fade) {
    image.getBoundingClientRect();
    image.style.opacity = '1';
    previous.style.opacity = '0';
    fadeTimer = setTimeout(() => previous.remove(), 420);
  } else image.style.opacity = '1';
  displayed = target;
  rememberPhoto(photo.dataset.id);
  document.querySelector('#position').textContent = `${target + 1} / ${photos.length}`;
  const exif = JSON.parse(photo.dataset.exif || '{}');
  const hasExif = renderExif(details, exif);
  detailsToggle.hidden = !hasExif;
  details.hidden = !hasExif || detailsToggle.getAttribute('aria-expanded') !== 'true';
  return true;
}

function closeViewer() {
  if (!viewer.open || closing) return;
  closing = true;
  ++revision;
  if (displayed >= 0) current = displayed;
  rememberPhoto(photos[current].dataset.id, { fullscreen: false });
  // Prepare the matching inline photograph underneath the closing overlay.
  window.dispatchEvent(new CustomEvent('portfolio:viewer-close', { detail: { index: current } }));
  viewer.classList.remove('is-visible');
  if (reducedMotion.matches) viewer.close();
  else closeTimer = setTimeout(() => viewer.close(), 300);
}

photos.forEach((photo, index) => photo.addEventListener('click', async event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  closing = false;
  if (!await show(index, false)) return;
  photo.querySelector("img").focus({ preventScroll: true });
  viewer.showModal();
  image.focus({ preventScroll: true });
  viewer.getBoundingClientRect();
  viewer.classList.add('is-visible');
  rememberPhoto(photo.dataset.id, { fullscreen: true });
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
viewer.addEventListener('close', () => {
  clearTimeout(closeTimer);
  clearTimeout(fadeTimer);
  ++revision;
  closing = false;
  displayed = -1;
  viewer.classList.remove('is-visible');
  stack.querySelectorAll('.viewer-image-previous').forEach(previous => previous.remove());
  image.removeAttribute('srcset');
  image.removeAttribute('src');
  photos[current]?.querySelector('img')?.focus({ preventScroll: true });
});
window.addEventListener('resize', () => { if (viewer.open && !closing) show(current, false); });
viewer.addEventListener('keydown', event => {
  if (closing || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (event.key === 'j' || event.key === 'k') {
    event.preventDefault();
    event.stopPropagation();
    navigateAlbum(event.key === 'j' ? 1 : -1, true);
    return;
  }
  if (event.key === 'f') { event.preventDefault(); event.stopPropagation(); closeViewer(); return; }
  const index = navigate(event.key, current, photos.length);
  if (index === null) return;
  event.preventDefault();
  show(index);
});
stack.addEventListener('touchstart', event => {
  touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
stack.addEventListener('touchend', event => {
  if (!touch || closing) return;
  const dx = event.changedTouches[0].clientX - touch.x;
  const dy = event.changedTouches[0].clientY - touch.y;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) show(current + (dx < 0 ? 1 : -1));
  touch = null;
}, { passive: true });

if (photos.length && wantsFullscreen()) photos[restorePhotoIndex(photos)].click();
