# Crayon ArtCraft — facial mark-making reference pass (2026-11-14)

**Status:** Experimental. Source geometry is authored in code. No artwork or reference image is embedded, traced or distributed. The adult face remains an unapproved `!dev` Storybook workbench, under the existing **Video production / Film Looks / Crayon** root.

## Selected reference comparisons

| Reference | Observation | Specific implementation decision |
| --- | --- | --- |
| [Naomi Duben — Oil Pastel Drawings](https://www.naomiduben.com/oil-pastel-drawings) | Eye close-up: distinct upper lid weight, cool iris and warm facial plane; strokes turn with the form instead of a repeated grid | Separate, asymmetric near/far orbital and tear-trough stroke fields; preserve existing painted sclera, iris and limbal rings |
| [Caran d'Ache NeoArt portrait in progress](https://community.hwabang.net/painters/%EA%B9%8C%EB%A0%8C%EB%8B%A4%EC%89%AC-%EB%84%A4%EC%98%A4%EC%95%84%ED%8A%B8-6901%EC%98%A4%EC%9D%BC%ED%8C%8C%EC%8A%A4%ED%85%94-%EC%9D%B8%EB%AC%BC%ED%99%94/2145) | Soft, luminous facial volume with colored planes and visibly directional drawing marks in hair and neck | Introduce controlled intermediate-value hatching rather than more high-contrast outlines |
| [Caran d'Ache Neocolor II creative portrait](https://www.jerrysartarama.com/caran-d-ache-neocolor-ii-water-soluble-artists-wax-pastels) | Bold chroma and dense pigment layer contrast against less worked paper | Retain opaque parent undercoat and clip surface strokes to the face; no transparency leaks |
| [J. A. Barhydt, *Crayon Portraiture*](https://www.gutenberg.org/cache/epub/30248/pg30248-images.html) | Traditional instruction emphasizes direction-sensitive face strokes, graduated shadows and preserved lights | Place philtrum, lip and chin strokes locally rather than a generic face overlay |
| [Philadelphia Museum of Art, *Descriptive Terminology for Works of Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) | Wax marks show uneven, cohesive deposits; consistent solid digital lines alone do not imitate the medium | Reuse seeded `crayonFormHatching` with broken local marks; keep native wax layers |

## Implemented

Seven new, deterministic `crayonFormHatching` beds: near/far brow-orbit planes, near/far under-eye troughs, philtrum, lower lip and chin. These are semantic contour elements parent-clipped to the real, opaque face, with separate seeds and density driven by ArtCraft `detail`. They follow both 16:9 and 9:16 character placement without new Storybook groups or runtime dependencies.

## Remaining artistic gates

1. Inspect *actual* final-frame and halfway-rendered SVG/film at native resolution in Chromium, including eye and mouth crops, both aspects.
2. Compare lid thickness, catchlight scale, tear-duct placement, mouth volume and facial proportions with the selected references.
3. Decide whether underlying anatomy needs a wholesale reconstruction; more marks are not a replacement for correct form.
4. Examine normal-speed motion and external human visual review. **No artistic acceptance is claimed by this PR.**

Recommended local checks: `npx vitest run tests/crayon-artcraft-reference-grain.test.tsx tests/crayon-artcraft-adult-face.test.tsx`, `npx tsc --noEmit`, and the existing manually dispatched Crayon browser proof workflow.
