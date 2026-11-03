const fields = new Set(['camera', 'lens', 'focalLength', 'aperture', 'shutter', 'iso']);

export function applyExifOverrides(albums, overrides) {
  const ids = new Set(albums.flatMap(album => album.photos.map(photo => photo.id)));
  for (const [id, values] of Object.entries(overrides)) {
    if (!ids.has(id)) throw new Error(`EXIF override has an unknown photo ID: ${id}`);
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error(`Invalid EXIF override for ${id}`);
    for (const [key, value] of Object.entries(values)) {
      if (!fields.has(key) || typeof value !== 'string' || !value.trim() || value.length > 180) {
        throw new Error(`Invalid EXIF override field for ${id}: ${key}`);
      }
    }
  }
  for (const album of albums) for (const photo of album.photos) {
    if (overrides[photo.id]) photo.exif = { ...photo.exif, ...overrides[photo.id] };
  }
}
