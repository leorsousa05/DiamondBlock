# README Logo Rendering Spec

## ADDED

- `assets/diamondblock-logo.webp` — optimized WebP version of the existing PNG logo.

## MODIFIED

- `README.md` — logo HTML block at the top of the file.

## REMOVED

- Nothing.

## Current Markup

```html
<p align="center">
  <picture>
    <img src="assets/diamondblock-logo.png" width="220" alt="DiamondBlock — diamond ore block">
  </picture>
</p>
```

## Proposed Markup

```html
<p align="center">
  <picture>
    <source srcset="assets/diamondblock-logo.webp" type="image/webp">
    <img src="assets/diamondblock-logo.png" width="220" height="124" alt="DiamondBlock — diamond ore block">
  </picture>
</p>
```

Rationale:

- `<picture>` now has a real purpose: serve WebP to clients that support it, fallback to PNG for others.
- `<img>` keeps explicit `width="220"` and adds `height="124"` to preserve the 666×375 aspect ratio (220 / 666 × 375 ≈ 124).
- GitHub's CSS applies `max-width: 100%` to images, so the logo scales down on narrow mobile viewports.
- The `alt` text remains unchanged for accessibility.

## Fallback Behavior

| Client | Expected Render |
|--------|-----------------|
| GitHub desktop | WebP if supported, otherwise PNG; width 220 px, centered. |
| GitHub mobile app | WebP or PNG depending on OS/WebView support; responsive. |
| GitHub mobile browser | Same as above. |
| npm package page | PNG fallback (npm sanitizes `<picture>`/`<source>`). |
| Plain markdown viewer | Falls back to PNG or raw HTML depending on renderer. |

## Asset Requirements

- `assets/diamondblock-logo.webp`
  - Dimensions: 666×375 (same as PNG).
  - Quality: visually identical to PNG at normal viewing size.
  - Target size: ≤ 50 KB.
  - Transparent background preserved.
