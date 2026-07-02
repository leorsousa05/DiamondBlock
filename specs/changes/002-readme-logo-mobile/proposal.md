# Proposal: Fix diamond-block logo rendering on mobile README

## WHY

The DiamondBlock README renders a logo at the top using raw HTML. On GitHub mobile (both the native app and mobile browsers) the image does not load, leaving a broken-image placeholder. This hurts first impression and brand consistency across platforms.

## Current State

`README.md` embeds the logo with:

```html
<p align="center">
  <picture>
    <img src="assets/diamondblock-logo.png" width="220" alt="DiamondBlock — diamond ore block">
  </picture>
</p>
```

Problems:

1. **Redundant `<picture>` wrapper** — it contains a single `<img>` with no `<source>` elements. GitHub's mobile sanitizer appears to strip or mishandle the empty `<picture>`, causing the image not to render.
2. **No explicit `height`** — without intrinsic aspect-ratio attributes, layout shifts and broken rendering are more likely on constrained viewports.
3. **No optimized fallback format** — the PNG is ~143 KB (666×375). Mobile clients benefit from a lighter WebP alternative.
4. **No responsive guard** — while GitHub adds `max-width: 100%` globally, the unusual `<picture>` wrapper can break that behavior.

## Scope

- Update `README.md` HTML to use a standards-compliant `<picture>` with a WebP source and a PNG fallback, or a simple, robust `<img>` if platform testing shows `<picture>` is still unreliable.
- Generate `assets/diamondblock-logo.webp` as a mobile-optimized, visually identical alternative.
- Preserve existing desktop behavior and the current PNG asset.

## Constraints

- No TypeScript/source code changes.
- No new runtime dependencies.
- The logo must remain centered and responsive on GitHub, npm, and plain markdown viewers.
- Keep the change minimal and reversible.
