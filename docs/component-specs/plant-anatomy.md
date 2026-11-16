# FLORA1 — plant anatomy framework for any art style

**Registry item:** `plant-anatomy` (shared pieces in `art-foundations`) · **Files:** `registry/anatomy/plant-*.ts(x)` ·
**Storybook:** Video production → Art Foundations → Plant Anatomy (Sheet, Seasons, Growth forms, In season) ·
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
| Construction | `plant-construct.ts` | `plantConstruction`, `growPlant`, `plantShapes`, `crownEnvelope`. |
| Checks | `plant-check.ts` | `checkPlantData`, `measurePlant`, `skeletonLandmarks`, `checkPlantProportions`. |
| Painters | `plant-react.tsx` | `PlantFigure` (silhouette, construction, colour), `OrganFigure`, `PlantSheet`, `leafColour`, `seasonMonths`. |

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
- Foliage is massed (pads, clouds, sprays), not leaf by leaf; individual leaves are placed only for bamboo, herbs and
  vines.
- Flowers on whole trees are drawn larger than life so they read.
- Not covered yet: roots, fallen leaves, withered lotus (kare-hasu), ageing beyond young, mature and old, and forests
  (place several plants with different seeds).
