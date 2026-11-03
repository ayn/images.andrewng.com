export function nearbyPhotoIndices(index, count, connection) {
  if (count < 2 || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) return [];
  const current = ((index % count) + count) % count;
  const offsets = connection?.effectiveType === '3g' ? [1] : [1, 2, -1];
  return [...new Set(offsets.map(offset => (current + offset + count) % count))].filter(target => target !== current);
}

export function canPreloadAlbums(connection) {
  return !connection?.saveData && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType);
}

export function schedulePhotoIdle(callback) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(callback);
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 250);
  return () => clearTimeout(id);
}

export function createPhotoCache({ makeImage = () => new Image(), limit = 6 } = {}) {
  const cache = new Map();
  return {
    get(photo, sizes, priority = 'low') {
      const data = photo.dataset || photo;
      const key = `${data.srcset}|${sizes}`;
      const image = cache.get(key) || makeImage();
      cache.delete(key);
      cache.set(key, image);
      while (cache.size > limit) cache.delete(cache.keys().next().value);
      image.decoding = 'async';
      image.fetchPriority = priority;
      image.loading = 'eager';
      image.sizes = sizes;
      if ((image.getAttribute?.('srcset') ?? image.srcset) !== data.srcset) image.srcset = data.srcset;
      if ((image.getAttribute?.('src') ?? image.src) !== data.full) image.src = data.full;
      return image;
    },
    get size() { return cache.size; },
  };
}

// Shared across inline browsing, fullscreen, and neighboring-album previews.
export const photoCache = createPhotoCache();

export function createPhotoBuffer({ photos, sizesFor, imageFor, active = () => !document.hidden,
  connection = () => globalThis.navigator?.connection, schedule = schedulePhotoIdle, cache = photoCache }) {
  let cancelIdle;
  let revision = 0;
  let promoted = new Set();
  return {
    update(index) {
      cancelIdle?.();
      const version = ++revision;
      const selected = imageFor?.(index);
      if (selected) { selected.loading = 'eager'; selected.fetchPriority = 'high'; }
      const wanted = new Set([selected, ...nearbyPhotoIndices(index, photos.length, connection()).map(i => imageFor?.(i))].filter(Boolean));
      for (const image of promoted) if (!wanted.has(image)) { image.loading = 'lazy'; image.fetchPriority = 'auto'; }
      promoted = wanted;
      const start = () => {
        if (version !== revision || !active()) return;
        cancelIdle = schedule(() => {
          if (version !== revision || !active()) return;
          for (const target of nearbyPhotoIndices(index, photos.length, connection())) {
            const image = imageFor?.(target) || cache.get(photos[target], sizesFor(photos[target]), 'low');
            image.fetchPriority = 'low';
            image.loading = 'eager';
            image.decode?.().catch(() => {});
          }
        });
      };
      if (selected && !selected.complete) selected.decode().then(start, () => {});
      else start();
    },
    pause() { ++revision; cancelIdle?.(); },
  };
}
