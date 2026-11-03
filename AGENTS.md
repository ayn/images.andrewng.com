# Agent instructions

Read `README.md`, `photos/README.md`, and `docs/PROJECT_STATE.md` before changing the site.
Keep those documents current when a workflow or architectural decision changes.

## Project boundary

- This is **images.andrewng.com**, Andrew Ng’s personal photography portfolio.
- GitHub: https://github.com/ayn/images.andrewng.com (public).
- This repository contains only the new Astro site, with independent history.
  The old Pullfolio Rails application is a separate repository; do not copy it here.
- Canonical production URL: https://images.andrewng.com. Earlier conversation names
  photography.andrewng.com and photography-static are superseded.

## Working conventions

- Prefix shell commands with `rtk` (or `rtk proxy` for unfiltered commands).
- Use a feature branch, open a PR, run CI, review the diff, and merge after checks pass.
  The user explicitly authorized this push → PR → checks → merge workflow.
  A later request to pause pushes takes precedence.
- Keep tests focused on behavior and genuine failure modes. Do not add tests for
  trivial visual edits or tests that simply repeat implementation details.
- Use Node 24 per `.node-version`; Astro requires Node >=22.23.4.
- Run `npm run build` before `npm test` because integration tests inspect built pages.

## Design requirements

- White background, minimal, polished, responsive, photographs do the talking.
- Instagram links use an inline SVG in navigation and About; use the confirmed
  personal profile URL from site.config.mjs, never guess a handle. Confirmed: @ayn,
  https://www.instagram.com/ayn/. SVG is 22px with a larger click target; align its
  left edge with sidebar links and center it with adjacent text on mobile/About.
- About has Source on GitHub linking to this repository (not the personal GitHub
  profile) because the site source is public. Remove the Flickr profile link.
- Copyright year is computed in browser JavaScript on each visit; build-time text
  is only a no-JavaScript fallback.
- Browser/social titles put the brand first: Andrew Ng Images — Selected Images,
  Andrew Ng Images — Portraits, etc. Never use an unbranded album-only title.
- Hide the repeated main album and About headings on desktop (keep accessible h1s); the
  sidebar already identifies the album. Keep the visible heading on mobile.
- No photograph total in the top-right page heading; the slideshow position
  indicator below the image is enough.
- Default album presentation is a large, one-photo-at-a-time slideshow, not a grid.
  The user dislikes the visual mess of mixed aspect ratios in a grid. Keep manual
  previous/next, arrow keys, swipe, and optional Play (never autostart).
- Keep vi navigation in slideshow and fullscreen: h previous photo, l next photo, gg first photo,
  G last photo; j/k next/previous album outside fullscreen only; d toggles EXIF Details in fullscreen; f toggles the fullscreen viewer, Escape closes it. Preserve normal Tab focus indicators on controls. Opening the viewer
  initially focuses the photograph, not Close; no focus outline around the photo.
  Restore focus to the inline image on exit, avoiding clipped anchor outlines.
- ? toggles a compact keyboard-help dialog in either view. Escape closes help
  first without leaving fullscreen. Block photo/album shortcuts while help is open,
  preserve native Tab focus, pause autoplay, and restore focus on dismissal.
- Remember the last selected photo per album in sessionStorage and URL state.
  Switching albums and back returns to that same photo. Disable j/k album switching
  in fullscreen: full page changes there feel jarring to the user.
- Preserve image aspect ratios. No automatic crop or fake borders.
- Avoid prominent technical copy, UI clutter, metadata overlays, or invented camera data.
- No visible Flickr titles/descriptions or per-photo Flickr links. Generic accessible
  photo labels are fine. API acknowledgment lives in About while sync uses the API.
- Paging uses a gentle CSS crossfade after the next photo has decoded. Opening and
  closing the viewer also fades. Respect reduced motion. Reserve EXIF space so
  Details never moves or resizes the photograph. EXIF fades in and out at 650ms,
  slower than the 400ms photo crossfade and 300ms viewer entry/exit.
