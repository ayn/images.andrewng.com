export function formatShutter(value) {
  const text = String(value ?? '').trim();
  const fraction = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  const seconds = fraction ? Number(fraction[1]) / Number(fraction[2]) : Number.parseFloat(text);
  if (!Number.isFinite(seconds) || seconds <= 0) return text ? { text, label: `Shutter ${text}` } : null;
  if (seconds < 1) {
    let numerator = 1;
    let denominator = Math.round(1 / seconds);
    if (fraction && Number.isInteger(Number(fraction[1])) && Number.isInteger(Number(fraction[2]))) {
      numerator = Number(fraction[1]);
      denominator = Number(fraction[2]);
    } else if (Math.abs(1 / denominator - seconds) / seconds > 0.01) {
      denominator = 1000000;
      numerator = Math.round(seconds * denominator);
    }
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const divisor = gcd(numerator, denominator);
    numerator = String(numerator / divisor);
    denominator = String(denominator / divisor);
    return { numerator, denominator, text: `${numerator}/${denominator}s`, label: `Shutter ${numerator}/${denominator} second` };
  }
  const duration = String(Number(seconds.toFixed(2)));
  return { text: `${duration}s`, label: `Shutter ${duration} seconds` };
}

export function formatAperture(value) {
  const number = String(value ?? '').match(/\d+(?:\.\d+)?/);
  return number ? `ƒ/${Number(number[0])}` : '';
}

export function formatIso(value) {
  return String(value ?? '').replace(/^ISO\s*/i, '').trim();
}

export function renderExif(container, exif) {
  const fields = [];
  function field(text, className, label) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    if (label) span.setAttribute('aria-label', label);
    return span;
  }
  for (const key of ['camera', 'lens', 'focalLength']) if (exif[key]) fields.push(field(exif[key], `exif-${key}`));
  const aperture = formatAperture(exif.aperture);
  if (aperture) fields.push(field(aperture, 'exif-aperture', `Aperture ${aperture.replace('ƒ', 'f')}`));
  const shutter = formatShutter(exif.shutter);
  if (shutter) {
    const span = field(shutter.text, 'exif-shutter', shutter.label);
    if (shutter.denominator) {
      const fraction = document.createElement('span');
      fraction.setAttribute('aria-hidden', 'true');
      const numerator = document.createElement('sup');
      numerator.textContent = shutter.numerator;
      const slash = field('⁄', 'exif-fraction-slash');
      const denominator = document.createElement('sub');
      denominator.textContent = shutter.denominator;
      fraction.append(numerator, slash, denominator, document.createTextNode('s'));
      span.replaceChildren(fraction);
    }
    fields.push(span);
  }
  const iso = formatIso(exif.iso);
  if (iso) {
    const span = field('', 'exif-iso', `ISO ${iso}`);
    const mark = field('ISO', 'exif-iso-mark');
    mark.setAttribute('aria-hidden', 'true');
    const value = field(iso, 'exif-iso-value');
    value.setAttribute('aria-hidden', 'true');
    span.append(mark, value);
    fields.push(span);
  }
  container.replaceChildren();
  fields.forEach((span, index) => {
    if (index) container.append(document.createTextNode(' · '));
    container.append(span);
  });
  return fields.length > 0;
}
