# Turbo Kart Legends logo — v1

Generated on 2026-11-19 using the built-in image_gen tool through the imagegen skill. This is a new original branding concept, without supplied franchise characters or third-party logo references.

- Asset: `public/assets/branding/turbo-kart-legends-logo-v1.png`
- Format: 1536 × 1024 RGBA PNG with genuine transparent margins/negative space.
- Direction: coastal teal outlines, warm gold/orange lettering, cream secondary text, a curved road, turbo streaks and a racing flag.
- Text: Turbo Kart / LEGENDS. Visually checked for correct spelling.
- Intended use: a standalone candidate for menu/loading/promotion branding. Existing UI branding is not replaced by this asset-only task.
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
