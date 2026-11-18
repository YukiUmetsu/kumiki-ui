# FLORA1 — plant anatomy framework for any art style

**Registry item:** `plant-anatomy` (shared pieces in `art-foundations`) · **Files:** `registry/anatomy/plant-*.ts(x)` ·
**Storybook:** Video production → Art Foundations → Plant Anatomy (Sheet, Seasons, Growth forms, In season, Crown and bark detail; FLORA2 stories) ·
**Skill:** [kumiki-plant-anatomy](../../skills/kumiki-plant-anatomy/SKILL.md) · **Research:**
[plant anatomy framework, 2026-11-15](../research/plant-anatomy-framework-2026-11-15.md)

FLORA1 holds what stays true about a plant in every art style, so a mountain cherry drawn in pencil, woodblock, ink or
paper has the same architecture:

- a zigzag branch of elbows;
- five notched petals in clusters;
- bark ringed with lenticels;
- blossom with the red young leaves in April, orange leaves in November.

The style decides only how it looks. It mirrors ANAT1 (people) and ANIM1 (animals), and shares their foundation
module.

For plants in 3D, of any species, use the [flora engine FLORA2](flora-engine.md). It grows a plant from a profile measured from references.

## What it is for

- **Re-drawing a plant in another style.** Start from the species' `PlantSheet`: construction, silhouette, four
  seasons, leaf, flower, fruit, bark, calendar and the implementations that already exist (`styles`).
- **Growing scenery.** `growPlant(plantConstruction(id), { month, seed, wind, t })` gives a whole plant for a month.
  Use one seed per plant for a stable forest, and wind to make it sway.
- **Drawing a new plant.** Pick its growth form and record only how the species differs: sizes, leaf, flower, fruit,
  bark, calendar, colours.
- **Checking.**
  - `checkPlantData` keeps the records honest.
  - `measurePlant` and `checkPlantProportions` compare a drawing's crown and trunk with the species.

## Layers

| Layer | File | What it holds |
|---|---|---|
| Growth forms | `plant-forms.ts` | `GROWTH_FORMS`, 13 forms. Each holds the leader habit, bud plan, phyllotaxis, trunk, crown envelope, branch angles, droop and tip turn, orders and spacing, zigzag, foliage manner and Leonardo exponent. It also holds the form's wind behaviour and Cole's construction notes. |
| Organs | `plant-organs.ts` | `leafShape` (needle pairs, awl, scale sprays, ovate, lanceolate, palmate, fan, cordate, blade, sword, peltate, pinnate, lobed; entire, serrate or wavy margins), `flowerShape` (rosaceous with notch or point, camellia, composite, funnel, iris, lotus, raceme, plume, panicle, tubular, catkin), `fruitShape`, `barkMarks` (plated, strips, lenticels, smooth, patches, fissured, culm). |
| Species | `plant-species.ts` | `PLANT_SPECIES` (24): graded sizes with sources, architecture overrides, leaf, flower, fruit, bark, a calendar (leaf months, autumn, bloom, fruit), seasonal colours, sounds, culture, PD/CC0 references, `styles`. Also `findPlant`, `plantsInForm`, `inSeason`. |
| Construction | `plant-construct.ts` | `plantConstruction`, `growPlant`, `plantShapes`, `crownEnvelope`, `swayPlant`, `swayField`, `hangingChainHz`. |
| Crown and trunk in detail | `plant-crown.ts` | `crownDetail` (tufts, sky holes, edge leaves, willow leaves), `woodDetail` and `flareTrunk` (cylinder shading, bark, root flare, limb bases), `foliageLadder`, `CROWN_LIGHT`, `CROWN_DRAWING`, `TREE_SWAY`, `speciesSway`. |
| Checks | `plant-check.ts` | `checkPlantData`, `measurePlant`, `skeletonLandmarks`, `checkPlantProportions`. |
| Painters | `plant-react.tsx` | `PlantFigure` (silhouette, construction, colour; `detail` full, medium, low or flat), `TreePaint` (a detailed plant as an SVG group for scenes), `OrganFigure`, `PlantSheet`, `leafColour`, `seasonMonths`. |

## How a plant grows

**Units.** Plant heights; y up, ground at 0, the stem's foot at x = 0. The same seed always grows the same plant.

**Woody plants:**

1. **The stem.** A leaning, wandering line rises to the top (excurrent, or young trees), or to the fork where the
   great limbs part (decurrent trees). One limb usually leads.
2. **Primary branches.** They leave at nodes set by the bud plan:
   - opposite pairs;
   - spiral at the phyllotaxis fraction (2/5 for Prunus, 5/13 for willow);
   - whorls for pines.

   Their length reaches the crown envelope (cone, column, dome, vase, umbrella, layered, weeping…), shortened by the
   branch's turn toward or away from the viewer.
3. **Each branch's shape.** It bends under gravity and its tip turns up, or falls for weeping trees. Sympodial branches
   go out in curved steps, and forking (opposite) branches end in V-forks. Twigs under a level bough curve up toward
   the light. The twig repeats its bough at a smaller scale.
