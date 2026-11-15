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
