# BUG1 — insects and small creatures for any art style

**Registry pack:** `small-creatures` (depends on `art-foundations`)
**Files:**

- `registry/anatomy/bug-data.ts`: body plans, wings, wingbeats, the tripod gait, 14 species.
- `bug-construct.ts`: top-view drawings, `bugTopView`.
- `bug-react.tsx`: `BugFigure`, `BugMotion`, `BugSheet`.

**Storybook:** Video production → Art Foundations → Insects and Small Creatures → **Sheet**, **To scale**, **In motion**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.

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

## Limits

- Top views only: no side views.
- Legs are polylines with widths, not modelled segments.
- Wing patterns are simplified.
