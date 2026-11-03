export function containImageRect(rect, naturalWidth, naturalHeight) {
  if (!naturalWidth || !naturalHeight || !rect.width || !rect.height) return rect;
  const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return { left: rect.left + (rect.width - width) / 2, top: rect.top + (rect.height - height) / 2, width, height };
}

export function createPhotoTransitionGate({ now = () => performance.now(), sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  let revision = 0;
  let availableAt = 0;
  return {
    request() {
      const version = ++revision;
      return {
        async ready(immediate = false) {
          if (version !== revision) return false;
          const delay = immediate ? 0 : Math.max(0, availableAt - now());
          if (delay) await sleep(delay);
          return version === revision;
        },
      };
    },
    hold(duration) { availableAt = now() + duration; },
    cancel() { ++revision; availableAt = 0; },
  };
}

const autoplayKey = 'images:autoplay-paused';
export function autoplayPermitted(reducedMotion, storage) {
  if (reducedMotion) return false;
  try { return (storage || globalThis.sessionStorage).getItem(autoplayKey) !== 'yes'; } catch { return true; }
}
export function rememberAutoplayPause(storage) {
  try { (storage || globalThis.sessionStorage).setItem(autoplayKey, 'yes'); } catch { /* In-page pause still works. */ }
}
export function clearAutoplayPause(storage) {
  try { (storage || globalThis.sessionStorage).removeItem(autoplayKey); } catch { /* Explicit Play still works. */ }
}
