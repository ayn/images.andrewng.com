import { createPhotoNavigation } from './navigation.mjs';

const slideshow = document.querySelector('.slideshow');
if (slideshow) {
  const track = slideshow.querySelector('[data-slide-track]');
  const slides = [...track.querySelectorAll('.slide')];
  const photos = slides.map(slide => slide.querySelector('[data-photo]'));
  const counter = slideshow.querySelector('[data-slide-count]');
  const play = slideshow.querySelector('[data-slide-play]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const navigate = createPhotoNavigation();
  let current = 0;
  let requested = 0;
  let revision = 0;
  let timer;
  let cleanup;
  let touch;

  function setPlaying(playing) {
    clearInterval(timer);
    timer = undefined;
    play.textContent = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', String(playing));
    counter.setAttribute('aria-live', playing ? 'off' : 'polite');
    if (playing) timer = setInterval(() => go(requested + 1), 6000);
  }

  function update() {
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
    const version = ++revision;
    const next = slides[target];
    const image = photos[target].querySelector('img');
    image.loading = 'eager';
    try { await image.decode(); } catch { /* Let the browser display a failed image's alt text. */ }
    if (version !== revision) return;
    clearTimeout(cleanup);
    const previous = slides[current];
    slides.forEach(slide => {
      if (slide !== previous && slide !== next) slide.classList.remove('is-active', 'is-leaving', 'is-visible');
    });
    next.classList.remove('is-leaving');
    next.classList.add('is-active');
    if (target !== current && !instant && !reducedMotion.matches) {
      next.classList.remove('is-visible');
      previous.classList.add('is-leaving');
      previous.classList.remove('is-active');
      // Commit the starting opacity before transitioning the two photographs.
      next.getBoundingClientRect();
      previous.classList.remove('is-visible');
      next.classList.add('is-visible');
      cleanup = setTimeout(() => {
        if (!previous.classList.contains('is-active')) previous.classList.remove('is-leaving', 'is-visible');
      }, 420);
    } else {
      slides.forEach(slide => { if (slide !== next) slide.classList.remove('is-active', 'is-leaving', 'is-visible'); });
      next.classList.add('is-visible');
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

  slides[0].classList.add('is-active', 'is-visible');
  track.classList.add('is-enhanced');
  slideshow.querySelector('.slideshow-controls').hidden = false;
  slideshow.querySelector('[data-slide-previous]').addEventListener('click', () => { setPlaying(false); go(requested - 1); });
  slideshow.querySelector('[data-slide-next]').addEventListener('click', () => { setPlaying(false); go(requested + 1); });
  play.addEventListener('click', () => setPlaying(!timer));
  slideshow.querySelector('[data-slide-enlarge]').addEventListener('click', () => { setPlaying(false); photos[current].click(); });
  slideshow.addEventListener('click', event => { if (event.target.closest('[data-photo]')) setPlaying(false); });
  for (const event of ['pointerdown', 'wheel']) track.addEventListener(event, () => setPlaying(false), { passive: true });
  track.addEventListener('touchstart', event => {
    touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  track.addEventListener('touchend', event => {
    if (!touch) return;
    const dx = event.changedTouches[0].clientX - touch.x;
    const dy = event.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) { setPlaying(false); go(requested + (dx < 0 ? 1 : -1)); }
    touch = null;
  }, { passive: true });
  slideshow.addEventListener('focusin', event => { if (event.target !== play) setPlaying(false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
  document.addEventListener('keydown', event => {
    if (document.querySelector('.viewer')?.open || event.altKey || event.ctrlKey || event.metaKey ||
        event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'f') { event.preventDefault(); setPlaying(false); photos[current].click(); return; }
    const index = navigate(event.key, requested, photos.length);
    if (index === null) return;
    event.preventDefault();
    setPlaying(false);
    go(index);
  });
  window.addEventListener('portfolio:viewer-close', event => {
    setPlaying(false);
    go(event.detail.index, true).then(() => {
      if (!document.querySelector('.viewer')?.open) photos[current].querySelector('img').focus({ preventScroll: true });
    });
  });
  window.addEventListener('resize', sizeImages);
  sizeImages();
  update();
}
