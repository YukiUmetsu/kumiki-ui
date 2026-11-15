# ArtCraft v6 — scroll reader's cap / topknot / tied silk

**Date:** 2026-11-14  
**Scope:** One character part only. `river-scholar` face component `hair`, including its nested tied silk ribbons. No changes to the face/jaw, arms, hands, body/height/width, other two scholars, stage or motion.  
**Source:** User-supplied full 1672 × 941 painting, `ChatGPT Image Nov 14, 2026, 11_57_14 AM-2(1).png`. This is the identity/reference image, not a generic historic cap photograph. Its pixels **are not checked into this repository**. The source is a three-quarter painted illustration, not an orthographic pattern.  
**Technique comparison:** Ding Yunpeng's *Baimiao Lohans* (Princeton University Art Museum, https://artmuseum.princeton.edu/art/collections/objects/40597), Asian Art Museum *Linear techniques for figure painting* (https://education.asianart.org/wp-content/uploads/sites/6/2019/09/Brushstrokes.pdf). These establish useful line-weight and contour principles, **not** the exact reader's identity or textile cut.

## Exact observed reasons the previous art fails

The previous source-built reader still had a helmet-like upper contour, an almost straight dark diagonal forehead band, and broad horizontal ribbons. The front band **rose to screen-right**, whereas the teacher painting's front edge **descends softly to screen-right**, stopping just above the far eyebrow. There is a tall, rolled **front lobe**, a shorter **rear lobe**, a small **left rear cloth wing**, and a common tied ribbon root. The two ribbons are **narrow, curved, and fall left/down**, tapering into the paper rather than becoming solid rectangular strips. The lower cap needs an explicit, thin inked seam instead of a second constant-width dark bar. Ear and eyes remain visible.

This is observed at the original teacher-image face crop and at the **actual Chromium Storybook reader-face screenshot** on the PR branch (not inferred from code comments). The earlier screenshot remains a baseline comparison; it is not called an acceptable art render.

## Source-to-geometry contract

`src/video/ink-shanshui-reader-crown.ts` contains the complete `READER_CROWN_STRUCTURE` and `readerCrownRegions(detail)`. All coordinates are in the existing **260 × 340 portrait design space**, so the current face/head/hair rest transforms remain authoritative.

| Semantic region (back → front) | Source-derived construction and connection | Critical failure to reject |
| --- | --- | --- |
| trailing-silk | Two narrow ribbon paths, roots ~(121,78)/(119,83), tails falling **left/down** toward x=45..78, y=110..126 | Detached ribbon root, straight horizontal wide stripes |
| rear-tie-wing | Small black/brown left wing behind the band, attached near (115,70) | Third large geometric ribbon or independent floating oval |
| sideburn | Opaque narrow hair shape behind the reader's **foreground ear**, under headward band | Hair cutout that cuts through skin or hides ear |
| rear-topknot | Right lobe with convex bulb and nested dark fold shading, rooted in crown | Sharp four-sided brown polygon |
| front-topknot | Distinct taller forward lobe with weighted dark underfold, attached at (143,58) | Symmetric cylinder / one ellipse |
| cap-shell | Curved crown envelope bridges lobe to the wrapped brow band | Floating topknot, straight polygon sides |
| forehead-band | **Soft down-right** hem from roughly (112,82) to (170,91), front of crown and above brows | Rising-to-right helmet strip, opaque eyebrow occlusion |
| fold-lines | Three dominant pressure-tapered lines from bound left edge, not uniform hatches | Random evenly spaced stripes |
| dry-ink-grain | Tiny low-opacity curved marks only within the cloth, high detail tier | Noise mask that hides anatomy |

Draw order is deliberate: ribbons and sideburn → overlapping lobes → crown → front hem → tapered ink marks. Large primary cloth shapes are **opaque**; low-alpha tonal marks do not make the character see-through. The hair retains its original `head`-child motion channel and is intentionally **not** re-rigged this pass. Existing ears, pupils, eyelids and speech visemes remain unaffected.

## Inspection sequence and evidence

1. Source observed at full scene, cap crop and enlarged ink-line crop. Storybook *Reader Face Studio* captured **before** editing. Local evidence board: `artcraft_crown_reference_vs_current.png` (working-session output; source pixels not added to git).
2. Constructed nine source-reasoned Bézier region groups and original pressured line marks. Source maps are structural reasoning, not automatically traced pixel-accurate masks.
3. `Reader Face Studio` includes a **crown-region selector** that can isolate each layer, a 0–100% craft slider and unchanged eyelid/viseme controls. The existing actual rendered face appears alongside the isolated cap macro; PNG source may be overlaid from the user's own browser without upload.
4. Vitest verifies nine regions, opaque cap bodies, slope direction, contiguous intended attachment data, detail density thresholds, and that face/body/other figures stay unchanged. Browser tests capture both the full and isolated cap in the **real production Storybook renderer**.
5. Compare same-frame original vs revised cap/face at 1× film and macro sizes. **No merge if the cap still reads as a flat bonnet** or obscures expression. For source-vs-render statistics, the cap/ribbon contour topology, directional silk flow, varied ink pressure, and tonal microtexture are applicable; band spacing rhythm is **not applicable** because folds are not a repeating decorative motif. Pixel-wise SSIM of entire unmatched scene is **not a valid indicator** of this source-specific part.

## Honest limitations

The user's painting was likely digitally created and does not provide seam patterns, fabric thickness or underside viewpoints. The precise invisible tie mechanism and separate lobe depth are artist interpretations. The target is **source-informed workmanship**, not a literal tracing. Current SVG paths are static original craft pieces driven by one existing hair rig transform; flutter dynamics and articulated ties remain later independent work. Automated checks establish mechanical consistency only. A human artist must still review visual similarity.
