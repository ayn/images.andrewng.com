// Separate instances keep a pending "g" local to the slideshow or fullscreen viewer.
export function createPhotoNavigation() {
  let pendingG = null;
  return (key, current, count, now = Date.now()) => {
    if (count < 1) return null;
    const first = key === 'g' && pendingG !== null && now - pendingG < 700;
    pendingG = key === 'g' && !first ? now : null;
    if (first || key === 'Home') return 0;
    if (key === 'G' || key === 'End') return count - 1;
    if (['ArrowLeft', 'h', 'k'].includes(key)) return (current - 1 + count) % count;
    if (['ArrowRight', 'j', 'l'].includes(key)) return (current + 1) % count;
    return null;
  };
}
