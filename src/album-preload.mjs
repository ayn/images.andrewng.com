import { albumDestination, photoIdFromPath, savedPhoto, selectedPhotoIndex } from './album-navigation.mjs';
import { canPreloadAlbums, photoCache, schedulePhotoIdle } from './photo-preload.mjs';

function readAlbumPhotos(html) {
  const template = document.createElement('template');
  template.innerHTML = html; // Inert content: never attach/fetch its images or scripts.
  return [...template.content.querySelectorAll('[data-photo]')].map(photo => ({ ...photo.dataset }));
}

export function createAlbumWarmer({ request = (...args) => fetch(...args), parsePhotos = readAlbumPhotos,
  preparePhoto = (photo, sizes) => photoCache.get(photo, sizes, 'low'),
  connection = () => globalThis.navigator?.connection, schedule = schedulePhotoIdle } = {}) {
  const previews = new Map();
  return ({ destinations, sizesFor, ready = Promise.resolve(),
    active = () => !document.hidden && !document.querySelector('.viewer')?.open }) => {
    let cancelIdle;
    const controller = new AbortController();
    const allowed = () => !controller.signal.aborted && active() && canPreloadAlbums(connection());
    ready.then(() => {
      if (!allowed()) return;
      cancelIdle = schedule(async () => {
        // Enforce the budget even if a future caller supplies every album.
        for (const destination of [...new Set(destinations)].slice(0, 2)) {
          if (!allowed()) return;
          try {
            let selected = previews.get(destination);
            if (!selected) {
              const response = await request(destination, { priority: 'low', signal: controller.signal });
              if (!allowed()) return;
              if (!response.ok) continue;
              const html = await response.text();
              if (!allowed()) return;
              const photos = parsePhotos(html);
              selected = photos[selectedPhotoIndex(photos.map(photo => photo.id), '', null, photoIdFromPath(destination))];
              if (selected) previews.set(destination, selected);
            }
            if (selected && allowed()) preparePhoto(selected, sizesFor(selected)).decode().catch(() => {});
          } catch { /* Speculation is optional; navigation still fetches normally. */ }
        }
      });
    }, () => {});
    return () => { cancelIdle?.(); controller.abort(); };
  };
}

const warmAlbums = createAlbumWarmer();
export function preloadNeighborAlbums(options) {
  const paths = [...document.querySelectorAll('nav[aria-label="Albums"] a')].map(link => new URL(link.href).pathname);
  const remembered = Object.fromEntries(paths.map(path => [path, savedPhoto(path)]));
  const destinations = [1, -1].map(direction => albumDestination(paths, location.pathname, direction, remembered)).filter(Boolean);
  return warmAlbums({ ...options, destinations });
}
