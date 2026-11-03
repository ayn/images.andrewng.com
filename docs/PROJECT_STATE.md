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
  at every screen size, with the extra space given to the photo; About also hides
  its repeated heading. The underlined navigation link identifies the active page. Footer copyright updates in browser JavaScript.
- About links to the source repository, not the personal GitHub profile. Flickr
  profile link removed. Instagram SVG links in navigation and About point to the
  confirmed profile @ayn: https://www.instagram.com/ayn/.
- Generic share previews use a generated 1200×630 branded OG card featuring an
  actual portfolio photograph. Static `/albums/<slug>/<photo-id>/` pages provide
  photo-specific OG/Twitter cards. Client selection updates the real URL; memory
  is keyed by album root and legacy hash links remain supported.
- Five albums with Selected Images at `/`, four `/albums/<slug>/` pages, About, 404,
  sitemap, canonical URLs, social metadata, and Cloudflare headers/old URL redirects.
- Large, one-photo-at-a-time slideshow with a consistent viewing area, quiet
  previous/next controls, counter, automatic Play/Pause, keyboard navigation, and touch
  swipe. The user explicitly rejected the mixed-aspect-ratio grid. Photos stay
  uncropped; clicking or Enlarge opens the existing viewer. Desktop sidebar and
  mobile album navigation remain. Vi shortcuts work in both views: h/l previous/next photo,
  j/k next/previous album outside fullscreen, gg/^ first photo, G/$ last photo. Each album remembers its
  selected photo via session storage and static photo URL. j/k album switching is disabled
  in fullscreen because page changes there felt jarring. Initial fullscreen focus goes to the photograph rather
  than outlining Close; keyboard focus indicators remain on actual controls.
  f toggles the viewer, d toggles EXIF Details in fullscreen, and Escape closes it. Exit restores image focus rather than
  the enclosing link to prevent a clipped black focus outline at the slideshow edge.
- Fresh visits autoplay until manual navigation; the paused state persists in the
  tab until explicit Play. Reduced motion disables startup. SVG external arrows
  render consistently on mobile/desktop. Touch paging uses native scroll/snap in
  both views so frames follow the finger with native inertia. Vertical fullscreen
  drags move the photo live, snap back if short, or dismiss if long/fast.
- Fullscreen exit moves/scales the actual photo into its inline position. Rapid
  paging uses decoded image elements and waits for the active transition, avoiding
  clone reloads and white flashes from fading both scenes at once.
- Slideshow and viewer paging use CSS crossfades after image decoding; viewer
  opening/closing fades too. Reduced motion skips animation. EXIF space is fixed
  so Details never shifts the photograph. EXIF fades in/out over 650ms. Flickr titles/descriptions are hidden.
  EXIF uses photographic ƒ aperture notation, styled shutter fractions instead of
  decimal subsecond durations, and a small ISO badge.
  Per-photo source links are removed; About carries the API acknowledgment.
- ? opens a compact keyboard-help dialog above either view. Escape closes only
  the help, restores focus, and preserves fullscreen. Underlying photo/album keys
  are blocked while help is open; Tab stays native and autoplay pauses.
- Viewer with keyboard arrows, Escape, focus restoration, swipes, responsive image
  selection, and hidden-by-default EXIF Details. Missing metadata is omitted.
- Public-only Flickr sync with account scoping, AND tag matching, pagination,
  deduplication, safe error messages, and atomic snapshot replacement.
- Confirmed per-photo EXIF corrections can be saved in data/photo-overrides.json.
  Andrew confirmed the older generic 100mm shots in Objects/Denim used his Canon
  EF 100mm f/2.8 Macro USM (non-L), which he sold when upgrading to L IS. Matching
  photo IDs have that correction; records explicitly identifying the newer L IS
  model are unchanged. The 2006 watch photo predates the October 2009 L IS release.
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
Legacy Flickr counts: Selected Images 44, Portraits 13, Landscape 13, Denim 23,
Objects 17, with 90 unique photos. Those older sources remain at Flickr resolution.

