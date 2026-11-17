# Eyes in detail (ANAT1) — research, 2026-11-16

The owner asked for:
- bolder eye colours, from research into real ones;
- eye shapes from real people, selectable in Storybook.

`eye-detail.ts` adds 14 iris types and 11 eye shapes. The portrait now draws a real iris's structure and lights it like
the face around it.

Grades:
- **reported:** quoted from the source;
- **measured:** from photographs or data in the repository;
- **estimated:** chosen within what the sources support, then checked in renders.

## Iris colour, measured

Twelve public-domain or CC0 eye photographs from Wikimedia Commons (`EYE_REFERENCES`). Eleven are on the Reference
board under "eyes".

Method (`scripts/anatomy/measure-iris-colour.py`; it needs numpy and OpenCV and is not part of the build; it
reproduces these values on the Reference board copies):
- find the pupil as the darkest round blob, and the iris edge where the sclera's brightness begins. Five photos where
  that failed were placed by hand on a coordinate grid;
- average the colour in linear light in four rings: the pupillary zone, the middle, the outer zone and the limbal
  ring;
- use only the left and right sectors, clear of lids and lashes, skipping highlights and lashes.

| Photograph | Pupillary zone | Middle | Outer | Limbal | Becomes |
| --- | --- | --- | --- | --- | --- |
| eye-brown | #723025 (L* 29, a* +29) | #883b2b (L* 35, a* +32) | #773329 | #77565a | brown (chestnut) |
| eye-amber | #764f3d | #7a592e (b* +30) | #6f6860 | — | amber |
| eye-amber-light | #a4775a | #b68c62 | #bc9f76 | #b49d85 | amber, light brown |
| eye-pupil-blue (hazel-green) | #533d1f (b* +22) | #69542f | #746e68 | #757374 | hazel |
| eye-green-hazel | #5c5336 | #636245 | #5b5b47 | #69675e | hazel |
| eye-green | #5c624c | #7a7e5d | #74794d (a* −10, b* +24) | #797d4b | green |
| eye-chartreuse | #635b43 (b* +15) | #8d8a81 | #6a675c | #47433a | yellow-green |
| eye-central-het | #7c6b48 | #7b6e50 | #7a6b54 | #948273 | green with a brown centre |
| eye-grey2 | #525d5d | #5d6d6c (a* −6) | #5a6a6c | #647173 | grey-green |
| eye-grey | #7b7b72 | #838985 | #7f8380 | #858786 | grey |
| eye-blue-grey | #67666e (b* −4) | #7c7d83 | #75757b | #6b666a | blue-grey |
| eye-blue-green | #7d7256 | #73766b | #666259 | #6e6164 | (pupillary warmth) |

What the measurements show:
- The pupillary zone is warmer than the ciliary zone in green, hazel and blue-grey eyes: b* +15 to +22 against +4
  to +6. It runs out along the fibres; it is not a painted ring.
- Brown eyes reach a* +32. L* runs from 27 (chestnut) to 67 (light amber).
- Texture varies by 5–19 L* units round a ring.
- Iris colour is continuous, so the named types are points in it (Edwards et al. 2016, *Pigment Cell & Melanoma
  Research* 29:141–162, reported).

Lightness is set for the portrait's light. Blue and light blue are **estimated**: the set had no saturated blue.

## Iris structure (`irisAlbedo`)

Each element follows the anatomy of the iris surface:
- the pupillary zone inside a jagged collarette;
- the ciliary zone outside it, the two blending along streaks;
- light radial fibres (trabeculae);
- dark crypts near the collarette;
- concentric contraction furrows toward the edge;
- the dark limbal ring;
- the pupillary ruff;
- the odd freckle.

The cornea focuses light onto the side away from the light, so that side is brighter. The upper lid and lashes shade
the top third of the eye.

## Eye shapes

| What | Value | Grade | Source |
| --- | --- | --- | --- |
| Upper-lid crease | Malays 8.05 (men) / 8.56 (women) mm; Chinese 3.95 / 5.89 mm | reported | [Lu, Kadir, Ngeow & Othman 2017, *Sci Rep* 7:14819](https://pmc.ncbi.nlm.nih.gov/articles/PMC5665901/) |
| Double lid on both eyes | all Malays, 70.1% of Chinese (other samples: Japanese women 82–83%, Singapore Chinese women 66.7%) | reported | Lu et al. 2017 |
| Crease and epicanthal fold | in-fold, on-fold, out-fold | reported | Lu et al. 2017 |
| Inner intercanthal distance | 34.9 ± 1.4 (men), 31.2 ± 1.5 (women) mm | reported | [Alberto & Soriano 2024](https://pjohns.pso-hns.org/index.php/pjohns/article/view/2113), 300 Filipino adults |
| Palpebral fissure length | 32.6 ± 1.3, 31.1 ± 1.0 mm | reported | Alberto & Soriano 2024 |
| Canthal tilt | about 8.4° (76 Korean patients, mean age 23; no sex difference) | reported | [*J Korean Assoc Oral Maxillofac Surg* 46(6), 2020](https://synapse.koreamed.org/articles/1145916) |
| Opening height | 8–11.5 mm by population | reported | `BEAUTY_EVIDENCE` |
| Each shape's numbers | e.g. round 11 mm high; monolid no crease, fold 0.75, tilt 8°; in-fold crease 4.5 mm; deep-set 2.5 mm back | estimated | Within the ranges above, checked against the reference photographs |

The default face (no shape) keeps its measured average opening: 9.6 mm, tilt 4.2°, inner corners 31.8 mm apart, width
29.9 mm for a woman. The portrait draws its crease at the almond shape's 7.5 mm.

## What changed in review

| Defect | Cause | Fix |
| --- | --- | --- |
| Irises dull and dark | The iris was lit about half as brightly as the skin, as one flat colour | Lit like the face around it; real zones and structure |
| A hard pale disc beside each eye (faintly there before too) | The cranium ellipsoid stood about 6 mm in front of the recessed skin of the eye socket | The cranium stays 3 mm behind the face, 14 mm round the eyes |
| A skin strip growing into the eye openings | The forehead strip grew from every boundary above the eyes | Only the mask's outer boundary |
| Hair strands drawn over the eyes | The eyes and mouth are drawn, not in the depth buffer | They are solid to the hair |
| A target-like iris (orange disc in a green ring) | A narrow blend at the collarette | The pupillary colour streaks out along the fibres |
| Heavy black "eyeliner", comb-like lashes | A thick lash line, 120 identical lashes | Clumps of two to four, tapered, longest outside; a thin lash line; a pink waterline |
| Ripples on the brow and lids | Shadow-map acne | A finer map in close-ups, bias that grows where the light grazes |
| A red mark under a deep-set eye | A hard key shadow with skin scattering bleeding red into it | Soft key shadows (16 Poisson taps over about 1 mm): a softbox's penumbra |

## Limits

- The lids are the face mask's, moved and shaded: there is no full lid geometry with thickness, and no tear film.
- One iris pattern per type and seed, not an individual's.
- Shapes combine one at a time (a hooded monolid is a custom spec).
- Agent review only; no human visual review yet. Not an approved realistic portrait (AGENTS.md rule 14).
