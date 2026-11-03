export function keyboardHelpAction({ key, altKey, ctrlKey, metaKey, typing = false }, open) {
  const question = key === '?' && !altKey && !ctrlKey && !metaKey;
  if (open) return key === 'Escape' || question ? 'close' : 'block';
  return question && !typing ? 'open' : null;
}
