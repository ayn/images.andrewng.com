# Add your photographs here

Put full-resolution JPEGs in any album folder, then run `npm run build`.

- `selected-images/` — home page
- `portraits/`
- `landscape/`
- `denim/`
- `objects/`

The same file can go in several folders; the build deduplicates identical content.
New files appear first, ordered by capture time (or modification time if unavailable).
Subdirectories are supported. Filenames become titles: `evening-in-taipei.jpg` →
“evening in taipei”. Optionally add `evening-in-taipei.json` alongside it:

```json
{ "title": "Evening in Taipei" }
```

EXIF camera, lens, focal length, aperture, shutter speed, and ISO are read automatically.
GPS and serial numbers are not published. Generated JPEGs have embedded metadata stripped.

Image files and sidecars here are ignored by Git. Only this guide and the empty
folder structure are tracked. Back up your originals independently. Production
builds using this folder should run locally, then upload `dist/` to Cloudflare.
