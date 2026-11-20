# Turbo Kart Legends logo — v1

Generated on 2026-11-19 using the built-in image_gen tool through the imagegen skill. This is a new original branding concept, without supplied franchise characters or third-party logo references.

- Asset: `public/assets/branding/turbo-kart-legends-logo-v1.png`
- Format: 1536 × 1024 RGBA PNG with genuine transparent margins/negative space.
- Direction: coastal teal outlines, warm gold/orange lettering, cream secondary text, a curved road, turbo streaks and a racing flag.
- Text: Turbo Kart / LEGENDS. Visually checked for correct spelling.
- Intended use: menu/loading/promotion branding. The original generation was delivered as a standalone candidate; the integration below now uses optimized derivatives in the UI.
- Raster artwork, not an editable vector/font asset. Preserve aspect ratio; smaller display sizes may need a separately designed compact mark.

## Verification

Inspected the generated image and PNG metadata. Decoded alpha for validation only: 991,969 of 1,572,864 pixels are fully transparent; sampled margins/outer glow pixels have alpha zero. The image-preview renderer may show hidden RGB glow over black, but those fully transparent pixels do not paint in normal alpha compositing. No image pixels were edited by scripts.

No application code, dependency, physics, control, model or camera changed; gameplay tests/build were not rerun for this standalone image/document addition. The previously recorded performance test results are historical, not a new test run for this logo. `git diff --check` validates the accompanying text.

## Generation prompt

```text
Use case: logo-brand.
Asset type: final transparent PNG game-title logo for the original desktop-browser arcade kart racer Turbo Kart Legends.
Create ONE original, polished, beautifully balanced logo, centered with generous transparent padding, wide horizontal composition about 3:2, suitable for a game's Home menu, loading screens and promotional artwork.
Text verbatim: "TURBO KART" as the dominant title, "LEGENDS" as the smaller secondary line underneath. No other text. Spell all words correctly.
Art direction: minimalist, clean, cheerful and premium arcade racing, confident readable chunky rounded custom lettering with a slight forward lean and carefully crafted spacing. Warm golden-yellow/cream title faces, subtle warm orange edges, restrained shallow dimensional shading, strong deep coastal-teal outlines for readability over scenic backgrounds. LEGENDS in refined widely spaced cream capitals, supported by a compact deep-teal integrated shape. Beautiful crisp silhouette; not shiny chrome.
Include a small original abstract racing emblem integrated with the title: a flowing coastal-road curve with a clean center stripe and two short turbo streaks, suggestive of kart racing and motion without dominating the lettering. Use restrained sea-teal and warm yellow/orange accents. The distinctive typography is the hero; keep the overall design compact and uncluttered.
Background: genuinely transparent alpha, including spaces around and inside logo elements. No scenery, no rectangular background, no checkerboard drawn into the image, no mockup, no sheet of variants.
Constraints: original branding only, no franchise characters, no copied game logos, no recognizable branded vehicles, no crown, no copyrighted emblems, no tagline, no watermark, no surrounding objects, no lens flare, no diffuse glow, no long drop shadow. Preserve crisp clean edges and legibility at small size.
```

## Refinement prompt

```text
Use case: background-extraction / precise-object-edit.
Edit the supplied Turbo Kart Legends logo. Preserve the exact existing lettering, spelling, typography, layout, proportions, coastal curved-road emblem, checkered flag, gold/orange faces, cream LEGENDS lettering and solid dark-teal outlines. Do not redesign the logo.
Change only this: completely remove all diffuse teal/gold glow, mist, bloom and soft shadows around the outside of the logo. Remove any dark background pixels outside the crisp solid silhouette. Output the same centered composition as an isolated clean logo on genuinely transparent alpha, including empty holes and margins. Keep anti-aliased edges, subtle shading inside solid letters, and the compact solid outlines. No backdrop, no checkerboard texture, no new objects or text. Transparent space must be entirely clear rather than a glowing halo.
```


## In-game integration — 2026-11-20

The approved logo now replaces the old text/T-arrow wordmark in the shared Home/setup header, retained two-step selection header, boot/race loading screens and phone-controller header. The existing Pocket Wheel caption remains. The in-race HUD and minimalist results layout gain no extra toolbar or logo panel. All mode/selection/launch, loading progress/cancel/focus, phone input, physics, AI, race and camera ownership stays unchanged.

`src/game/ui/GameLogo.tsx` is a small shared DOM component with Home/compact/loading/phone size profiles, one accessible brand label and a text fallback if the image fails. It uses `srcset`/`sizes`, reserved dimensions, native async decoding and prioritized Home/loading images. `src/game/config/branding.ts` centralizes the runtime artwork URLs; `src/styles/branding.css` controls sizing. It adds no canvas, animation loop, runtime image processing or dependency. Loading spacing and the phone brand caption were adjusted for the real artwork.

### Display files and performance

- `public/assets/branding/turbo-kart-legends-logo-384.webp`: **384 × 151**, alpha, **24,774 bytes**.
- `public/assets/branding/turbo-kart-legends-logo-768.webp`: **768 × 302**, alpha, **61,606 bytes**.
- Preserved original: **1,301,525 bytes**, SHA-256 `3bf97042ffa6e8095ec8369cf375a33c3f8298ad8f16b9d0aa139949754d69f6`. It is not used as an image source by the component. Public source archives still contribute to deployment size.

Both display files are offline encodings of the approved image, not regenerated artwork. A padded crop `(32, 222, 1476, 580)` frames the visible lettering/emblem; it retains all source pixels with alpha ≥4 plus a margin, excluding distant effectively invisible alpha-1–3 traces. Source lettering, palette and artwork remain; the PNG is untouched. Source/derivative metadata and the 384 px image were inspected. Transparency is preserved, not flattened onto a background.

Generated with the already-installed **cwebp 1.6.0**:

```sh
cwebp -quiet -q 92 -alpha_q 100 -sharp_yuv -m 6 -metadata none -crop 32 222 1476 580 -resize 384 0 public/assets/branding/turbo-kart-legends-logo-v1.png -o public/assets/branding/turbo-kart-legends-logo-384.webp
cwebp -quiet -q 92 -alpha_q 100 -sharp_yuv -m 6 -metadata none -crop 32 222 1476 580 -resize 768 0 public/assets/branding/turbo-kart-legends-logo-v1.png -o public/assets/branding/turbo-kart-legends-logo-768.webp
```

These derivatives are checked in. Normal install/dev/build commands do not require cwebp or any image-generation service. A future replacement should use versioned filenames and update the shared URLs to avoid stale caches.

### Verification and limits

`npm run typecheck`, `npm run lint` and `npm run build` passed. The production output contains both display images. Six focused tests passed for accessible profiles, responsive URLs, dimensions/priorities, real WebP files/byte budgets, and preservation of loading/selection labels and cancel UI. Source-image generation checks above remain historical; no new image generation was performed in this integration. Full regression suite: **529 tests / 46 files passed in 139.77 seconds**. `git diff --check` passed. See [actual test output](design-qa/branding/tests.txt).

**Live browser visual verification remains pending:** the browser backend again reported that its trusted RPC service was not configured. No final Home/setup/loading/phone screenshot, physical phone layout, actual image-failure event, focus interaction or live gameplay result is claimed for this pass. The WebP artwork itself was inspected and automated checks passed. Run `npm run dev` and review Home, Grand Prix/Cup/Racer/Kart/Track, loading, and `/controller` at desktop/narrow/landscape sizes. Check that all existing controls remain reachable and the fallback label appears when artwork is unavailable.
