# Project state

Updated 2026-11-03. See `AGENTS.md` for persistent constraints and `README.md` for commands.

## Intent and architecture

Rebuild Andrew’s old personal Pullfolio portfolio as a minimal white static site.
The old service was Rails + Flickr OAuth, with albums driven by photosets/tags.
This site uses Astro, plain CSS, a vanilla JS viewer, Sharp image generation, and
exifr for local EXIF parsing. No React, database, runtime Flickr API, or Rails.

Flickr initially supplies existing tag-based albums. It is optional for new photos.
`data/albums.json` is the public fallback snapshot. Build preparation merges local
album folders, picks Lightroom replacements, and generates self-hosted JPEGs.
Astro renders all pages to `dist/`. The browser chooses variants with `srcset`.

The repo was created independently as public `ayn/images.andrewng.com`. An initial
version was pushed to main before the feature PR workflow was established. Further
changes use feature branches, PR checks, review, and merge. GitHub’s About homepage
is intended to be https://images.andrewng.com.

## Implemented

- Browser/social titles use Andrew Ng Images — <album>. The header no longer
  shows a redundant photo total. The repeated main album heading is visually hidden
  on desktop, with the extra space given to the photo; About also hides its repeated
  heading on desktop. Mobile keeps its headings. Footer copyright updates in browser JavaScript.
- About links to the source repository, not the personal GitHub profile. Flickr
  profile link removed. Instagram SVG links in navigation and About point to the
  confirmed profile @ayn: https://www.instagram.com/ayn/.
- Five albums with Selected Images at `/`, four `/albums/<slug>/` pages, About, 404,
  sitemap, canonical URLs, social metadata, and Cloudflare headers/old URL redirects.
- Large, one-photo-at-a-time slideshow with a consistent viewing area, quiet
  previous/next controls, counter, optional Play, keyboard navigation, and touch
  swipe. The user explicitly rejected the mixed-aspect-ratio grid. Photos stay
  uncropped; clicking or Enlarge opens the existing viewer. Desktop sidebar and
  mobile album navigation remain. Vi shortcuts work in both views: h/l previous/next photo,
  j/k next/previous album, gg first photo, G last photo. Each album remembers its
  selected photo via session storage and URL hash; fullscreen mode is preserved
  across album switches. Initial fullscreen focus goes to the photograph rather
  than outlining Close; keyboard focus indicators remain on actual controls.
  f toggles the viewer, d toggles EXIF Details in fullscreen, and Escape closes it. Exit restores image focus rather than
  the enclosing link to prevent a clipped black focus outline at the slideshow edge.
- Slideshow and viewer paging use CSS crossfades after image decoding; viewer
  opening/closing fades too. Reduced motion skips animation. EXIF space is fixed
  so Details never shifts the photograph. EXIF fades in/out over 650ms. Visible Flickr titles/descriptions and
  EXIF uses photographic ƒ aperture notation, styled shutter fractions instead of
  decimal subsecond durations, and a small ISO badge.
  Per-photo source links are removed; About carries the API acknowledgment.
- Viewer with keyboard arrows, Escape, focus restoration, swipes, responsive image
  selection, and hidden-by-default EXIF Details. Missing metadata is omitted.
- Public-only Flickr sync with account scoping, AND tag matching, pagination,
  deduplication, safe error messages, and atomic snapshot replacement.
- Public EXIF fetched from Flickr; only camera/lens/focal length/aperture/shutter/ISO
  are retained. 90 unique legacy photos have available EXIF.
- Locally generated JPEGs with content-versioned URLs, progressive quality 88 / 4:4:4,
  no embedded EXIF, six target sizes through 6144px, and no upscaling.
- `photos/<album-slug>/` for new JPEGs; duplicate bytes across folders share variants,
  EXIF capture time determines ordering, filename/title sidecars supply titles.
- `photos/flickr-overrides/` for Lightroom re-exports of existing Flickr photos.
  The same replacement is used in every album containing that Flickr ID.
- Source JPEGs, generated files, caches, and credentials are ignored by Git.
- Tests cover Flickr query/privacy/pagination, EXIF whitelisting, actual 6K variant
  generation and EXIF stripping, local deduplication, generated pages, override ID
  matching, and Git exclusions. CI builds the public snapshot and runs the tests.

## Real source limitations

The legacy API key works without OAuth as of this date even though Andrew no longer
pays for Flickr Pro. That is a verified current result, not a future guarantee.
Most Flickr photos expose only 1024px long-edge copies; some expose 2048px.
Counts: Selected Images 44, Portraits 13, Landscape 13, Denim 23, Objects 17,
90 unique photos total. Current preview uses those available files.

True high-resolution display requires originals or Lightroom re-exports. No real
local originals have been provided yet. A synthetic 6400px test source verifies
the pipeline but does not improve existing portfolio photographs. Flickr’s official
account-data export includes originals for Free accounts:
https://blog.flickr.net/all/2025/04/15/service-update-original-large-size-download-limitations-on-free-accounts/

The user identified https://flic.kr/p/mSCxN (236208468, “Sherry’s Speedy Reduced”,
Objects) as an example needing an unframed, full-resolution Lightroom re-export.
Save the replacement as `photos/flickr-overrides/236208468.jpg`.

## Preview and deployment status

Local checkout: `/Users/ayn/work/images.andrewng.com`.
The old `/Users/ayn/work/pullfolio` repository is separate and back on master.
Astro dev was verified listening on `*:4327`; an HTTP request through its Tailscale
IP with the requested hostname returned 200. Preview URL:
http://aynstudio.tail23b3c.ts.net:4327

Browser automation was unavailable (`CUA_REPL_ENABLED_SURFACES is required`), so
full visual/browser interaction QA has not been performed. Build, image processing,
tests, HTTP routes, and listener binding have been checked.

Production deployment is explicitly **Mac-driven**, not GitHub Actions-driven.
Actions only validates PR builds/tests and must not publish the site.
Cloudflare Pages production deployment/custom domain/DNS have **not** been configured.
Build locally and upload `dist/` if using local originals. Do not enable cloud Git
builds for high-resolution sources until originals can be accessed securely there.

## Workflow notes

Node 24 is selected by `.node-version`; local `/opt/homebrew/bin/node` is newer and
was used because the shell’s older Node 22.15 does not meet Astro’s requirements.
The ignored `.env` contains the API key; never print or commit it. The source tree
and generated output were scanned against legacy key/secret values before publishing.

Builds are run from the repository root. `npm run build` refreshes Flickr if a key
is set, prepares photos, then builds Astro. `npm test` expects generated pages to
exist. CI uses the saved public metadata without credentials. The source originals
are deliberately absent from GitHub, so restoring them is required on a fresh machine.

Remaining work: obtain actual high-resolution sources, visually review the design
on desktop/mobile, and configure/deploy Cloudflare Pages when requested.
