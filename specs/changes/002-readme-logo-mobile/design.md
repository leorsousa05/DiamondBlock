# Design: README Mobile Logo Fix

## [Padrões Aplicados]

- **Progressive Enhancement** — serve the modern WebP format to capable clients while keeping the PNG as a universal fallback. This respects the principle of graceful degradation without breaking legacy renderers.
- **Separation of Content & Presentation** — README markup defines structure and asset selection; GitHub's renderer handles responsive scaling via its own CSS. We avoid inline styles that GitHub's sanitizer may strip.
- **Minimal Surface Area** — the change is scoped to one markdown file and one generated asset. No source code, build pipeline, or package metadata is touched.
- **Aspect-Ratio Preservation** — explicit `width` and `height` attributes give the browser an intrinsic aspect ratio, reducing cumulative layout shift (CLS) on mobile.

## [Estratégia de Implementação]

1. **Generate optimized WebP**
   - Convert `assets/diamondblock-logo.png` to `assets/diamondblock-logo.webp`.
   - Preserve original dimensions (666×375) and transparency.
   - Aim for a file size significantly smaller than the PNG (~143 KB → ≤ 50 KB).
   - Use an image conversion tool available in the environment (e.g., `cwebp`, ImageMagick `convert`, or a Node.js script).

2. **Update README markup**
   - Replace the redundant `<picture>` block with a standards-compliant version.
   - Add `<source srcset="assets/diamondblock-logo.webp" type="image/webp">`.
   - Keep `<img src="assets/diamondblock-logo.png" width="220" height="124" alt="...">` as fallback.
   - Maintain `<p align="center">` wrapper for horizontal centering.

3. **Verify rendering**
   - Confirm both assets exist and paths are correct.
   - Use GitHub's own preview or a local markdown renderer to check that the image loads.
   - Use browser DevTools mobile viewport simulation to confirm responsive scaling.
   - Validate that the WebP file displays correctly and is smaller than the PNG.

## Contracts & Stubs

No code contracts are required. The only interface is the public-facing README markup.

## Directory Structure

```
/home/arch/codes/diamondblock/
├── README.md                              # MODIFIED — logo HTML block
└── assets/
    ├── diamondblock-logo.png              # UNCHANGED
    └── diamondblock-logo.webp             # ADDED — optimized fallback
```

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| GitHub mobile still strips `<picture>` | Low | PNG `<img>` fallback is valid HTML and GitHub generally preserves simple `<img>` tags. |
| WebP generation degrades image quality | Low | Use lossless or high-quality lossy conversion and visually compare. |
| npm package page ignores `<picture>` | Medium | PNG fallback inside `<img>` ensures the logo still appears. |
| File path breaks on forks/branches | Low | Use relative path `assets/...` which GitHub resolves from the rendered branch. |

## Deferred / Out of Scope

- SVG recreation of the logo (pixel art would not benefit significantly from vectorization).
- Dark-mode-specific logo variant.
- README content changes beyond the logo block.
- Automated image optimization in CI.
