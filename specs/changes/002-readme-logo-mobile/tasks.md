# Tasks: README Mobile Logo Fix

## Implementation

- [x] Generate `assets/diamondblock-logo.webp` from `assets/diamondblock-logo.png` (666×375, ≤ 50 KB, transparent).
- [x] Update `README.md` logo block to use `<picture>` with WebP `<source>` and PNG `<img>` fallback.
- [x] Add `height="124"` to the `<img>` tag to preserve aspect ratio.
- [x] Verify both files exist and paths are correct.

## Verification

- [x] Open `README.md` in a local markdown previewer and confirm the logo renders.
- [x] Use browser DevTools mobile viewport (375 px width) to confirm the logo does not overflow.
- [x] Confirm `assets/diamondblock-logo.webp` displays correctly and is smaller than the PNG.
- [x] Confirm GitHub-flavored markdown preview shows the image (not a broken icon).

## Documentation

- [ ] Update `specs/living/` or archive this change after merge if required by project conventions.