4. **Widths** follow Leonardo's rule (pipe exponent 2), scaled so the stem's foot has the species' trunk width.
5. **Foliage, blossom and fruit** follow the form's manner and the species' calendar:
   - leaves are half out in their first month;
   - autumn colour comes in the autumn months;
   - deciduous trees are bare in winter;
   - clustered blossom (cherry) forms clouds, solitary blossom (plum, peach) sits along the twigs;
   - wisteria racemes hang;
   - herbs and annuals are absent out of season, and winter grasses stand as straw.

**Bamboo, grasses, irises, herbs and water plants** have their own builders:

- bamboo culms with nodes and hanging leaf fans;
- arching blades with plumes and panicles (ripe rice droops);
- iris sword fans and scapes;
- leafy stems with flower heads;
- lotus leaves on long stalks above the water line.

**Wind** leans the plant downwind by height and swings long thin parts most, by the form's stiffness.

- Without `swayHz`, trees keep the original pace that existing scenes (UKIYO1) were timed to.
- With `swayHz: "species"`, the trunk sways at its cantilever frequency, f₀ ≈ k · dbh / H², about 18% slower in leaf
  (Jackson et al. 2019). Hanging willow twigs swing as chains of their own length: ω = 1.2024 √(g/L), so a 4 m curtain
  swings at about 0.3 Hz.
- `swayField` gives the same sway as a function of position. Detail grown once on the still plant moves with it.

## The crown and trunk in detail

`PlantFigure` in colour (and `TreePaint` in scenes) paints what photographs of single trees show. The detail follows
a painter's construction (J. Needham, *Studies of Trees*, public domain), with its values measured on CC0 and
public-domain photographs.

- **Tufts.** The foliage masses are tiled into tufts (sprays and twig clusters) on one grid, so overlapping masses do
  not multiply.
  - Each tuft is mostly leaves in the species' shape: pointed blades, five-lobed hands for maples, fans for ginkgo,
    needle wedges for pines, drooping lobes for cedar sprays, petals for blossom.
  - Darker leaves sit round its lower and far side, lit ones on the side toward the sun. Needham: "preserve the
    highlights on the edges of the sprays and tufts of leaves".
  - Layered sprays and pine pads are flat and tilted. No twig end is left bare while the tree is in leaf.
  - Spire conifers are clothed down the leader, so the trunk hides in the crown.
- **Light.**
  - Sunlight is filtered through the crown (Beer–Lambert along the path from each tuft out of the crown toward the
    sun; κ = 0.9 per crown radius, estimated from G = 0.5 and a crown leaf area of about 3.6).
  - Each tuft adds its place on its own mass, darker undersides, height in the crown, and skylight in the shade.
  - Colours follow a five-stop ladder measured on photographs. A species' leaf swatch anchors the 75th percentile.
  - On red-turning trees in autumn, lit tufts are redder and shaded ones oranger: brighter light makes more
    anthocyanin.
  - Blossom has a flatter ladder and no dark interior: petals scatter light.
- **Sky holes.** Openings are cut between tufts, more toward the rim and in the lower crown, until the sky seen
  through the crown reaches the measured gap. The gap is measured as on the photographs: the foliage closed over
  small gaps, then the uncovered share. Bodies are cut by the whole hole; lit leaves only by its middle, so they
  fringe it. Inside the crown the wood is dark (Needham's "bold black touches" where the trunk peers out).
- **Edges.** Single leaves, needle bursts or petals break the silhouette.
- **Willow.** Narrow leaves hang along the twigs, lit on the sun's side.
- **Trunk and limbs.**
  - They are shaded as cylinders (the terminator moves toward the dark edge as the sun comes round to the front),
    with a lit strip on thick wood.
  - The species' bark marks (plates, lenticels, strips, fissures, patches) are wrapped onto the front half and
    clipped to each branch.
  - The foot flares into the roots.
  - Each great limb swells at its base to the trunk's radius, so limbs grow out of the trunk and the V between them
    stays.
  - In rain the bark darkens (`wet`).
- **Detail levels.**
  - `full` for large figures; `medium` while moving or at sheet size; `low` for far trees (no single leaves).
  - A full crown is about 25–100 ms to build. The Seasons lab draws medium while the tree moves.

SKY1's `WeatherScene` paints its trees this way. Their detail follows their size on screen, they fade by Koschmieder
contrast, and they are lit from above under overcast and dimmed at dusk.

## Evidence

**Sizes** come from Wikipedia species articles (retrieved 2026-11-15) and are graded `reported` with the quoted figure.
Values not found there are `estimated`. The black pine plate is Siebold and Zuccarini's *Pinus massoniana*, which
Commons identifies as *Pinus thunbergii*.

**Months** are for Japan's main islands:

- **Reported where the source gives them:** plum blooms late winter and fruits June–July; kakitsubata blooms
  mid-April to mid-May; chrysanthemum flowers when days are under 14 hours.
- **Otherwise estimated.**

**Colours** are starting points read from references, not measurements.

## Limits

- Side views only.
- Crowns are tufts of leaf glyphs, not individual leaves in place. Leaves are drawn larger than life so they read.
- The drawings are more top-lit than the photographs: their mean foliage luma, top third over bottom third, is 1.4–2.2,
  against 1.26–1.62 measured.
- A crown is built once and moved by the sway field as a whole. Leaves do not flutter on their own.
- Flowers on whole trees are drawn larger than life so they read.
- Not covered yet: roots, fallen leaves, withered lotus (kare-hasu), ageing beyond young, mature and old, and forests
  (place several plants with different seeds).
