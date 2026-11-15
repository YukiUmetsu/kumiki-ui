# ArtCraft 9.1 / Crayon — open-wax contact feather and photographed F1 orbital study

**Date:** 2026-11-15. **Status:** independently tested, artistically **REJECTED**. Work stays inside draft [PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281) and the existing Crayon Storybook workbench. The F1 source remains exactly the Christopher Campbell CC0 608×1082 screenshot (see `crayon-artcraft-f1-eye-source-study-2026-11-15.md` for rights, source hash and 18 source landmarks).

## Reference/process gate

**Real material example:** Hans Stockmar, [*Painting with wax crayons by Stockmar*](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf), page 1, original manufacturer instructions. Its pictured layered crayon circles and lighthouse verify wax pigment building in overlapping side-nib deposits rather than airbrushed color filling vector shapes. Manufacturer notes: overlapping tones optically mix; heavy pressure on smooth paper gives dense wax, rough tooth/light pressure leaves gaps. Do not treat smooth transparent digital alpha or a Gaussian-blurred photo as actual wax binder mechanics. Rights for reproduction **not verified**; link/crop reference only, do **not** embed its pages or copy artwork.

**Identity and shape reference:** [Christopher Campbell, 2015 portrait, CC0 1.0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). This photo, not the wax instructional sheet, controls eyelid curvature, brow placement, sclera/iris ratios, occlusion and head identity. The actual photo crop and native Chromium render use identical rectangles below.

## Native V5 failure: only the soft glaze feathered

Actual native V5 close-up at 2.95×/source-aligned 608×1082 showed a dark violet *polygonal eye-socket sticker*: existing `blendRadius` blurred ONLY the underlying paint glaze. The separately rasterized tooth marks (`data-km-crayon-wax`) and six tonal wax-contact clump bands (`data-km-crayon-contact-clumps`) remained **hard-clipped to the SVG path**. Reducing pressure alone helped but could not eliminate the sharp contact boundary. This is a material-compositing root cause rather than missing surface noise, and does not justify reshaping the F1 photographed anatomy.

## V6 material system

One optional, backward-compatible `CrayonWaxElement.featherContacts?: boolean`, **off by default**.

- **Allowed:** only `coverage: "open"`, `deposition: "stroke-built"`, positive `blendRadius`. Invalid values reject at the scene validator *and* the renderer. Solid characters and fully opaque eye whites do not get feathered or made transparent.
- **How it works:** SVG defines one local luminance/alpha coverage mask by blurring the author-specified source silhouette with the existing local under-glaze Gaussian. That exact mask applies to the two pigmented **contact** passes: actual dry-wax tooth strokes and six clump bands. The existing paper relief mask is nested **inside** the spatial feather rather than replaced; local wax fibers retain sharp paper-contact roughness and stroke-end pickups. No global photo blur, no geometry flattening, no random noise. The source's parent `face-outline` remains a separate hard anatomical clip, so an eye-socket glaze cannot bleed onto the background.
- **Scope:** opt-in only ten observed F1 wax planes: near/far socket, near/far brow foundation, near/far superior orbital undercut, near/far lower eyelid and near/far lower-lid pigment margin. The source's fully opaque skin, eyebrow hair, dark upper lash root, irises/pupils and background hair are unchanged. The Storybook folder and native 608×1082 inspection cameras are unchanged.
- **Rendering contract:** `registry/video/materials/crayon-scene.ts` typed inspector, `crayon-scene-react.tsx` prop forwarding, `crayon-react.tsx` mask compositor. The mask reuses the same local filter, not a new per-feature blur kernel.

## Direct source-matched deterministic comparison

Independent **ArtCraft 9.1** `artcraft/skills/artcraft/scripts/portrait_fidelity_gate.py` run on pixel-perfect **matching** source/render crops from the native Chromium artifacts (V5 [run 43744546963](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43744546963); V6 [run 43746428751](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43746428751)). These scores compare a photograph and wax illustration. They are useful regression indicators only, NOT artistic accept/reject evidence by themselves.

| Region/crop in source 608×1082 | V5 SSIM | V6 SSIM | V5 edge-error ratio | V6 edge-error ratio | ArtCraft portrait gate |
| --- | ---: | ---: | ---: | ---: | --- |
| near eye [185,450,346,603] | 0.4420 | **0.4494** | 2.8100 | **1.8027** | **FAIL** |
| far eye [386,422,488,573] | 0.3321 | **0.3560** | 2.8541 | **2.3465** | **FAIL** |
| face [100,285,505,870] | 0.5617 | **0.5636** | 4.0757 | **3.6382** | **FAIL** |

Native 299 PNGs demonstrate that the sharp purple polygon outline under the near eyebrow is visibly reduced; the source/reference eyelid shape is still not faithful. The upper lash/iris remain too graphic, the exposed left sclera too bright and large, lower lid/brow still have unobserved angular marks, and the full face/neck/nose/mouth are too flat. **Current art gate: REJECTED.**

Test coverage:
- `tests/crayon-artcraft-cc0-full-face.test.tsx` verifies exactly ten source-authored feather regions, face-attachment, mask DOM, opt-out solid silhouettes, and rejects malformed options (opaque, unbuilt, zero blend, invalid type).
- `tests/e2e-artcraft/crayon-adult-face.spec.ts` independently checks ten physical SVG masks and no masks on opaque anatomy **in native Chromium at 299**. The whole 608×1082 F1 scene, near and far eye macros, hair, color application and three construction times are also captured.
- **All three workflows at implementation head `719e645f376c99a942ef571437d9e589cce9345b` passed:** [changed TypeScript/unit tests](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43746428728), [native crayon grammar](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43746428732), [source-native Chromium screenshots](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43746428751).

## Next required craft priorities

1. **Source-specific asymmetry** at near tear duct: darken/submerge the unnecessary outer sclera and match the photographed lash cast/iris overlap while preserving all 18 identity anchors. Deep shade should be deposited as wax, not a uniform charcoal stroke.
2. Replace remaining pointed lash ticks with grouped, curved and irregular rooted fibers; compare at the final on-screen scale as well as 3×.
3. Restore upper-lid and eye-socket soft anatomical continuity and realistic brown iris surface; avoid adding cosmetic texture to conceal geometry.
4. Major facial consistency: cheek→nose value transition, lips, jaw-to-neck; independently run actual ArtCraft human anatomy and deterministic gates, then final-speed animation review.
5. **Do not merge PR #281** until the independent visual, reference-contour and motion gates pass. Native technical tests cannot approve the portrait.

