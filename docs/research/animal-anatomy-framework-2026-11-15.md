# Animal anatomy framework (ANIM1) — research and findings, 2026-11-15

Owner's brief:

> Build an animal anatomy framework, like human anatomy, per animal or group of animals: shape range, colour theme, how
> furs are, list of body parts, sound effects, character sheet. Reuse assets for similar work and don't repeat
> yourself: find patterns and generalise animal characteristics.

The same session added a request:

> Bear, tanuki, mice, weasel, boar faces' proportions need improvements; learn from references.

## The pattern

Animals share far more than they differ:

1. **Body plans.** Ten mammal plans, five bird plans and fish cover every animal UKIYO1, RIG1, crayon, pencil and paper
   draw. A plan fixes the foot posture (plantigrade, digitigrade, unguligrade), the side-view construction, the gaits,
   rearing, the parts every member has, the coat regions and the footfall sound.
2. **One gait table.** RIG1 had its own gait timings, and UKIYO1 tuned its legs by eye. The footfall orders are shared
   by whole groups:
   - the transverse gallop of horses, cattle, deer, hogs and bears (Muybridge 1899: "the bear, raccoon and hog");
   - the rotary gallop of dogs and cats;
   - the half-bound of hares and weasels.

   `animal-gaits.ts` is now the single table; RIG1 imports it.
3. **Size sets the tempo.**
   - Dynamic similarity (Alexander & Jayes 1983) gives gait speeds from hip height: animals change gait at about the
     same Froude number.
   - Stride frequency falls as body mass^-0.14 (Heglund & Taylor 1988).
   - The per-gait factors on top of that are estimates.
4. **A species is a delta.** Each record holds:
   - sizes, each with a source;
   - proportions that differ from the plan, graded;
   - face, palette, markings, variants, sounds, culture and references.

## Sources and grades

**Sizes** come from Wikipedia species articles (retrieved 2026-11-15). Details:

- The Japanese raccoon dog uses the common raccoon dog's ranges, and the green pheasant the common pheasant's (recorded
  as such).
- The Kiso horse's withers height is 131.9 ± 4.4 cm.

**Shiba Inu.** The AKC breed standard (PDF, read in full) gives:

- height to length 10 : 11;
- chest depth one-half or slightly less;
- muzzle 40% of the head;
- a curled tail.

These are graded `reported`.

**Measured off plates and specimens** (`measured`):

- bear: Tanaka Yoshio's 1875 plate, Okuhida specimens;
- boar: Fauna Japonica pl. 20, della Bella.

**Everything else** is `estimated`, including the head-and-body splits. `checkSpeciesData` holds every species with a
reported shoulder height and length to trunk + neck + head ≈ head-and-body, within 15%. All 23 pass.

## UKIYO1 against the ranges

Measured off each creature's own standing contour (`ukiyoeBeastLandmarks`), with 10% stylisation allowed.

| UKIYO1 | Clearance | Chest | Trunk | Result |
|---|---|---|---|---|
| bear (before → after) | 0.18 → 0.32 | 0.82 → 0.68 | 1.46 → 1.21 | was short-legged; now in range |
| boar (before → after) | 0.23 → 0.45 | 0.77 → 0.55 | 1.55 → 1.10 | was short-legged and long; now in range |
| monkey, horse, deer, weasel | | | | in range |
| fox, dog, cat, wolf | 0.34–0.39 | 0.61–0.66 | 1.66–1.81 | long trunks, short legs |
| tanuki, rabbit, ox, mouse | 0.08–0.15 | 0.85–0.92 | | very short legs |

The second group shows a pattern: the shared quadruped rig makes every animal long and low. It is an open finding for a
later pass: compare each animal with its prints and decide where it is deliberate (the folk tanuki) and where it is not.

## Boar and bear legs

The changes:

- **Legs.** UKIYO1 `leg` went from 50 to 90 for the boar and from 56 to 79 for the bear.
- **Strides.** The boar's went from 0.78 to 1.4 and the bear's from 1.1 to 1.4. The longer legs sweep further, so the
  stride had to grow with them.

Planted-foot drift was tracked frame by frame on 32-frame renders.

| Gait | Before (px per frame) | After (px per frame) |
|---|---|---|
| Boar walk | 0.63 | 0.36 |
| Bear walk | 0.45 | 0.25 |
| Galloping (both) | 1.1–2.3 | 1.7–2.1 |

The gallop drift is inherent to UKIYO1's sine-swing run cycle. The ANIM1 construction has no slip in any gait, and a
test keeps it that way.

## Faces (owner's request)

References, all public domain or CC0, from Wikimedia Commons:

- **Bear:**
  - Kinloch's moon bear face (front);
  - the Omiya park and Okuhida photographs.
- **Boar:**
  - Fauna Japonica pl. 20;
  - Jan Fyt, *The Head of a Wild Boar*;
  - the Allen & Ginter card (MET DP836519).
- **Tanuki:**
  - Proceedings of the Zoological Society 1874;
  - Specht 1884;
  - the Genoa museum specimen.
- **Mouse:** CC0 photographs (House mouse 2808, 2732; Mus musculus 131536695).
- **Weasel:**
  - the Tokyo National Museum of Nature and Science specimen (Mustela itatsi);
  - Maruyama Ōkyo's weasel studies;
  - a Siberian weasel photograph.

What was wrong and what changed:

| Animal | Was | Reference | Now |
|---|---|---|---|
| Bear | A domed teddy head; a round tan blob of a muzzle and a smile, square on | Long tapering muzzle with a big nose; eye about halfway back; ears at the top corners; no smile | Flatter forehead, longer blunt muzzle and larger nose; square on, a tapering muzzle from the bridge to the nose and a straight mouth |
| Boar | Tall horse-like ears, a shallow head, the eye forward, a small face square on | Broad hairy ears laid back on the crown; deep jaw; eye about three-fifths back; square on, the head nearly as wide as the chest | Broad laid-back ears, deeper jaw, eye moved back; front face 1.3× and carried low |
| Tanuki | A fox's long snout with a mask band | Short pointed muzzle (eye about two-fifths back from the nose); the mask surrounds the eye and runs down over the cheek; pale brow and muzzle sides; full cheek fur | New `tanukiHead` and `tanukiFace` |
| Mouse | A dog's muzzle and long neck; small almond eyes with brows; a smiling koala face square on | A cone of a head, a large glossy black eye (about a seventh of the head), huge thin round ears just behind it, no neck | New `mouseHead` and `mouseFace`, bead eyes, neck −0.6 |
| Weasel | A dog's head, round ears on top, a bear-cub face square on | A flat wedge, short blunt muzzle, small ears low on the side, dark mask, white lip and chin | New `weaselHead` and `weaselFace`, low side ears |

The face numbers are recorded in `AnimalSpecies.face` (graded `estimated`: read by eye off the references). They drive
the ANIM1 construction, so the next style starts from them.

## Not done

- Front and back constructions in ANIM1 (styles draw their own).
- The long-and-low UKIYO1 quadrupeds listed above.
- Measured, not estimated, colours and faces.
- Recordings for most animal voices; the search terms are listed per species.
- No owner viewing review yet.
