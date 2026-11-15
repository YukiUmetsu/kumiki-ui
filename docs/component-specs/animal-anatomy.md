# ANIM1 — animal anatomy framework for any art style

**Registry item:** `animal-anatomy` · **Files:** `registry/anatomy/animal-*.ts(x)` · **Storybook:** Video production →
Art Foundations → Animal Anatomy (Sheet, Gaits, Body plans, UKIYO1 proportion check) · **Skill:**
[kumiki-animal-anatomy](../../skills/kumiki-animal-anatomy/SKILL.md) · **Research:**
[animal anatomy framework, 2026-11-15](../research/animal-anatomy-framework-2026-11-15.md)

ANIM1 holds what stays true about an animal in every art style, so the same fox can be redrawn as a woodblock
print, a crayon storybook or a pencil study without starting again:

- its body plan and construction;
- sizes and proportions with their evidence;
- its face;
- coat, colours and markings;
- gaits, sounds and culture;
- references, and where it is already drawn in the library.

The style decides only how it looks. It mirrors [ANAT1](human-anatomy.md) for people.

## What it is for

- **Re-making an animal in another style.** Start from the species' sheet (`AnimalSheet`): its construction, colour
  map, fur map, face, gaits and the implementations that already exist (`styles`).
- **Drawing a new animal.** Pick its body plan; record only how the species differs (sizes, proportions, face,
  palette).
- **Checking a drawing or a rig.** Read landmarks off the render or the rig, then compare them with the species'
  ranges using `measureAnimal` and `checkAnimalProportions`. A style may stylise, but on purpose.
- **Animating.** One gait table (`ANIMAL_GAITS`) drives RIG1, the construction and any style. Speeds come from body
  size, not hand tuning.

## Layers

| Layer | File | What it holds |
|---|---|---|
| Gaits | `animal-gaits.ts` | `ANIMAL_GAITS` (walk, amble, trot, canter, transverse gallop, rotary gallop, half-bound): footfall phases, duty factor, stride, lift, bob, pitch, spine flex, Froude number, suspension. `quadFootfalls`, `quadBody`, `footfallBars` (Hildebrand diagrams), `gaitSpeed` (dynamic similarity), `strideSeconds` / `strideFrames` (Heglund & Taylor). RIG1 imports this table. |
| Body plans | `animal-plans.ts` | `BODY_PLANS`: 10 mammal plans, 5 bird plans and fish. Each holds foot posture, the side-view construction (`PlanConstruction`), gaits, rearing, the parts every member has, coat regions, footfall sound and drawing notes. |
| Species | `animal-species.ts` | `ANIMAL_SPECIES`: 23 Japanese folklore animals. Each holds graded size and proportion ranges with sources, face, coat, palette (painted by region, tip, band or eye mask), markings, variants, eyes, parts, behaviour, sounds, culture, PD/CC0 references and `styles`. Lookups: `findAnimal`, `animalsInPlan`, `animalStyles`. |
| Construction | `animal-construct.ts` | `animalConstruction` (species or plan, low/typical/high pick, overrides), `poseAnimal` (standing or at `t` through a gait), `skeletonShapes` (silhouette layers and path data per coat region), `smoothClosedPath`, `tubePoints`, `headBodyLength`. |
| Checks | `animal-check.ts` | `measureAnimal` (landmarks → ratios), `checkAnimalProportions` (with a stylisation tolerance), `proportionRange`, `checkSpeciesData` (records agree with their own reported sizes). |
| Painters | `animal-react.tsx` | `AnimalFigure` (silhouette, construction, colour, fur), `AnimalSheet`, `FootfallDiagram`. |

## Coordinates and conventions

The construction uses these units and axes:

- **Units.** Quadrupeds are measured in shoulder (withers) heights; birds and fish in total lengths.
- **Axes.** y is up, the ground is at 0, and the animal faces +x.

Proportions:

- `trunk`: point of shoulder to point of buttock (the draughtsman's body length).
- Head-and-body length ≈ trunk + neck + head; `checkSpeciesData` holds every species to its reported sizes this way.
- `chestDepth`: withers to brisket.
- `legClearance`: ground to brisket. The two add up to about 1.

Evidence grades:

- **reported:** from a cited source (Wikipedia measurements, the AKC Shiba standard).
- **measured:** read off a public-domain or CC0 plate or photograph.
- **estimated:** no direct source.
- **plan:** the plan's typical value ±20%.

Faces are recorded by eye from the references, so every face carries `grade: "estimated"`.

Colours are starting points read from references. A swatch's `fill` says how the colour map paints it:

| `fill` | Where it goes |
|---|---|
| `area` (default) | Fills the whole region |
| `tip` | The end of the region |
| `band` | A stripe along it (spine, jaw, crescent, neck crest) |
| `eye-patch` | Round the eye |
| `accent` | Palette only (sheen, claws, spots) |

## Posing

`poseAnimal(c, { gait, t })` builds the leg chains on the plan's foot posture. Plantigrade legs stand on the whole sole,
digitigrade legs on the toes, unguligrade legs on the hoof. Each leg is then solved with a two-bone IK to the
carpus or hock:

- **Elbows and stifles.** Fore elbows bend back; hind stifles bend forward.
- **Swing.** The wrist folds the fore foot back under the forearm, and the hock flexes the hind foot forward.
- **Late stance.** The heel lifts and the foot rolls onto its toes.
- **Planted feet.** They sweep back at exactly the body's speed (`stride × fore-leg length` per stride, tested).
- **Reach.** At the ends of a long stance the leg straightens rather than letting the foot slide, and the body sinks
  onto its planted legs.

## Faces

`AnimalSpecies.face` records:

- the eye's distance from the nose;
- eye length, ear height and head depth, as shares of the head length;
- eye spacing square on;
- how the eye reads (bead, iris, slit);
- ear placement;
- the defining features, including what not to draw ("a bear does not smile", "not a fox's long snout").

The construction places the eye and sizes the ear from it.

## Applying it to a style (UKIYO1 example)

`ukiyoeBeastLandmarks(species)` returns the standing contour's withers, brisket, point of shoulder and point of buttock.
`measureAnimal(lm, false)` and `checkAnimalProportions(id, …)` then compare it with the species.

The check found that the boar's legs were less than half the measured clearance under the chest (0.23 against
0.40–0.57), and the bear's too (0.18 against 0.30–0.42). Both were fixed, and a test keeps them inside their ranges. The
Storybook story "UKIYO1 proportion check" lists every UKIYO1 quadruped. Its systematically long trunks and short legs
are open findings for a later pass.

## Limits

- Side view only for the construction; front and back views are the style's.
- Bird and fish constructions are simpler (body egg, wing, legs; spindle and fins).
- Most proportions are estimated; extend the `reported` and `measured` grades as sources are found, and never upgrade a
  grade without a source.
- Colours and faces are read by eye from references, not measured.
- Sounds list catalog ids only where a recording exists; the rest are Openverse search terms, and nothing is fetched at
  run time.
