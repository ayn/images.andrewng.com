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
    photos[(current + 1) % photos.length].querySelector('img').loading = 'eager';
  }

  async function go(index, instant = false) {
    const target = (index + photos.length) % photos.length;
    requested = target;
    const request = transitions.request();
    const next = slides[target];
    const image = photos[target].querySelector('img');
    image.loading = 'eager';
    try { await image.decode(); } catch { /* Let the browser display a failed image's alt text. */ }
    if (!await request.ready(instant)) return;
    if (nativeTouch) {
      nativeNavigation = true;
      track.scrollTo({ left: target * track.clientWidth, behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' });
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
    const { width, height } = track.getBoundingClientRect();
    photos.forEach(photo => {
      const displayed = Math.min(width, height * Number(photo.dataset.width) / Number(photo.dataset.height), Number(photo.dataset.width));
      photo.querySelector('img').sizes = `${Math.max(1, Math.floor(displayed))}px`;
    });
  }

  slides[initial].classList.add('is-active', 'is-visible');
  track.classList.add('is-enhanced');
  if (nativeTouch) track.classList.add('is-native');
  slideshow.querySelector('.slideshow-controls').hidden = false;
  slideshow.querySelector('[data-slide-previous]').addEventListener('click', () => { pauseForInteraction(); go(requested - 1); });
  slideshow.querySelector('[data-slide-next]').addEventListener('click', () => { pauseForInteraction(); go(requested + 1); });
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
  document.addEventListener('keydown', event => {
    if (document.querySelector('.viewer')?.open || event.altKey || event.ctrlKey || event.metaKey ||
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
  window.addEventListener('portfolio:viewer-open', () => { pauseForInteraction(); transitions.cancel(); requested = current; });
  document.addEventListener('click', event => { if (event.target.closest('.sidebar a')) pauseForInteraction(); });
  window.addEventListener('resize', sizeImages);
  sizeImages();
  if (nativeTouch) track.scrollLeft = initial * track.clientWidth;
  update();
  if (!document.hidden && autoplayPermitted(reducedMotion.matches)) setPlaying(true);
}
