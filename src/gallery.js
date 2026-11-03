const photos = [...document.querySelectorAll('[data-photo]')];
const viewer = document.querySelector('.viewer');
const image = document.querySelector('#viewer-image');
let current = 0;
let origin;
const details = document.querySelector('#photo-details');
const detailsToggle = document.querySelector('.details-toggle');

function show(index) {
  current = (index + photos.length) % photos.length;
  const photo = photos[current];
  image.sizes = `${Math.min(window.innerWidth - (window.innerWidth > 600 ? 210 : 24), (window.innerHeight - 160) * photo.dataset.width / photo.dataset.height, photo.dataset.width)}px`;
  image.srcset = photo.dataset.srcset;
  image.src = photo.dataset.full;
  image.alt = photo.dataset.title;
  // Never enlarge beyond the resolution Flickr actually made available.
  image.style.maxWidth = `min(100%, ${photo.dataset.width}px)`;
  image.style.maxHeight = `min(100%, ${photo.dataset.height}px)`;
  document.querySelector('#position').textContent = `${current + 1} / ${photos.length}`;
  document.querySelector('#photo-title').textContent = photo.dataset.title;
  const flickrLink = document.querySelector('#photo-link');
  flickrLink.hidden = !photo.dataset.flickr;
  if (photo.dataset.flickr) flickrLink.href = photo.dataset.flickr;
  const exif = JSON.parse(photo.dataset.exif || '{}');
  const aperture = exif.aperture ? (/^f\//i.test(exif.aperture) ? exif.aperture : `f/${exif.aperture}`) : '';
  const iso = exif.iso ? `ISO ${exif.iso}` : '';
  details.textContent = [exif.camera, exif.lens, exif.focalLength, aperture, exif.shutter, iso].filter(Boolean).join(' · ');
  detailsToggle.hidden = !details.textContent;
  details.hidden = !details.textContent || detailsToggle.getAttribute('aria-expanded') !== 'true';
}
photos.forEach((photo, index) => photo.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  origin = photo;
  viewer.showModal();
  show(index);
}));
document.querySelector('.close').addEventListener('click', () => viewer.close());
document.querySelector('.previous').addEventListener('click', () => show(current - 1));
document.querySelector('.next').addEventListener('click', () => show(current + 1));
detailsToggle.addEventListener('click', () => {
  const expanded = detailsToggle.getAttribute('aria-expanded') !== 'true';
  detailsToggle.setAttribute('aria-expanded', String(expanded));
  details.hidden = !expanded;
});
viewer.addEventListener('close', () => { image.removeAttribute('srcset'); image.removeAttribute('src'); origin?.focus({ preventScroll: true }); });
window.addEventListener('resize', () => { if (viewer.open) show(current); });
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
let touch;
image.addEventListener('touchstart', event => { touch = event.touches.length === 1 ? event.touches[0].clientX : null; }, { passive: true });
image.addEventListener('touchend', event => {
  if (touch == null) return;
  const distance = event.changedTouches[0].clientX - touch;
  if (Math.abs(distance) > 60) show(current + (distance < 0 ? 1 : -1));
  touch = null;
}, { passive: true });
