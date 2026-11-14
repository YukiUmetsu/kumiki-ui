# 35B — Watercolour / brush motion and craft reference audit

**Scope:** WM1 pressure brush + WM2 painted compositions.  
**Purpose:** inspect film craft before inventing shader effects or copying another studio's pictures.  
**Evidence status (2026-11-14):** creator-authored video descriptions, published technique chapters, still references, and paper research verified online. **No claim of downloading/watching each complete hosted film frame-by-frame.** Full motion reviews and image-level timing analysis are a separate, incomplete gate.

## 1. Reference films: production techniques, evidence and implications

| Reference | Publicly documented technique / review target | Gap or action in Kumiki |
| --- | --- | --- |
| [The Promise — SKAZKA / Matvey Rezanov (2019)](https://vimeo.com/350661229) | Sumi ink and watercolor imagery; ink becomes storytelling action, rather than a vignette pasted over footage. Creator credits, medium and noncommercial restrictions documented on Vimeo. | Ink-only native scene/object reveal, gesture-to-subject continuity, dark-to-light reserve and authored positive/negative paint. **Do not copy footage or soundtrack.** |
| [Travelling Through Brush and Ink — making-of (2017)](https://vimeo.com/224334164) + [film](https://vimeo.com/221351889) | Four classical Chinese painted worlds; handcrafted sets and frame-by-frame modeled stop motion; a modern human transforms into animals/plants, remaining narratively identifiable. | Character identity + medium transformation, terrain depth and painted scene parallax; not merely one watercolor shader on flat RGB. |
| [A Valsa Do Pódio — making-of (2013)](https://vimeo.com/80460866) | Director describes paper registration, watery acrylic ink, deliberately incomplete silhouettes, soft droplets/spots and ~1,400 individually painted frames in ~3 minutes. | Brush marks should frequently be incomplete, with purposeful gaps, variable opacity and occasional inverted luminance. Registrations must remain stable in capture. |
| [Rian Brown — DIG-TAC (2017)](https://vimeo.com/272402047) | Film -> print each frame -> hand ink/graphite -> re-film; 300–500 stills per 20 seconds, brushwork carries emotion and film motion. | Support source-image silhouette overlays and retained camera/motion semantics; add purposeful temporal paint cadence rather than random per-frame grain. |
| [Watercolor Animation Reel — Will Kim](https://vimeo.com/44131039) | Creator describes traditionally animated watercolor on paper, not an RGB watercolor filter. | Frame-to-frame character performance; drawn frames can change while paper-space pigment remains coherent. |
| [SKINDEEP — YUCA](https://vimeo.com/560454963) + [process interview](https://filmshortage.com/shorts/skindeep/) | Over 1600 individually painted watercolor frames and water-reflection filming. This is emotionally sensitive material and is a reference to production craft only. | Reflections, intermittent organic water distortion and real painted motion belong to a distinct material animation pass. |
| [Marmalade Fish — Pat Animation](https://vimeo.com/259881114) | Studio reports working with a watercolor artist who individually painted frames, then digitally edited them. | Keep authored art/cel source separate from editable timelapse/paint simulator; permit raster assets with explicit masks. |
| [Fig & Frame — Water](https://figandframe.com/case-studies/water) | Painted character performance integrated with body weight, posture and lighting of a painted landscape; selected film-in-progress excerpts. | Rig/body motion, contact shadows and hand-ink contour must share the same space and visual cadence. |
| [KHLOARIS 2020 compilation](https://vimeo.com/412900049) | Creator's map: 2D watercolor 00:00–00:02, 00:24–00:27, 01:13–01:18, 01:47–01:53; ink/paint 00:03–00:05, 01:21–01:23; digital watercolor 00:21–00:24. | Brand promo, documentary and educational subjects need custom silhouette binding, legible text, protected captions and scene direction. Referenced timestamps are **creator-supplied** and not independently frame-verified here. |
| [Watercolour Animation Short — Isabel MacLellan (2024)](https://vimeo.com/1034792154) | Watercolor stop-motion edited with Photoshop and Premiere; intimate narrative. | Separate authentic authored frame cadence from a 30 fps camera. |
| [Watercolor Painting Effect — Creation Effects](https://vimeo.com/813589290) | Watercolor look applied to footage; multiple paper and ink bleed overlays, matte/border choices. **This is distinct from painting a film frame natively.** | Support explicitly masked source images as compositing layers; do not claim automatic photographic watercolorization until tested. |
| [Watercolor Intro — graphicINmotion](https://vimeo.com/176274445) | Paint splashes, brush/reveal mattes, title and 3D camera composition; reveals in designed editorial sequences. | Native brush-to-title/scene transitions; real shapes and text must retain legibility during handoffs. |
| [A Life — Michaël Dudok de Wit (2004)](https://vimeo.com/1129809655) | Public film still: autumn tree avenue, long depth, small solitary figure, painterly washes and value separation. | Layered depth/controlled composition/camera over long, readable painted holds, not excessive animated paint everywhere. |

**Rights rule:** reference links and preview stills are **not** reuse licenses. Do not download/rebundle these films or reproduce their art, soundtrack, camera-by-camera storyboards, characters or proprietary brush designs in the product. All demo geometry in Kumiki is original.

## 2. Real media practice: tutorial checkpoints for inspection

| Source and chapter | Material evidence | Implemented / missing |
| --- | --- | --- |
| [Flor Kaneshiro — sumi-e brush pressure, direction & rhythm](https://www.domestika.org/en/blog/12976-tutorial-illustration-japanese-brushstrokes-with-sumi-e-technique) | Brush pressure, speed, direction, sliding tip and gesture rhythm are independent. | **WM1:** pressure/speed centerline, taper. **Missing:** brush tilt/orientation, distinct bristle bundles, brush-angle transitions. |
| [Erika Lancaster — wet on dry vs wet on wet](https://www.youtube.com/watch?v=PQSgi0tSb5s): 03:38, 14:04 | Dry glaze/lift and wet variagated bleed/bloom produce distinct edges. | WM1+WM2 separately stage deposition, spread and drying. **Missing:** pigment-carrying wet field and coupled color diffusion. |
| [Anica Art Studio — watercolor backruns](https://www.youtube.com/watch?v=tdZTRkxDCQE): 00:19, 01:34, 05:55 | Cauliflower/backrun forms when water intrudes into a partly drying wash. | Current WM2 has edge fringe and seeded granulation, **not** physically meaningful rewetting/backrun shape growth. |
| [Aaron Rutten — Realistic Watercolor in Procreate](https://www.youtube.com/watch?v=Y-cdJSfMAcg): 03:03, 05:52, 07:37, 08:05, 09:07, 10:27 | Fringe buildup, abrasive edges, color mixing, thin taper, watery runs and splatters should look unlike one another. | Add brush-family presets, mark grammar (fan/round/rigger/splatter), controlling actual stroke morphology rather than only opacity. |
| [Color with Kendi — messy watercolor, part 1](https://www.colorwithkendi.com/blog/messy-watercolour-procreate-custom-brushes-tutorial-part1): 10:13, 14:44, 15:32, 18:02 | Wet dark rim vs dry rough edge vs multiple dry brush loads. | WM2 adds edge pooling/reserve, WM1 has bristle skips. **Missing:** edge pressure from paper height/topology, bristle bundle shapes. |
| [Color with Kendi — part 2](https://www.colorwithkendi.com/blog/messy-watercolour-procreate-custom-brushes-tutorial-part2): 10:59, 13:15, 14:56, 31:35, 33:09, 36:35 | Pigment drop, dual-color bleeding, grained paper and wet detail each need distinct controls. | WM2 adds accent/glazing, paper-coordinates, negative masks. **Missing:** meaningful dual pigment coupling and droplet/flow field. |
| [Everything Watercolor — Addie Hanson / Uproot Brushes](https://www.woolypronto.com/live-sessions-archive/everything-watercolor): 09:03, 23:04, 34:28 | Broad wash background, painterly botanicals, color/edge control through subjects. | Validate WM2 across multiple subject silhouettes, not just one ink poster. |

**Source methodology:** The chapter times above come from creators' published chapter lists. They are instructions for later visual inspection, not fabricated timestamps based on unviewed frames.

## 3. Scientific model distinction

- [Curtis, Anderson et al., *Computer-Generated Watercolor* (SIGGRAPH 1997)](https://grail.cs.washington.edu/wp-content/uploads/2015/08/curtis-1997-cgw.pdf) describes translucent glazing, shallow-water flow, edge darkening, granulation, separation and pigment/paper interaction. The current WM1/WM2 approach is an *analytic stylization* and does **not** implement their fluid simulation or Kubelka–Munk pigment optics.
- [Herson, Paris & Michel, *Dripping Thin Films for Real-time Digital Painting* (2026)](https://doi.org/10.1111/cgf.70416) presents controllable film thickness, dripping and pigment advection/diffusion. If true flowing pigment becomes a requirement, consider a separate deterministic pre-bake, not a fragile SVG post-filter.

## 4. Critical gap ranking after comparing references with exported WM1 frames

| Priority | Observed problem | Corrective implementation | Acceptance |
| --- | --- | --- | --- |
| **P0** | WM1 nature and coastal illustrations show broad, ribbonlike semi-transparent marks instead of fully modeled silhouettes; useful but very limited genres. | **WM2** arbitrary path masks and authored paint-through, preserved paper reserves and detail paths; same renderer across nature, architecture, science, product. | Each genre reads immediately at 100% and mid reveal. |
| **P0** | Late strokes make earlier "dry hold" frame assertions false; premature art approval based on source tests. | Compute last wet-to-dry time; check only fully settled frames; browser capture both aspects. | Exact same rendered pixels (up to bounded Chromium subpixel errors) at fully dried seeks. |
| **P0** | WM1/WM2 are not a true wet-on-wet mixing system. | Build a fixed-grid, stable-seed paper wetness and pigment pre-bake with advection/diffusion and drying, or a rigorously compared approximation. | Two pigments visibly feather together, while dry-on-dry stays crisp; replay reproducible. |
| **P1** | Brush looks too vector-clean at wide scale; irregularity is mostly edge wobble and randomly placed dots. | Simulate bristle bundles, twist/tilt and tip splits with directional tooth sampling. Use measured swatch QA. | Wet round/flat/dry/rigger stroke closeups are visually distinct at 100% and 250%. |
| **P1** | Paper looks like sparse hairlines rather than sized cold-press relief; browser filters may cost too much. | Cache single paper relief in source coordinates, use multi-resolution sampled grain and benchmark alternate CSS/SVG/canvas approaches. | No shimmer in push-in/pan; 16:9 and 9:16 normal-speed export holds. |
| **P1** | No true brush-object→scene or image→wash transitions; only natural shape deposit. | Reuse source/target semantic silhouette in FilmStage slots, preserve identity over native material handoff, no generic wipe. | Source and target readable; no black flashes, disappearing subjects or ghosted captions. |
| **P1** | No character rig in painted space; cannot reproduce animation-wide grammar. | Apply material to existing puppet/character masks; rig pose/camera frame sampling independent of stable pigment texture. | Walk/blink/speak recognizable while paper grain remains stable. |
| **P2** | Lack of fully semantic templates, explicit palette and motion language for diverse films. | Document WM2 generic scene graph, image masks, vector captions, camera and recipe examples; then add user-authored SVG import. | New genres do not require modifying renderer internals. |
| **P2** | Physical realism beyond analytic approximation not verified. | Optional independent higher-quality pigment solver with deterministic frame pre-bake. | Match technique swatches before enabling a production preset. |

## 5. Implemented vs. unresolved

**Now authored on PR #154:** WM1 pressure ribbon material; WM2 generic SVG wash silhouettes with gestures, reserve masks, accent pigment, edge pooling, grain, brush and local/HTTPS masked source images; 4 original painted genres; 16:9/9:16 FilmDocument and production slot; readable undistorted SVG titles, restrained absolute-frame camera; technical tests.

**Not a released universal watercolor solution:** true fluid/rewetting, spectral pigment, automatic photo-to-paint, native style transitions, reusable painted character performances, imported arbitrary SVG authoring UI, comprehensive documentary/gallery QA, final art-direction sign-off. A source-in-code screenshot or passing TypeScript cannot substitute for normal-speed human film review.

## 6. Visual review checklist to accompany every captured WM2 film

- **Timestamps:** first clean paper, first paint gesture, pigment wet spread, 50% subject, completed subject, fully dry hold, immediate next cut. Do not pick drying holds before the latest detail finishes.
- **Geometry:** no geometry escapes safe captions; outlines describe semantic subject; rectangular masking and incomplete brush sweeps never erase a finished roof, bottle or organelle.
- **Material:** wet vs dry edge differs; secondary pigment glazes visibly; reserves expose the *paper*, not opaque white patches; no polka-dot spotting or mechanical parallel stripes.
- **Motion:** same frame after nonsequential seek matches visually; when static, no accidental boil/flicker; camera drift keeps paper and pigment in one coordinate system.
- **Export:** both ratios, normal speed in an encoded file, actual browser screenshots and frame audit warnings; no approval for non-played files.
