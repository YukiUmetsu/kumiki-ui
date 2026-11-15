# Crayon ArtCraft — facial mark-making reference pass (2026-11-14)

**Status:** Experimental. Source geometry is authored in code. No artwork or reference image is embedded, traced or distributed. The adult face remains an unapproved `!dev` Storybook workbench, under the existing **Video production / Film Looks / Crayon** root.

## Verified craft references (distinguish pastel media)

| Reference | Verified observation | Implementation implication |
| --- | --- | --- |
| [The Met: Henry Williams, *Mrs. Ichabod M. Cushman*](https://www.metmuseum.org/art/collection/search/13323) | Museum describes carefully blended pigment under directional pink pastel strokes on brow and cheek, and separate white strokes emphasizing ruffled fabric. | Compare blended undercoat against **selective** skin hatching, and preserve the difference between soft skin and coarse cloth. |
| [The Met: Maurice Quentin de La Tour, *Préparation for a Portrait of Louis XV*](https://www.metmuseum.org/art/collection/search/367557) | Museum describes an actual study of skull form, complexion and expression; different preparatory views were used before the final portrait. | Build expression/angle studies on the same coherent skull, not disconnected painted symbols. |
| [The Met: Clara D. Davidson, *Portrait of a Woman*](https://www.metmuseum.org/art/collection/search/17578) | Museum records a portrait executed in red chalk, oil pastel and chalk on toned paper. | Material overlap is a useful comparator, but no claim of wax-only or digital matching is warranted. |
| [J. A. Barhydt, *Crayon Portraiture*](https://www.gutenberg.org/cache/epub/30248/pg30248-images.html) | Public-domain historical guidance and portrait illustrations (including stipple face and broken background strokes). | Preserve a face/background stroke hierarchy rather than uniformly overlaying hatch marks. |
| [Naomi Duben, oil pastel portfolio](https://www.naomiduben.com/oil-pastel-drawings) | Artist describes layered vibrant oil-pastel artworks and shadow play. **Not verified as an eye-anatomy portrait reference.** | Use for layered wax appearance only, not for facial morphology claims. |
| [Caran d'Ache Neocolor II product documentation](https://www.jerrysartarama.com/caran-d-ache-neocolor-ii-water-soluble-artists-wax-pastels) | Describes a water-soluble wax pastel that can be used wet or dry. **This is not a portrait image reference.** | Reference material behavior only. Wet technique differs from dry CRAYON1 and must not be conflated. |

The previously cited third-party NeoArt portrait page could not be verified at review time and is not used as visual evidence. Dry powdered pastel, oil pastel and water-soluble wax pastel are related but **not interchangeable physical materials**.

## Native browser inspection — technical CI is not artistic approval

Inspected original source-rendered Chromium captures from [Crayon ArtCraft portrait proof, run 43669733186](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43669733186). Both aspects rendered, but the illustrated human is **not release-quality**: the nose reads as a faint symbol rather than bridged facial volume, the lips form a weak isolated loop, the facial mass is mask-like, the neck-to-jaw junction is abrupt, and the upper body ends in visibly truncated sleeves. The new direction-aware hatching is a *local medium correction*, not a remedy for those anatomy and garment problems. Do not expose this character as a production gallery example.

## Implemented

Seven new, deterministic `crayonFormHatching` beds with explicit **degree** angles: near/far brow-orbit planes, near/far under-eye troughs, philtrum, lower lip and chin. These are semantic contour elements parent-clipped to the real, opaque face, with separate seeds and density driven by ArtCraft `detail`. They follow both 16:9 and 9:16 character placement without new Storybook groups or runtime dependencies.

## Remaining artistic gates

1. Inspect *actual* final-frame and halfway-rendered SVG/film at native resolution in Chromium, including eye and mouth crops, both aspects.
2. Compare lid thickness, catchlight scale, tear-duct placement, mouth volume and facial proportions with the selected references.
3. Decide whether underlying anatomy needs a wholesale reconstruction; more marks are not a replacement for correct form.
4. Examine normal-speed motion and external human visual review. **No artistic acceptance is claimed by this PR.**

Recommended local checks: `npx vitest run tests/crayon-artcraft-reference-grain.test.tsx tests/crayon-artcraft-adult-face.test.tsx`, `npx tsc --noEmit`, and the existing manually dispatched Crayon browser proof workflow.
