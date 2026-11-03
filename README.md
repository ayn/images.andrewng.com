# images.andrewng.com

Andrew Ng’s photography portfolio. A minimal white site with uncropped photographs,
five albums, a large slideshow, and an accessible photo viewer. Inspired by the personal site formerly
hosted on Pullfolio; the About page links to [Pullfolio’s closing page](https://pullfolio.com/).

Built with **Astro**, plain CSS, and vanilla JavaScript. Flickr supplies album
membership at build time. **Sharp** prepares responsive JPEGs, which are included in
the static Cloudflare Pages deployment. Visitors make no requests to the Flickr API
or Flickr image servers. Photo captions and per-photo Flickr links are omitted;
About contains the Flickr API acknowledgment while the API remains in use.

Albums show one uncropped photograph at a time. Use previous/next, arrow keys,
`h` (previous photo), `l` (next photo), `j`/`k` (next/previous album), `gg`/`^` (first), `G`/`$` (last), Home/End, or swipe to browse. Autoplay advances every six seconds on a fresh visit and pauses
when browsing manually or leaving the tab. Manual navigation keeps it paused
for this tab until Play is pressed; reduced motion disables automatic startup. Click the photo or Enlarge for the
fullscreen viewer; `f` toggles it and Escape or a downward swipe closes it.
On touch screens, fullscreen gives the whole viewport to the photograph. Double-tap
or use Zoom in for 2.5× magnification, then drag to inspect detail. Zoom out to
resume swiping between photos or swipe-down dismissal. Tap either photo counter
for First photo / Last photo; no long press is needed.
Exit animates the photo back into its regular position. Paging and viewer entry/exit
use gentle fades with reduced-motion support. Each album remembers its selected
photo in this tab; switching away and back restores it. Album switching with j/k
is disabled in fullscreen to avoid disruptive page changes. Press ? for keyboard
help; Escape dismisses help before leaving the viewer. EXIF stays behind Details (or d in fullscreen) in a fixed
space so the photograph never moves when toggled.

Photo selections use real static URLs such as `/albums/portraits/<photo-id>/`,
so sharing the URL gives the selected photograph its own Open Graph preview.
The root/album links use the branded 1200×630 card generated during preparation.
Legacy `#photo=` links still open the correct image. Per-album memory is retained.

## Develop

Use Node.js **24** (see `.node-version`). Astro requires at least Node 22.23.4.

```sh
npm ci
cp .env.example .env
# Set FLICKR_API_KEY in .env, or leave blank to use the saved public metadata.
npm run dev
```

The first run downloads the available photos and generates image variants.
Later runs reuse the local cache. The preview hides Astro’s developer toolbar
so it shows the actual design. The dev server binds to **0.0.0.0:4327**, so it is reachable on the machine’s network interfaces, including Tailscale:

http://YOUR_PREVIEW_HOST:4327

No Tailscale Serve or Funnel setup is needed. Set `DEV_ALLOWED_HOSTS` in ignored `.env` to your actual preview hostname.
Localhost, IP addresses, and those configured names pass the host check. Production URLs use
https://images.andrewng.com regardless of the preview hostname.

## Albums

### Replace old Flickr exports

The existing framed photos are intentionally kept as-is. The archived
[frame audit](docs/framed-photo-replacements.md) records capture times and optional
replacement filenames for future reference.

Put Lightroom re-exports in `photos/flickr-overrides/<flickr-photo-id>.jpg`.
For example, `photos/flickr-overrides/236208468.jpg` replaces https://flic.kr/p/mSCxN.
The replacement retains all existing album memberships and internal Flickr identity;
source titles and per-photo Flickr links are not shown.
Its source EXIF takes precedence over Flickr's camera/exposure metadata. Filenames
containing the ID, such as `sand-harbor_236208468.jpg`, are also supported.
These full-resolution source files are ignored by Git. `ORIGINALS_DIR` can point
to an external folder instead; otherwise `photos/flickr-overrides/` is the default.

### Add photographs without Flickr

Put full-resolution JPEGs in `photos/selected-images`, `photos/portraits`,
`photos/landscape`, `photos/denim`, or `photos/objects`, then run `npm run build`.
The build discovers them automatically, reads camera/lens/exposure EXIF, and
generates the responsive variants. Identical files in several folders share one
set of generated images. New local photos appear before the legacy Flickr photos.
See [photos/README.md](photos/README.md) for optional title sidecars and ordering.

Source photos and sidecars are ignored by Git. Keep your own backup; GitHub stores
the code and empty folder structure. Generated variants are also ignored and go to
Cloudflare as part of `dist/`. EXIF appears only after opening Details in the viewer.

Definitions live in `site.config.mjs`. Searches are restricted to Flickr account
`ayn` (`68826320@N00`), require **both** tags, and include only public photos.

| Album | Tags | Route |
| --- | --- | --- |
| Selected Images | `pullfolio`, `selectedimages` | `/` |
| Portraits | `pullfolio`, `portraits` | `/albums/portraits/` |
| Landscape | `pullfolio`, `landscape` | `/albums/landscape/` |
| Denim | `pullfolio`, `denim` | `/albums/denim/` |
| Objects | `pullfolio`, `macro` | `/albums/objects/` |

`npm run dev` and `npm run build` load `.env`, refresh public album metadata when
`FLICKR_API_KEY` is set, and prepare photos before Astro runs. Without a key they
use `data/albums.json`. `npm run sync` refreshes metadata using an exported shell
variable; `node --env-file=.env scripts/sync.mjs` also loads the local file.
Failed API calls abort the build rather than publishing incomplete albums. A sync
writes the snapshot only after all five searches succeed.

## Correct missing EXIF

`data/photo-overrides.json` stores confirmed per-photo corrections. Use the photo ID
from the final segment of the current photo URL, for example:

```json
{ "photo-id": { "lens": "Your confirmed lens model" } }
```

Allowed fields: camera, lens, focalLength, aperture, shutter, iso. Corrections win
over Flickr and source EXIF, survive metadata refreshes, and apply in every album
containing that photo. Unknown IDs and private metadata fields fail the build.
Never infer a full lens model from focal length alone; some old exports only store
generic labels like `100.0 mm`.

## Resolution and originals

The image pipeline produces long edges of **640, 1280, 1920, 2560, 3840, and
6144px**, plus the source’s native size when smaller. It never upscales. JPEGs use
quality 88, progressive encoding, and 4:4:4 chroma. EXIF metadata is stripped from
the public copies. `srcset` lets the browser choose an appropriate resolution for
the gallery and viewer based on display size and pixel density.

The existing Flickr app key was tested successfully on 2026-11-03 without OAuth.
Most portfolio photos expose only 1024px on the long edge; a few expose 2048px.
Those files were downloaded successfully, but they cannot supply true 6K detail.
Current API access does not guarantee future access or eligibility for a new key.

For high-resolution output, point `ORIGINALS_DIR` in `.env` at a folder of original
JPEG, PNG, TIFF, WebP, or AVIF files. Filenames must contain the Flickr photo ID,
for example `5701302709.jpg` or `portrait_5701302709_o.jpg`. Subdirectories are
searched; duplicate matches fail with an error. Keep one edited source per photo.
Matching originals replace the lower-resolution Flickr source during preparation.
Photos without matching originals use the largest available Flickr copy.

Set `REQUIRE_ORIGINALS=1` to make a production build fail when originals are missing,
preventing an accidental downgrade to Flickr’s smaller files. The source resolution
still determines actual sharpness; an original smaller than 6K is never enlarged.

Flickr’s [account data export includes original files even for Free accounts](https://blog.flickr.net/all/2025/04/15/service-update-original-large-size-download-limitations-on-free-accounts/).
This provides a route to recover originals without subscribing to Pro.

## Build, verify, and deploy

```sh
npm run build
npm test
```

Astro writes a static website to `dist/`, including locally hosted photo variants.
Tests check Flickr query scoping, pagination, privacy filtering, and generated album
pages. No server adapter, database, or frontend UI framework is needed.

For builds using local originals, upload the prepared site from this computer:

```sh
npx wrangler pages deploy dist --project-name images-andrewng-com --branch main
```

The production project is **images-andrewng-com**, a Direct Upload project with
production branch `main` and no Git connection. Its public URL is
https://images-andrewng-com.pages.dev. `images.andrewng.com` is attached as a
custom domain; it requires a CNAME to `images-andrewng-com.pages.dev` and active
Cloudflare validation/TLS before serving production traffic there.

Use `wrangler login` if local Cloudflare authentication has expired. Deployment
requires Pages permissions; managing the hostname’s DNS requires separate DNS
permissions or a manual change in the Cloudflare dashboard.

Production deployment runs on the Mac, where the source JPEGs live. GitHub Actions
only builds the public Flickr snapshot and runs tests for PR validation; it does
not deploy. Do not enable Cloudflare automatic Git deployments for this project.
A clean checkout cannot access the local originals until you restore them.

Rebuild after changing Flickr tags or visibility. A deployed snapshot remains
public until replaced, including photos subsequently made private on Flickr.
For continuing Flickr synchronization, use a daily build; Flickr documents a
[24-hour API caching window](https://www.flickr.com/services/developer/api/).
No scheduled refresh job is provisioned. Production uploads run locally on the Mac.

## Public repository / private build inputs

Only code and public album metadata belong in Git. Source photographs are not committed. `.env`, downloaded photos,
originals, generated variants, build output, and caches are ignored. Put the API
key in ignored `.env` locally; Cloudflare receives only the prepared static output.
Never put credentials in `site.config.mjs` or client JavaScript.

- `src/layouts/Base.astro`: shared page layout and navigation.
- `src/components/Gallery.astro`: responsive photo markup.
- `src/components/Viewer.astro` / `src/gallery.js`: keyboard and swipe viewer.
- `scripts/flickr.mjs`: paginated Flickr API queries.
- `scripts/images.mjs`: source downloads and responsive image generation.
- `public/_headers`, `public/_redirects`: Cloudflare headers and old portfolio links.

Canonical URLs, social previews, sitemap, robots.txt, and a 404 page are generated
by Astro. The Rails application is separate and is not needed to run this site.


## Public-repository hygiene

GitHub secret scanning and push protection are enabled. CI also runs Gitleaks
against Git history. Keep API keys and private preview hostnames in ignored
`.env`, and use the GitHub noreply address for commits to this public repo.
The deliberate public identity is Andrew Ng, @ayn, and the portfolio/source URLs.

Documentation-only commits may use `[skip ci] [skip deploy]`. GitHub recognizes
`[skip ci]`; `[skip deploy]` is an instruction for the manual Mac deployment
workflow, not a Cloudflare/GitHub Actions feature. No automated deploy exists.
Code, image-pipeline, and configuration changes still require build/tests and CI.