- Camera/lens/exposure EXIF is subtle, behind Details in the photo viewer.
- Include camera, lens, focal length, aperture, shutter speed, ISO when available.
  Use photographic typography: ƒ/2.8, raised/lowered shutter fractions (1/50s,
  never 0.02 sec), and a small ISO badge with its value. Keep screen-reader labels.
- Confirmed EXIF corrections go in data/photo-overrides.json by photo ID and take
  precedence over source metadata. Never infer a full lens model from focal length.
  Andrew confirmed generic 100mm Objects/Denim shots used the earlier Canon EF
  100mm f/2.8 Macro USM (non-L); those IDs are corrected in the override file. He
  sold it when upgrading to L IS. Keep explicit newer L IS records unchanged.
- Do not publish GPS or serial numbers. Generated images strip embedded EXIF;
  only whitelisted display fields are rendered separately.
- About should mention this portfolio was originally hosted by Pullfolio and link
  to https://pullfolio.com/, whose closing page says the service ran 2009–2024.

## Photo sources and resolution

- Existing Flickr account: ayn / 68826320@N00. Search only that account, public
  photos only, with `tag_mode=all` (both tags required).
- Albums in order: Selected Images (default `/`, pullfolio + selectedimages),
  Portraits (pullfolio + portraits), Landscape (pullfolio + landscape),
  Denim (pullfolio + denim), Objects (pullfolio + macro).
- New photos must work without uploading to Flickr. Users put full-resolution
  JPEGs under `photos/<album-slug>/` and run the build. Identical bytes in multiple
  album folders share generated variants. Optional JSON sidecars override titles.
- `photos/flickr-overrides/<flickr-id>.jpg` replaces a Flickr image everywhere,
  preserving its title, album membership, and Flickr link. Prefer source EXIF from
  the re-export. `ORIGINALS_DIR` can point to an external override folder instead.
- The user plans Lightroom re-exports to remove baked-in frames and recover detail.
  Example: https://flic.kr/p/mSCxN → 236208468, “Sherry’s Speedy Reduced”, Objects.
- Generate web variants with long edges 640, 1280, 1920, 2560, 3840, 6144px, stopping
  at native resolution. Never upscale or claim 6K detail from a 1024px source.
- Use responsive image selection in both gallery and viewer, including pixel density.
- Deploy generated photo files with the static site on Cloudflare. Visitors must not
  depend on Flickr API/image server requests. Flickr source links stay only in
  internal snapshot metadata, not the photo presentation.

## Secrets and large files

- This repo is public. Never commit API keys, `.env`, source/full-resolution JPEGs,
  downloaded photos, generated photos, caches, or build output.
- Keep sources under ignored `photos/` or outside the checkout. Only the empty
  folder structure and its README belong in Git. Original files need their own backup.
- `FLICKR_API_KEY` belongs in ignored `.env` locally or hosting environment settings.
- Keep the browser free of API credentials. Flickr sync happens only at build time.
- The public saved snapshot contains public photo metadata and the EXIF whitelist.
- Check `git diff --cached` and tracked filenames before pushing. Preserve the
  exclusion test for credentials and JPEGs.

## Preview and deployment

- Dev server must bind to **0.0.0.0:4327**, never just 127.0.0.1/localhost.
- User’s preview: http://aynstudio.tail23b3c.ts.net:4327.
- No Tailscale Serve or Funnel. The user connects directly from their tailnet.
- Astro’s host allowlist includes aynstudio.tail23b3c.ts.net.
- Deployment target: Cloudflare Pages, static `dist/`, no server adapter/database.
- Production builds and deployments run on the Mac, where original JPEGs live.
  GitHub Actions only validates builds/tests; do not add automated deployments.
- Local full-resolution files are not in GitHub: build locally and upload `dist/`
  to keep high-resolution production assets. Git-based cloud builds need a separate
  originals storage integration; do not silently replace originals with Flickr previews.
- `REQUIRE_ORIGINALS=1` makes missing source originals fail the build.
- Do not claim production deployment or DNS setup until actually completed.
