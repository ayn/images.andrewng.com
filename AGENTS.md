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
- Preserve image aspect ratios. No automatic crop or fake borders.
- Avoid prominent technical copy, UI clutter, metadata overlays, or invented camera data.
- Camera/lens/exposure EXIF is subtle, behind Details in the photo viewer.
- Include camera, lens, focal length, aperture, shutter speed, ISO when available.
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
  depend on Flickr API/image server requests. Imported photos retain Flickr links.

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
