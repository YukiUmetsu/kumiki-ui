# BUG1 — insects and small creatures for any art style

**Registry pack:** `small-creatures` (depends on `art-foundations`)
**Files:**

- `registry/anatomy/bug-data.ts`: body plans, wings, wingbeats, the tripod gait, 14 species.
- `bug-construct.ts`: top-view drawings, `bugTopView`.
- `bug-react.tsx`: `BugFigure`, `BugMotion`, `BugSheet`.

**Storybook:** Video production → Art Foundations → Insects and Small Creatures → **Sheet**, **To scale**, **In motion**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.
**Reference study:** [species compared with specimens and photographs](../research/small-creatures-reference-study-2026-11-17.md)
(a CC0 museum specimen of *Papilio xuthus*; observation of cicadas, the mantis, stag and rhinoceros beetles, the
ladybird and the cabbage white).

## Body plans (`BUG_PLANS`)

- **Insect.** Head, a thorax of three segments, and a segmented abdomen. Six jointed legs (coxa, trochanter, femur,
  tibia, tarsus, claws), all from the thorax, one pair per segment. Wings from the second and third thoracic segments.
  Two antennae.
- **Spider.** Cephalothorax and abdomen. Eight legs and two palps, all from the cephalothorax. No antennae and no
  wings. Usually eight simple eyes.
- **Snail.** One muscular foot. Eyes on the upper, longer tentacles. A spiral shell, usually right-handed.

Each plan lists its common mistakes: legs on the abdomen, the wrong leg count, wings from the wrong segment, straight
stick legs with no knee.

## Wings, wingbeats, gait

- `WINGS` by order: scaled (butterflies close them upright), net-veined (dragonflies hold them flat, with a
  pterostigma), membranous, elytra over flying wings, one pair with halteres, and leathery tegmina.
- `WINGBEATS` (Wikipedia: Insect flight): butterflies 5–12 Hz, dragonflies 20–40, honeybee about 230, housefly about
  190, mosquito 300–600, midges up to about 1,000. `wingsOnFilm(hz, fps)` tells whether a camera sees separate poses
  (below fps / 2) or a blur.
- `TRIPOD`: insects walk on alternating tripods, L1·R2·L3 then R1·L2·R3.

## Species (`BUG_SPECIES`)

Fourteen species, each with Japanese and Latin names, size (length, and wingspan where it applies), colours,
proportions, season, behaviour, sound and sources:

- Genji firefly: 560 nm glow, flashing every 2 s in the west of Japan and 4 s in the east;
- red dragonfly; swallowtail; cabbage white;
- large brown cicada; Japanese honeybee; carpenter ant; seven-spot ladybird;
- Chinese mantis; bell cricket (about 4 kHz);
- giant stag beetle; rhinoceros beetle;
- Jorō spider; land snail.

## Drawing (`bugTopView`, `BugFigure`, `BugMotion`)

`bugTopView(id, { gait, wing, glow })` returns parts by role in millimetres, head up. `BugFigure` paints them with
glossy chitin, translucent veined wings, a glowing lantern and a contact shadow. `BugMotion` walks in the tripod gait,
beats wings at the species' rate (a blur where film could not resolve it) and flashes fireflies. Under reduced motion
it holds still behind a Play button.

**Butterfly wings** are built in their vein cells, as a lepidopterist reads a pattern. A vein is a line from the
discal cell to the margin. Each mark sits in the cell between two veins at a set distance from the base:
`cellPatch` draws bands and wedges, and `lunule` draws crescents.

- **Swallowtail (*Papilio xuthus*), measured from a museum specimen:**
  - a triangular forewing with a nearly straight outer margin;
  - a scalloped hindwing with a tail at M3 and a lobe at the tornus;
  - black ground with pale-yellow marks:
    - four streaks along the forewing's discal cell and two along its inner margin;
    - a postdiscal band of wedges growing toward the inner margin;
    - submarginal lunules;
  - the hindwing's base pale, crossed by black veins;
  - blue scales, lunules and margin crescents;
  - an orange eyespot with a black pupil, and a pale line down the tail.
- **Cabbage white:**
  - rounded wings with veins branching from the discal cell;
  - a charcoal forewing tip with a ragged edge;
  - one black spot on the forewing, a dark spot on the hindwing's front edge;
  - grey at the wing bases.

**Other species**

- **Cicada:** opaque brown forewings with pale veins to a line of cross-veins and the apical cells beyond, clouded
  between the veins. A pale collar on the pronotum and the mesonotum's raised cross. Small eyes at the corners of a
  broad head.
- **Mantis:** brown tegmina about 1.5 times the body's width, with a green costal stripe and fine veins.
- **Stag beetle:**
  - a broad, square head with small eyes at its sides;
  - mandibles curved in like calipers, each with an inner tooth;
  - a pronotum as wide as the elytra.
- **Rhinoceros beetle:** the head horn with its forked tip, and the pronotum's short forked horn reaching over the
  head.
- **Ladybird:** a black pronotum with white patches at its front corners; small eyes.

## Limits

- Top views only: no side views.
- Legs are polylines with widths, not modelled segments.
- Wing patterns are drawn for the two butterflies; the dragonfly's net is a regular grid, and other species' wings are
  plainer.
