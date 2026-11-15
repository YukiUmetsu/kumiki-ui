# Chinese Ink figure faces — ArtCraft reference study (2026-11-14)

Status: **Original source-guided reconstruction in PR #194. Technical and visual acceptance separate.** The user's river-scholar teacher painting remains the **identity and pose reference**. The museum studies below are craft benchmarks, not substitute character identities.

## Curated primary-source artwork and techniques

| Reference | Access / rights | Specific lesson for code |
| --- | --- | --- |
| [Twenty-five bust portraits of famous scholars, Ming period, Met 55.37](https://www.metmuseum.org/art/collection/search/51810) | Met collection; verify download rights on work | Distinct face shapes across adults; complex non-mirrored eye-to-nose relationship; no generic single doll template |
| [Portrait of a Scholar, 17th–18th c., Met 48941](https://www.metmuseum.org/art/collection/search/48941) | Met object page labels image public domain | Mature scholar brow, downcast eyes and textured forehead; subtle 3/4 face volumes |
| [Ruan Zude, Portrait of Yizhai, dated 1561 or 1621, Met 59.49.1](https://www.metmuseum.org/art/collection/search/36081) | Historic work; check object page | Thoughtful gaze, cheekbone/nose continuity, gently pursed lips, individuality rather than stylized face icons |
| [Qiu Ying (attributed), The Sixteen Luohans, Met 1989.235.3](https://www.metmuseum.org/art/collection/search/44592) | Historic scroll; inspect object page | High-frequency expressive variable-pressure face and garment lines; extraordinary differentiation among facial types |
| [Shitao, The Sixteen Luohans, dated 1667, Met 1985.227.1](https://www.metmuseum.org/art/collection/search/49170) | Historic scroll; inspect object page | Descriptive human expressions at small scale, controlled dry black lines and subtle washes |
| [Portrait of a man in court robes, late 18th–early 19th c., Met 2021.324](https://www.metmuseum.org/art/collection/search/854220) | Historic portrait; object page may restrict photo | Eyelid thickness, iris/sclera contrast, believable nasal planes, skin modeling; note European-influenced convention, not automatically appropriate to earlier scholar |
| [Jiang Yun, Portrait of a Man, 19th c., Met 52.177.8](https://www.metmuseum.org/art/collection/search/51783) | Met labels image public domain | Individual eyebrow hairs, age and nasolabial rhythm, natural asymmetry |
| [Portrait of Huang Jianyuan, late 19th c., Met 894760](https://www.metmuseum.org/art/collection/search/894760) | Historic portrait; inspect rights | Cheek and nose tonal hierarchy, subtle lighting while maintaining an ink-and-brush appearance |
| [Ming/Qing portrait collection exhibition, National Museum of China](https://www2.chnmuseum.cn/exhibition/exhibition_series/temporary_exhibitions/classical_art_exhibitions/202204/t20220429_256191.html) | Museum research; don't embed without permission | Traditional line construction vs later highly modeled facial surfaces; chronology matters |
| [Admonitions Scroll, British Museum image 901936001](https://www.britishmuseum.org/collection/image/901936001) | Museum-held image; restricted reproduction uncertain | Earlier gestural, economical figure-face strokes; avoid over-rendering every plane as photographic realism |
| [Met, What's in a Face?](https://www.metmuseum.org/pt/perspectives/whats-in-a-face) | Museum commentary | Facial texture and small asymmetries matter for psychological specificity, not just added hatch count |
| [Met, Group Portrait in the Bamboo Grove, Luo Ping exhibition](https://www.metmuseum.org/exhibitions/listings/2009/luo-ping/photo-gallery) | Museum research | Gaze direction and subtly turned heads convey relationships; avoid static front-facing pupil placement |

Do not insert source pictures or traced paths into `registry/`. Research URLs are links only. A source's historical date does not automatically make its digital reproduction freely licensed.

## ArtCraft visual diagnosis of native Storybook baseline

Native baseline: `reader-face-three-quarter-rest.png` from Shanshui browser evidence, cropped to a 91×125 teacher/rig portrait design view and enlarged to a 376×470 Storybook panel.

- **Eye:** two hairline slits with almost no space for iris, tear duct, tarsal crease or the lower orbital edge. "Open" visually reads closed.
- **Nose:** a weak curved S without nasal-tip/alar-wing structural volume; line unrelated to subtle cheek plane.
- **Mouth:** thin arbitrary scratch, no asymmetric lip corners or philtrum, mouth states do not have consistent material relief.
- **Ear:** a spiral inside a single oval, no separate helix, tragus/concha and projecting lobe.
- **Brow and face:** near/far eyes almost symmetrical; brow lacks hair/pressure structure; face is a mostly flat fill. These gaps are visibly disproportionate to the deeply layered crown.
- **Film scale:** the face is small; high-frequency details must survive antialiasing. Do not add unrelated random skin speckles or deep wrinkles to a young reader merely to maximize feature count.

## Feature-to-construction map

| Region | Construction in original head-space, 260×340 | Macro/micro gate |
| --- | --- | --- |
| Near orbit | Opaque warm paper-tone almond opening, gently weighted upper lid, independent lower edge and medial corner; center around x126–127/y105–107 | Clearly open in **open** state, not a horizontal slash; upper iris remains under eyelid visually |
| Far orbit | Shorter, more foreshortened aperture x149–164; smaller iris; distinct upper and lower crease | Near eye visibly wider than far eye; no cartoon mirror copies |
| Nasal ridge | Tapered connecting bridge with translucent side-plane wash, actual tip, two asymmetric alar strokes, nostril tint | No detached double-S line, no face-disconnected nostril |
| Malar / chin | Three restrained cheek/jaw ink planes with little highlight reserve | 3/4 volume without deep geometric cheek blocks or transparent head |
| Ear | Helix root, concha, tragus, antihelix and curved lobe layers, all attached to existing exposed left ear | Distinct from circular swirl; remains in front of sideburn |
| Brows | Staggered follicle-length tapered strokes along nonmatching near/far arcs | Not thick rectangular parallel eyebrow decals |
| Lips | Light upper/lower relief and asymmetric corners compatible with all five speaking cels | Visemes stay individually readable; mouth doesn't float |
| Rig | All face/crown paths authored in same head-local coordinates; existing eye, pupil and viseme part IDs and pivots | Full `InkShanshuiFilm` expression cues + reduced-motion behavior survive |

**Implementation:** `src/video/ink-shanshui-reader-anatomy.ts` exports explicit semantic groups and a bounded, deterministic `readerFaceAnatomy(detail)`. `src/video/ink-shanshui-reader-face.ts` integrates the groups into existing assets, preserving the separate eyelid, pupil, mouth and ear parts. Existing body and garment assets remain untouched. Reader Face Studio adds a 6× cropped **live** face-anatomy panel within the same Storybook folder. Targeted unit + Playwright tests check structural contracts and render open/closed eye evidence.

## Acceptance criteria and known limitations

Compare rendered before/after screenshots under **the same scene, frame, face crop, color and final dimensions**. Extra path count is a guard against a blank mockup, **not** an art score. A style-guided original scene should not be assessed with unaligned pixel SSIM versus a different museum work. Review natural gaze direction, soft line pressure, junctions, eyebrow expression, nostril/ear placement and the face's visual age, both at enlarged crop and native 960×540 film size.

Still open even after the reader passes: the hermit and mountain walker have distinct older face plates that require separate identity-preserving craft studies, the production actor may have little facial screen area at wide landscape shots, and head-turn animation needs view-specific artwork rather than just rotating a single planar face. Do not merge based solely on typecheck/CI success.


## First actual browser proof and second artistic correction

Initial scoped run `43661553129` completed the portrait Storybook tests,
including explicit iris visibility during open/closed eyelids and the normal
960×540 film exporter. The actual screenshots
`reader-face-three-quarter-rest.png` and
`reader-artcraft-eye-nose-lips-open.png` were inspected at their native
delivered pixel sizes. This is not a self-reported generator score.

**Observed:** The new eye apertures and curved irises read much better than
the previous hairline slits; nostril/alar distinction is visible and the
cheek has more depth. However, the macro-crop was improperly centered and
cut across the upper face while leaving excessive blank area. The mouth
still curved upward toward the far corner, incorrectly suggesting a smile
in a quiet reading pose.

**Correction:** Adjust the actual face microcamera to a tight
`112 71 48 34` head-space viewBox (266px tall) to account for the
source-fitted head-rest transform. Flatten the closed **rest** mouth's far
corner and rebalance its tinted relief; preserve a separate expressive
smile cel, its visemes and head rig. The reader model revision is
incremented to v9 for downstream asset identity.

**Unresolved:** the original teacher painting and external museum works
have different scales/compositions, so neither pixel similarity nor the
test's path counts prove source-fidelity. Reassess expression and eye
detail at both the corrected close-up and at 960×540; the scholar's head
occupies only a small fraction of a panoramic composition. A genuinely
cinematic figure shot still requires camera reframing, body-and-head turn
cel variants and tailored acting, not just extra paths.


## Second rendered art critique: no line-count vanity

The native browser proof from Shanshui CI `43662340858` confirmed that
the corrected microcamera now frames the entire face. The new open eyes
and gaze-dependent iris parts are visible. The reference-driven approach
is an improvement over the former near-closed slits, but an independent
art check still rejects the portrayal as fully resolved.

**What still read falsely:** The nose tip had several overlapping closed
arcs, forming an almost oval ring; two strong, long jaw-tracing marks
made a young scholar's cheeks look artificially scarred or aged; the
resting lip line still rose on the far side after the fitted -4° head
rotation.

**Third code pass (v10):** retain the painted single solid jaw contour,
remove the duplicate interior jaw pressure marks, replace the nose's
looped line with a shorter open bridge-to-alar stroke, lighten the old
underside shadow and flatten the rest lip to compensate for the actual
head's fitted rotation. The deliberately smiling viseme remains
separate; no head pivots, blink controls or garment geometry change.

This does **not** make the scholar museum-grade. Further high-return
work should be a canonical still comparison against the user's own
teacher painting, larger figure close-up shots in the film so the
features are actually visible, view-dependent facial cels for turns,
and full bespoke studies for hermit and mountain traveler.
