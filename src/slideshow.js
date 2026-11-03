import { createPhotoBuffer } from './photo-preload.mjs';
import { preloadNeighborAlbums } from './album-preload.mjs';
import { createPhotoNavigation } from './navigation.mjs';
import { createPhotoTransitionGate, autoplayPermitted, rememberAutoplayPause, clearAutoplayPause } from './photo-motion.mjs';
import { restorePhotoIndex, rememberPhoto, navigateAlbum } from './album-navigation.mjs';

const slideshow = document.querySelector('.slideshow');
if (slideshow) {
  const nativeTouch = window.matchMedia('(any-pointer: coarse)').matches;
  const track = slideshow.querySelector('[data-slide-track]');
  const slides = [...track.querySelectorAll('.slide')];
  const photos = slides.map(slide => slide.querySelector('[data-photo]'));
  const counter = slideshow.querySelector('[data-slide-count]');
  const play = slideshow.querySelector('[data-slide-play]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const navigate = createPhotoNavigation();
  const initial = restorePhotoIndex(photos);
  let current = initial;
  let requested = initial;
  const transitions = createPhotoTransitionGate();
  let timer;
  let cleanup;
  let nativeNavigation = false;
  let scrollTimer;
  let cancelAlbums;
  const browsing = () => !document.hidden && !document.querySelector('.viewer')?.open;
  function imageSizes(photo) {
    const data = photo.dataset || photo;
    const { width, height } = track.getBoundingClientRect();
    return `${Math.max(1, Math.floor(Math.min(width, height * data.width / data.height, data.width)))}px`;
  }
  const buffer = createPhotoBuffer({ photos, sizesFor: imageSizes, imageFor: index => photos[index].querySelector('img'), active: browsing });
  function warmAlbums() {
    cancelAlbums?.();
    const image = photos[current].querySelector('img');
    cancelAlbums = preloadNeighborAlbums({ sizesFor: imageSizes, ready: image.decode(), active: browsing });
  }

  function setPlaying(playing) {
    clearInterval(timer);
    timer = undefined;
    play.textContent = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', String(playing));
    counter.setAttribute('aria-live', playing ? 'off' : 'polite');
    if (playing) timer = setInterval(() => go(requested + 1), 6000);
  }

  function pauseForInteraction() { rememberAutoplayPause(); setPlaying(false); }

  function update() {
    rememberPhoto(photos[current].dataset.id);
    const focused = photos.find(photo => photo === document.activeElement || photo.contains(document.activeElement));
    const imageFocused = document.activeElement?.tagName === 'IMG';
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
    if (focused && focused !== photos[current]) {
      (imageFocused ? photos[current].querySelector('img') : photos[current]).focus({ preventScroll: true });
    }
    slides.forEach((slide, index) => {
      slide.setAttribute('aria-hidden', String(index !== current));
      photos[index].tabIndex = index === current ? 0 : -1;
    });
    buffer.update(current);
  }

  async function go(index, instant = false) {
    const target = (index + photos.length) % photos.length;
    requested = target;
    buffer.pause();
    const request = transitions.request();
    const next = slides[target];
    const image = photos[target].querySelector('img');
    image.loading = 'eager';
    image.fetchPriority = 'high';
    try { await image.decode(); } catch { /* Let the browser display a failed image's alt text. */ }
    if (!await request.ready(instant)) return;
    if (nativeTouch) {
      nativeNavigation = true;
      track.scrollTo({ left: target * track.clientWidth, behavior: instant || reducedMotion.matches || Math.abs(target - current) !== 1 ? 'instant' : 'smooth' });
      current = target;
      update();
      return;
    }
    if (instant) track.classList.add('is-restoring');
    clearTimeout(cleanup);
    const previous = slides[current];
    slides.forEach(slide => {
      if (slide !== previous && slide !== next) slide.classList.remove('is-active', 'is-leaving', 'is-visible');
    });
    next.classList.remove('is-leaving');
    next.classList.add('is-active');
    if (target !== current && !instant && !reducedMotion.matches) {
      next.classList.add('is-visible');
      previous.classList.add('is-leaving');
      previous.classList.remove('is-active');
      // Commit the starting opacity before transitioning the two photographs.
      next.getBoundingClientRect();
      previous.classList.remove('is-visible');
      next.classList.add('is-visible');
      transitions.hold(420);
      cleanup = setTimeout(() => {
        if (!previous.classList.contains('is-active')) previous.classList.remove('is-leaving', 'is-visible');
      }, 420);
    } else {
      transitions.hold(0);
      slides.forEach(slide => { if (slide !== next) slide.classList.remove('is-active', 'is-leaving', 'is-visible'); });
      next.classList.add('is-visible');
    }
    if (instant) {
      next.getBoundingClientRect(); // Commit the fully visible destination before the morph starts.
      track.classList.remove('is-restoring');
    }
    current = target;
    update();
  }

  function sizeImages() {
    photos.forEach(photo => { photo.querySelector('img').sizes = imageSizes(photo); });
  }

  slides[initial].classList.add('is-active', 'is-visible');
  track.classList.add('is-enhanced');
  if (nativeTouch) track.classList.add('is-native');
  slideshow.querySelector('.slideshow-controls').hidden = false;
  slideshow.querySelector('[data-slide-previous]').addEventListener('click', () => { pauseForInteraction(); go(requested - 1); });
  slideshow.querySelector('[data-slide-next]').addEventListener('click', () => { pauseForInteraction(); go(requested + 1); });
  slideshow.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => {
    button.closest('[popover]').hidePopover();
    pauseForInteraction();
    go(button.dataset.jump === 'first' ? 0 : photos.length - 1);
  }));
  play.addEventListener('click', () => { if (timer) pauseForInteraction(); else { clearAutoplayPause(); setPlaying(true); } });
  slideshow.querySelector('[data-slide-enlarge]').addEventListener('click', () => { pauseForInteraction(); photos[current].click(); });
  slideshow.addEventListener('click', event => { if (event.target.closest('[data-photo]')) pauseForInteraction(); });
  for (const event of ['pointerdown', 'wheel']) track.addEventListener(event, pauseForInteraction, { passive: true });
  if (nativeTouch) {
    const syncScroll = () => {
      const index = Math.max(0, Math.min(photos.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      if (index !== current) { current = index; update(); }
      if (!nativeNavigation) requested = current;
    };
    const settle = () => { nativeNavigation = false; syncScroll(); requested = current; };
    track.addEventListener('pointerdown', () => { transitions.cancel(); nativeNavigation = false; requested = current; }, { passive: true });
    track.addEventListener('scroll', () => {
      syncScroll();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(settle, 160);
    }, { passive: true });
    track.addEventListener('scrollend', settle);
  }
  slideshow.addEventListener('focusin', event => { if (event.target !== play) setPlaying(false); });
  window.addEventListener('portfolio:help-open', () => setPlaying(false));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { setPlaying(false); buffer.pause(); cancelAlbums?.(); }
    else if (browsing()) { buffer.update(current); warmAlbums(); }
  });
  document.addEventListener('keydown', event => {
    if (document.querySelector('.viewer')?.open || document.querySelector('.photo-jump-menu:popover-open') || event.altKey || event.ctrlKey || event.metaKey ||
        event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'j' || event.key === 'k') {
      event.preventDefault();
      pauseForInteraction();
      navigateAlbum(event.key === 'j' ? 1 : -1);
      return;
    }
    if (event.key === 'f') { event.preventDefault(); pauseForInteraction(); photos[current].click(); return; }
    const index = navigate(event.key, requested, photos.length);
    if (index === null) return;
    event.preventDefault();
    pauseForInteraction();
    go(index);
  });
  window.addEventListener('portfolio:viewer-close', event => {
    setPlaying(false);
    event.detail.ready = go(event.detail.index, true).then(() => {
      if (!document.querySelector('.viewer')?.open) photos[current].querySelector('img').focus({ preventScroll: true });
    });
  });
  window.addEventListener('portfolio:viewer-open', () => { pauseForInteraction(); transitions.cancel(); requested = current; buffer.pause(); cancelAlbums?.(); });
  document.querySelector('.viewer')?.addEventListener('close', () => { buffer.update(current); warmAlbums(); });
  document.addEventListener('click', event => { if (event.target.closest('.sidebar a')) pauseForInteraction(); });
  window.addEventListener('resize', () => { sizeImages(); if (browsing()) buffer.update(current); });
  sizeImages();
  if (nativeTouch) track.scrollLeft = initial * track.clientWidth;
  update();
  warmAlbums();
  if (!document.hidden && autoplayPermitted(reducedMotion.matches)) setPlaying(true);
}