The first local import on 2026-11-03 added 11 unique full-resolution JPEGs across
15 album placements: 7 Selected Images, 6 Portraits, and 2 Landscape. Duplicate
files across albums share variants. Five sources support genuine 6144px variants;
the other six retain their native 5358–5616px long edge. The build generated 66
new variants. Combined album counts are 51 / 19 / 15 / 23 / 17, with 101 unique
photos total. The initial gallery output measured 94.9 MB; the deployed site including static
photo-sharing pages measured 101.6 MB across 392 files (390 uploaded assets plus
Cloudflare headers/redirects), with a largest asset of 6.88 MB. Source JPEGs remain ignored by
Git; these photos exist only on the Mac and in locally generated build output.
No Flickr re-export overrides were added. Andrew decided to keep the framed
legacy photos as-is; Lightroom replacements are not planned. Their available
resolution remains unchanged. Flickr’s official
account-data export includes originals for Free accounts:
https://blog.flickr.net/all/2025/04/15/service-update-original-large-size-download-limitations-on-free-accounts/

The user identified https://flic.kr/p/mSCxN (236208468, “Sherry’s Speedy Reduced”,
Objects) during the frame audit. He subsequently decided against replacing the
framed photos because of the work involved.

## Preview and deployment status

Local checkout: `<checkout>`.
The old `<legacy-checkout>` repository is separate and back on master.
Astro dev was verified listening on `*:4327`; an HTTP request through its Tailscale
IP with the requested hostname returned 200. Preview URL:
http://YOUR_PREVIEW_HOST:4327

The computer-use browser connector is unavailable, but the final design pass
was reviewed with isolated headless Chrome via temporary Playwright tooling
outside the repository. Screenshots covered 320px and 390px phones, 768px tablet,
844×390 landscape, 1440px desktop, and 2560px desktop. Browser checks covered
keyboard edge navigation, help/Escape behavior, fixed EXIF geometry, fullscreen
return visibility, native horizontal touch paging, swipe-down dismissal, and
visibility of the selected album in the mobile strip. No JavaScript errors or
horizontal page overflow were observed. Physical iOS/Safari QA remains useful.

Production deployment is explicitly **Mac-driven**, not GitHub Actions-driven.
Actions only validates PR builds/tests and must not publish the site.
Cloudflare Pages project **images-andrewng-com** was created and deployed on
2026-11-03 from this Mac, using the reviewed main branch after PR #7 merged.
It is a Direct Upload project, production branch `main`, with no Git integration.
Public project URL: https://images-andrewng-com.pages.dev.
Initial deployment: `7e15f13a-ef47-420c-81b9-d500c600651c`,
https://7e15f13a.images-andrewng-com.pages.dev.
The Pages custom domain `images.andrewng.com` is attached. Andrew saved its
CNAME to `images-andrewng-com.pages.dev`, and https://images.andrewng.com
returned HTTP 200 with valid HTTPS. Wrangler’s OAuth session has Pages write
but not DNS permissions, so DNS was updated manually. Cloudflare subsequently confirmed the custom domain, verification, and HTTP
validation are all active.
Andrew paused deployment for a final design pass, then explicitly approved
deployment after reviewing mobile fullscreen on 2026-11-03. He accepted floating
controls over portrait photos as a reasonable compromise. Wrangler’s saved
session initially failed to refresh; Andrew completed a fresh browser authorization
and the upload succeeded.
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

The reviewed site is deployed and its custom hostname is active. Optional physical
iOS/Safari follow-up remains useful. Keep the existing framed photos as-is;
re-exporting legacy sources is not a pending task.

