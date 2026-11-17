# BUG1 reference study: species compared with specimens and photographs (2026-11-17)

**Pack:** `small-creatures` (BUG1). **Spec:** [small creatures](../component-specs/small-creatures.md).
**Status:** agent study and agent review of renders. **Human visual review is not recorded.**

## Why

The first BUG1 drawings had correct body plans (six legs from the thorax, the tripod gait, wings by order). Their
characteristic parts were generic, though:

- The swallowtail's wings were seven-point polygons with a fan of stripes.
- The cicada's wings were pale and translucent; the aburazemi's are opaque.
- The stag beetle's mandibles stood up like rabbit ears.
- The mantis's wings were a thin stick.

For insects, these parts are how a species is recognised.

## Method

1. **Search.** Wikimedia Commons was searched by species, keeping bitmaps at least 900 px wide and recording every
   file's author and licence.
2. **Study.** The images were laid on two boards and studied for wing shape and pattern, head and mandible shape, and
   pronotum markings.
3. **Measure and observe.** The swallowtail was measured on a CC0 museum specimen photographed from above. The CC BY
   and CC BY-SA photographs were only looked at.
4. **Iterate.** Each change was rendered at 400–600 px with server-side React and then checked at the sheet's size
   (180 px).

## Sources

| ID | Subject | Author | Licence | Used for |
| --- | --- | --- | --- | --- |
| xuthus_0 | [*Papilio xuthus*, MZLU 00129145, dorsal](https://commons.wikimedia.org/wiki/File:MZLU-00129145_dorsal_(51008259851).jpg) | NSG group, Lund | CC0 | swallowtail: measured |
| xuthus2_0 | [*Papilio xuthus* on azalea](https://commons.wikimedia.org/wiki/File:Papilio_xuthus_120133286.jpg) | Yasunori Yamamoto | CC BY 4.0 | observation (living colours) |
| xuthus_1 | [Lepidoptera plate 7](https://commons.wikimedia.org/wiki/File:Lepidoptera_(10.3897-evolsyst.5.63435)_Plate_7.jpg) | Zahiri et al. | CC BY 4.0 | observation (other Papilionidae) |
| pieris_0 | [Small white](https://commons.wikimedia.org/wiki/File:Butterfly_Small_White_01.jpg) | Zeynel Cebeci | CC BY-SA 4.0 | observation |
| aburazemi_0 | [Large brown cicada](https://commons.wikimedia.org/wiki/File:Large_Brown_Cicada_23aug12.jpg) | 池田正樹 | CC BY-SA 3.0 | observation |
| aburazemi2_0 | [*Graptopsaltria nigrofuscata*, dorsal](https://commons.wikimedia.org/wiki/File:Graptopsaltaria_nigrofuscata_TPopp.jpg) | Tanja Popp | CC BY-SA 4.0 | observation |
| mantis_0 | [*Tenodera sinensis*](https://commons.wikimedia.org/wiki/File:Tenodera_sinensis_5_Luc_Viatour.jpg) | Luc Viatour | CC BY-SA 3.0 | observation |
| kuwagata_0 | [*Dorcus parallelipipedus* male](https://commons.wikimedia.org/wiki/File:Dorcus_parallelipipedus_MHNT_m%C3%A2le_L%27espici%C3%A9.jpg) | Didier Descouens | CC BY-SA 4.0 | observation (the genus's mandibles and head) |
| kabuto_0, kabuto_1 | [*Trypoxylus dichotomus* figures](https://commons.wikimedia.org/wiki/File:Trypoxylus_dichotomus_(10.3897-zookeys.813.29236)_Figure_4.jpg) | Ichiishi et al. | CC BY 4.0 | observation |
| ladybird2_0 | [*Coccinella septempunctata*](https://commons.wikimedia.org/wiki/File:Coccinella_septempunctata_Luc_Viatour.JPG) | Luc Viatour | CC BY-SA 3.0 | observation |
| sympetrum_0, hotaru_0, suzumushi_0, joro_0, cerana_0, ladybird_0 | further species photographs | various | CC BY / CC BY-SA | looked at; no changes needed this round |

The mantis search returned a living animal at an angle, not a top view: its wing covers are observed, not measured.
The stag beetle reference is a European *Dorcus*, the same genus as the Japanese *D. hopei*.

## Observations → rules

### Swallowtail, measured on the CC0 specimen

**Forewing**

- Triangular: the costa runs to the apex, then a nearly straight outer margin runs to the tornus.
- The inner margin is about 0.53 of the costa.

**Hindwing**

- A scalloped margin.
- A tail at vein M3, pointing out and back.
- A lobe at the tornus.

**Pattern:** black ground with pale-yellow marks.

- Forewing:
  - four streaks along the discal cell and two along the inner margin;
  - a postdiscal band of wedges, small near the apex and long near the inner margin;
  - a row of submarginal lunules.
- Hindwing:
  - the basal half pale, crossed by black veins, with a bar at the end of the cell;
  - a band of blue scales (seen on the living butterfly);
  - lunules, and pale crescents in the scallops;
  - an orange eyespot with a black pupil at the tornus;
  - a pale line in the tail.

**Rule:** the wings are built in vein cells.

- Veins run from the discal cell's end to points along the margin.
- `cellPatch(A, B, r0, r1, s0, s1)` fills the cell between veins A and B, from r0 to r1 of the way along them and
  from s0 to s1 across.
- `lunule` draws a crescent bowed toward the base.

Placing marks this way reproduces how a pattern is organised (bands follow the cells, lunules sit one per cell).
Hand-placed blobs would not.

### Cabbage white (observation)

**Seen**

- Rounded wings.
- A charcoal apex with a ragged inner edge.
- One black spot on the forewing in the male, two in the female.
- A dark spot on the hindwing's front edge.
- Grey dusting at the wing bases.

**Rule:** the veins branch from the discal cell; drawn from the root they looked like a fan.

### Cicada, aburazemi (observation)

**Seen**

- Opaque brown forewings, widest about a third of the way back, their tips well past the abdomen.
- Pale veins: long veins to a line of cross-veins about 0.6 back, beyond which they close the apical cells.
- Darker clouding between the veins.
- A broad head with small eyes at its far corners.
- The pronotum with a pale rear collar.
- The mesonotum raised in a cross.

**Rule:** a dedicated forewing outline, opaque, with pale veins, nodal cross-veins, apical veins and clouding. The
eyes shrink to 0.12 of the head, at its corners.

### Mantis, *Tenodera sinensis* (observation)

**Seen**

- Long, narrow wing covers (tegmina) folded flat past the abdomen.
- Brown, with a green stripe along the outer edge.

**Rule:** the tegmina are 1.5 times the body's width, with a green costal stripe and three fine veins.

### Stag beetle, *Dorcus* (observation)

**Seen**

- A broad, square head with small eyes at its sides.
- Mandibles curved in like calipers, each with a tooth on its inner edge.
- A pronotum about as wide as the elytra.

**Rule:**

- a square head polygon;
- caliper mandibles 0.32 of the body length, the tips turning in, with an inner tooth at about half their length;
- a wider pronotum.

### Rhinoceros beetle and ladybird (observation)

**Seen**

- The rhinoceros beetle's pronotum carries a short forked horn reaching forward over the head.
- The ladybird's black pronotum has white patches at its front corners; its eyes are small.

**Rule:** the pronotal horn is drawn over the head; the ladybird gets two white patches and small eyes.

## Remaining gaps

- The dragonfly's wing net is a regular grid, not real venation.
- The honeybee and bell cricket wings are plain.
- The mantis is observed from a side-on photograph, not a top view.
- Wing patterns exist for the two butterflies only.
- No human visual review is recorded.
