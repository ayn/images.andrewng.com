# Add your photographs here

## Replace a Flickr image with a Lightroom re-export

Put the edited full-resolution JPEG in `flickr-overrides/`, named with the Flickr
photo ID. For example, https://flic.kr/p/mSCxN is photo **236208468**, so export:

```text
photos/flickr-overrides/236208468.jpg
```

The build uses your re-export in every album containing that Flickr photo,
preserves the existing title and Flickr link, and reads display EXIF from the new
file when available. Export without the old frame or watermark if you want those
removed. No automatic crop is applied. New source content produces new asset URLs,
so browser caches do not keep showing the old version. These JPEGs are ignored by Git.

## Add new images without Flickr

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