Framed-photo audit: all 101 unique images reviewed in contact sheets; nine visible
baked-in frames, all in Objects. Capture-time/replacement checklist lives in
`docs/framed-photo-replacements.md`. Exit restores the inline photo before closing
the dialog synchronously, escaping native-scroll clipping during the morph and
keeping scrollbar space stable to avoid a final blink or layout shift.

## Final design pass

The presentation keeps its white gallery/slideshow structure. A restrained serif
identity now matches the About heading and OG card, with system Avenir Next UI
text and clearer muted control contrast. Previous/next controls use the same
drawn SVG in both views. Mobile albums use one native scrolling row; the current
album is brought into view on load. Repeated album/About headings are hidden on
mobile too, per Andrew’s request; accessible h1s remain. The mobile gallery fits its controls inside
the viewport, and short landscape windows use compact sidebar spacing. About
links and typography have tighter, consistent spacing. Astro’s development
toolbar is disabled for clean previewing. Photo content, frames, EXIF privacy,
and existing navigation/motion behavior remain intact.


## Touch fullscreen and edge navigation

Touch fullscreen uses the full viewport with floating controls and safe-area
insets. The default view still fits the whole photograph; landscape shots on a
portrait phone can only gain the removed side margins. For closer inspection,
double-tap or Zoom in magnifies 2.5× and requests a suitable responsive source.
Drag to pan within bounded edges while zoomed; photo paging and swipe-down
dismissal resume after zooming out. Closing from zoom retains the return morph,
and reopening starts fitted again. Embedded source frames remain unchanged.

Long pressing is deliberately avoided because Safari starts selection. Both
photo counters open a native First photo / Last photo menu instead. The counter
and chevron stay on one line, including at 320px. First/last jumps are immediate
on native tracks, without scrolling through the entire album. Desktop keyboard
navigation remains unchanged. Andrew has now approved deployment.


The first production browser check found that Astro inlined two small script
entrypoints, which the existing `script-src self` policy correctly blocked.
`vite.build.assetsInlineLimit` is now zero so every executable script stays in
an external asset. A regression test checks every generated HTML page rather
than relaxing the policy. All 27 tests pass. This setting must be preserved in
future builds so copyright, album navigation, and keyboard help run in production.


## Public repository audit and safeguards

Gitleaks 8.30.1 found no secrets in all 165 historical blobs across 23 commits,
or in published static assets. Direct comparison against the actual legacy Flickr
credentials and current Cloudflare OAuth values found no matches in Git history.
GitHub reports no secret-scanning alerts; secret scanning and push protection are
already enabled. CI now also runs a pinned Gitleaks action over full history.

The audit did find a personal author email in older commit metadata and private
preview hostnames/local checkout paths in older public files. Future commits and
squash merges use GitHub’s noreply address; current source uses generic path/host
placeholders, with the real preview allowlist moved to ignored `.env`. Historical
copies remain; removing them would require an explicit Git history rewrite.
The public portfolio identity, Instagram handle, Flickr IDs, camera/exposure data,
and source-site URLs are intentional public content, not claimed to be PII-free.

Deployment after the CSP fix succeeded as `6ae10db9-b43f-4ecb-bdb9-aa3bfab9ea7a`.
The real custom hostname passed first-party script, copyright, help, fullscreen,
and zoom checks. Optional Cloudflare-injected analytics is blocked by the existing
self-only script policy; it was not added to the allowlist. The deployed 6144px
image bytes match the Mac-built image checksum.


## Photo preloading

Photo preloading uses an idle, low-priority rolling buffer: two photographs ahead
and one behind in both slideshow views. Responsive sizes match the display rather
than always requesting the largest file. Desktop fullscreen reuses prepared image
elements in a six-entry cache. Neighboring albums warm only their remembered
opening photo (or the first photo), plus the destination HTML; no whole album is
downloaded. Background work pauses for hidden tabs and inactive views. When the
browser exposes connection hints, Save-Data/2G disables speculation and 3G keeps
only the next photo, without neighboring-album requests.
