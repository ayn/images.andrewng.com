const memoryKey = path => `images:last-photo:${path}`;

export function selectedPhotoIndex(ids, hash = '', savedId = null) {
  const explicit = new URLSearchParams(hash.replace(/^#/, '')).get('photo');
  for (const id of [explicit, savedId]) {
    const index = ids.indexOf(id);
    if (index >= 0) return index;
  }
  return 0;
}

export function albumDestination(paths, currentPath, direction, remembered = {}) {
  const current = paths.indexOf(currentPath);
  if (current < 0 || !paths.length) return null;
  const path = paths[(current + direction + paths.length) % paths.length];
  const params = new URLSearchParams();
  if (remembered[path]) params.set('photo', remembered[path]);
  return path + (params.size ? `#${params}` : '');
}

function savedPhoto(path) {
  try { return sessionStorage.getItem(memoryKey(path)); } catch { return null; }
}

export function restorePhotoIndex(photos) {
  return selectedPhotoIndex(photos.map(photo => photo.dataset.id), location.hash, savedPhoto(location.pathname));
}

export function rememberPhoto(id, { fullscreen } = {}) {
  if (!id) return;
  try { sessionStorage.setItem(memoryKey(location.pathname), id); } catch { /* URL state still works when storage is unavailable. */ }
  const url = new URL(location.href);
  const params = new URLSearchParams(url.hash.slice(1));
  params.set('photo', id);
  if (fullscreen === true) params.set('view', 'full');
  else if (fullscreen === false) params.delete('view');
  url.hash = params.toString();
  try { history.replaceState(history.state, '', url); } catch { /* Navigation remains usable without history writes. */ }
}

export function navigateAlbum(direction) {
  const paths = [...document.querySelectorAll('nav[aria-label="Albums"] a')].map(link => new URL(link.href).pathname);
  const remembered = Object.fromEntries(paths.map(path => [path, savedPhoto(path)]));
  const destination = albumDestination(paths, location.pathname, direction, remembered);
  if (destination) location.assign(destination);
}

export const wantsFullscreen = () => new URLSearchParams(location.hash.slice(1)).get('view') === 'full';
