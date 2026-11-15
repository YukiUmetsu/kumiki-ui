# Classical Chinese figure painting → Kumiki character craft (INK6)

Research: 2026-11-14. Original source art only, no museum artwork frames or copyrighted moving footage packaged in the library. This pass extends the existing INK5 `ink-figure-craft` geometry and `CharacterPresenter` rig. The sources below were inspected as collection records/online painting images. Video/tutorial pages were located but **not** downloaded and decoded frame by frame; motion-quality claims must come from our own rendered video and subsequent direct comparison.

## Visual references and concrete transfer

| Source | Specific pictorial evidence | Character implementation |
| --- | --- | --- |
| [National Palace Museum, Liang Kai, *Immortal in Splashed Ink*](https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000969) | Finely rendered expressive face versus unexpectedly broad freehand garment washes and deliberately abbreviated contours | Teacher's robe gets asymmetrically loaded large wet pressure strokes; facial and pupil marks remain dry and extremely fine. Avoid outlining every seam at uniform strength |
| [Tokyo National Museum, Liang Kai, *Li Bai Strolling*](https://webarchives.tnm.jp/imgsearch/show/E0008311) | A figure communicates posture with a few sweeping garment contours and active paper-white regions | Use a few long, calligraphic vertical drapes; retain quiet negative spaces around the faces; prefer principal contour rhythm to dense uniform hatching |
| [The Met, Ren Xun, *Scholar in the Wind*](https://www.metmuseum.org/art/collection/search/49460) | Rapidly turning, thick-to-thin contours convey twisted wind-blown garments | Add two distinct articulated-sleeve fold vocabularies and pressure-swollen orchid-leaf brush marks, fixed to moving rig parts |
| [The Met, *The Sixteen Luohans*, attributed to Qiu Ying](https://www.metmuseum.org/art/collection/search/44592) | Controlled fluctuating folds and faint graded washes separate cloth, anatomy and individual figures | Separate fine neckline/knuckle contours, pale folds and occasional broad volume patches; keep faces distinct from robe material |
| [The Met, Liu Jun, *The Daoist Immortal Han Xiangzi*](https://www.metmuseum.org/art/collection/search/712098) | More naturalistic layered face and beard versus bravura, vigorous robe ink | Crisp near-hand / eye / mouth finish; dry-brush bristle splitting in beard and hair, not an indiscriminate global texture |
| [Palace Museum, 十八描](https://www.dpm.org.cn/lemmas/241509.html) | Documents classical clothing/figure line types, including 柳葉描, 折蘆描, 高古游絲描 and 行雲流水描 | Extend the canonical figure stroke vocabulary with `orchid-leaf` tapered large-belly shapes and `broken-reed` intentional interrupted contours; reuse existing `silk-thread`, `fold` and `dry-brush` |

For modern animation context, [Chen Hailu's study of Chinese CGI ink-painting animation](https://acas.world/wp-content/uploads/2022/12/Chen-Hailu_CGI-Ink-Painting-Animation-in-Contemporary-China-1989-2019.pdf) distinguishes Chinese classical ink-painting aesthetics from generic monochrome liquid ink. We used its conceptual distinction, but the document was not treated as verified frame-by-frame playback evidence.

## Design / implementation

- Canonical material generator `registry/video/ink-figure-craft.ts` now supports two additional explicitly named figure marks, both retaining stable stroke geometry on the character part's own pose matrix.
- The approved source painting table `INK_TRAVELLER_FOLDS` is reused unchanged by the walking/IK director and both-actor film, rather than duplicated.
- Original teacher and apprentice additions live in `src/video/ink-figure-classical-art.ts`. The teacher emphasizes broad washes, broken hem lines, beard hairs, face; the apprentice uses finer, more frequent cloth turns, hairline glints, cheek and finger marks.
- `makeClassicalInkFigure` creates a new pinned `revision` and leaves parent/child pivots, anatomical hierarchy, animations, mouth cues, facial expressions, original art asset provenance and original definitions untouched. `detail=0` returns the original shapes.
- Both actors use part-specific capillary wet/dry treatment: broad cloth wash edges, dryer hair, crisp pupils/eyes/mouth/hand, no blanket black-and-white filter.
- Interactive Storybook exposes `Ink figure detail` and `Ink figure contrast` on the existing two-actor Film Looks scene. The **same defaults** run in production FilmStage exports.

## Art-direction checklist and deferred production gaps

1. **Per-character identity:** independent face shape, hair, jaw silhouette and costume remain legible at 1× and 2× magnification. No assets copied from historical collections.
2. **Shape/cloth hierarchy:** a few high-contrast contour turns and large-light wash planes lead the eye. Dense contours should not make the garment look embroidered or digitally traced.
3. **Dry/wet differentiation:** beard/hair/fingers stay crisp against wetter robes. Inspect at full resolution for clipped bristle marks or over-softened facial expressions.
4. **Motion reliability:** ink marks follow canonical rigged parts, deterministic backward seeking, 16:9 and 9:16, no new animation clock.
5. **Visual acceptance:** CSS and unit tests only verify invariants. Capture multiple acting beats in real Chromium, encode the production MP4, inspect in motion and at crop details. Film quality is **not** approved solely by test results.

**Remaining highest impact:** split sleeves/forearms into actual multi-bone anatomy with verified hand-to-object constraints and cloth settling; precise character joint masking; more truthful deforming ink wash boundaries; expressive facial acting and authored nonhuman animal rigs. The current painted strokes improve material craft but do not themselves improve inverse kinematics or physical handoffs.


## Master portrait reconstruction · November 15 (ArtCraft follow-up)

**Reference selection and study**

- [Tokyo National Museum, Liang Kai: *Li Bai Strolling*](https://webarchives.tnm.jp/imgsearch/show/E0008311) — adult profile, deliberately irregular ink line pressure, highly resolved facial landmarks against economy of garments. The contrast between curved robe contour and abrupt foot marks is especially relevant to the currently overly symmetric Kumiki scholar.
- [National Palace Museum, Liang Kai: *Immortal in Splashed Ink*](https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000969) — ink-wash clothing masses, limited dark facial marks, unpainted paper as the brightest plane. The relationship between sparse anatomy and wet clothes is critical; no uniform black outlines on all parts.
- [The Met, Liang Kai: *Poet strolling by a marshy bank*](https://www.metmuseum.org/art/collection/search/40090) — restrained figure placement and long stillness. Do not replace negative space with extra ornament.
- [Japan Search: *The Poet Li Bai Strolling*](https://jpsearch.go.jp/en/item/cobas-141892) — explicitly distinguishes gently curved clothing contours, angular feet, and subtly different sleeve ink concentrations.

**ArtCraft topology, anatomy and medium decomposition**

- Earlier master at 4×: bald-looking oval face under a uniform cap, two identical inverted-smile eyes, button nose, generic smiling mouth, tiny triangular goatee; the symmetrical contour reads as a children's mascot, not an adult ink-painted scholar.
- Rebuilt **15 distinct original master sprite assets** in `src/video/ink-master-portrait-art.ts`: connected adult face and cheek bone planes, offset asymmetrical brows, open/soft/closed eyelids with pupil registration, nasal bridge/nostril connected turn, independently actuated mouth visemes, structurally continuous layered hairline/bun, and separated fine beard bristles.
- The body was recast as a connected asymmetric robe silhouette with **15 authored base ink marks** before the pre-existing wet/dry ArtCraft fold atlas; retains shoulder, waist, sleeve and hem attachment coordinates. The workflow is **ink masses → light bone-less washes → fine dry contours → controlled highlights**, not a global vector filter.
- No part IDs, parent hierarchy, speech/blink timing, gaze targets, leg IK or animator code were changed. `detail=0` restores the previous source assets; `detail=1` selects the real authored portrait rebuild. Both Ensemble and Character Director use `makeClassicalInkFigure`, avoiding separate concept art and production art.
- `Chinese Ink / Ensemble → Classical Figure Brushwork Close-Up` now includes a genuine **4.1× master facial inspection** in the same Storybook leaf, with real 16:9 and 9:16 production renderers. Screenshots capture expression, bow, and original `detail=0` controls for side-by-side critique.

**Explicit visual acceptance thresholds (manual after Chromium)**

1. At 1× and 4.1×, facial character must read as an adult, with no emoji eye symmetry, floating brows or disconnected upper hair/bun. The chin and beard should remain attached to the actual face through head acting.
2. At low `detail`, the old face remains unchanged for visual A/B. At high `detail`, brush masses have different value/edge and pressure hierarchy rather than uniformly black traces.
3. Portrait and landscape face crops must not clip the bun/chin; bow frames must not reveal detached parts. Assess a 4× crop and the *whole-film 1×* silhouette.
4. Passing TypeScript/Vitest/Playwright is not evidence of reference-level quality. Reject on visual inspection if the face or robe remains rigid, flat, too small or too symmetrical. Never claim historical re-creation or copied artwork.

All code-painted strokes are original and retain the existing asset provenance metadata. References are solely artistic/stroke-method evidence.


### ArtCraft second pass: native screenshot critique (PR #356)

The initial successful Chromium evidence from run `43690990615` was inspected
**as actual pixels**, not inferred from source path counts. The 4.1× landscape
face had improved eyelids and independent nose/cheek planes compared with the
baseline, but it still looked cartoon-like: an oversized cap-shaped head,
uniform mouth patch, mitten hands and heavily outlined robe. The portrait
bow screenshot was worse: the static foot-root close-up cut the turning
face against the **right edge** of the 405×700 review viewport.

The second pass accordingly:
- Shrinks the complete head **parent** to x=.87, y=.90 relative to torso,
  preserving all child eyes/nose/hair/beard/viseme transformations together.
- Replaces two mitten hands with original connected finger/knuckle and grip
  paint, without changing the existing real prop attachment to the rig.
- Corrects the close-up camera: resolve the actual `evaluateCharacter`
  eye anchor through `inkDesignToPaper` each frame so a bowed face moves
  *inside* the crop. This camera is **inspection-only**: normal Storybook
  cinema and both MP4 exports use the unchanged absolute film.
- Extends the source-identity and parent-pivot tests. Re-render landscape
  and portrait open-face + bowed-face close-ups before approving.

**Unresolved:** The full-film actors remain 2.5D cutout puppets with limited
head-angle sprite selection and physically simplified sleeve/hand joints.
Fine path count alone cannot earn a world-class artistic label. The release
gate must separately assess 1× acting silhouette, face anatomy and paint
texture after the new render.
