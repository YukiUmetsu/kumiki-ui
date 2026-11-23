# Ink brush printed in riso spot colours (INK-RISO1)

Chinese brush ink (水墨) drawn on the CPU, shown as ink on xuan paper or printed as a two- or three-drum risograph. No DOM, no clock: the same spec and drawing always give the same pixels.

| File | What it holds |
|---|---|
| `registry/video/ink-riso-press.ts` | `createInkRisoSheet`, `brush`, `wash`, `knock`, `pressInkRiso`, noise and splines |
| `registry/video/ink-riso-pen.ts` | `createInkRisoPens` (local frames), `inkSplatter` |
| `registry/video/ink-riso-wet.ts` | `inkBloom`, `inkBlob`, `inkSide`, `inkHair`, `inkThread`, and `paintInk` (ink on xuan paper, no press) |
| `registry/video/ink-riso-coiffure.ts` | Hair forms: `inkGuideSheet` (hair laid along guide hairs read off a drawing), `inkCombSheet` (hair combed over the skull in 3D), `inkCoil` (a bun or a ribbon wound round a place, hidden sides left out), `inkHang` (a lock that settles under its own weight) |
| `registry/video/ink-riso-hair.ts` | `inkSweep` (one swept lock), `inkTress` (one lock of a form), `inkGap` (paper let into a mass), `inkPlies` (looser locks over one lock), `inkClumps` (loose locks over a sheet), `inkFlyaways` (single hairs that stand off a sheet), `inkWisps` (fine loose hairs between guides) |
| `registry/video/ink-riso-face.ts` | `poseInkHead`: every line of a face from one posed, measured head; `inkFaceRatios`, `INK_FACE_RANGE` |
| `registry/video/ink-riso-face-paint.ts` | `paintInkFace`, `paintInkEar`, `paintInkEarring`, `inkDab`: the brush marks over those lines |
| `registry/video/ink-riso-press-react.tsx` | `InkRisoCanvas` (`finish`: `riso` or `ink`) |
| `src/video/ink-wash-portrait-art.ts` | The example: 水月, a three-quarter figure on the ANAT1 East Asian face |

## How a picture is made

1. Each ink has two masters. `solid` takes line work and flat colour, and prints without a screen. `tone` takes washes, and prints through the drum's screen.
2. Draw back to front. `knock` clears the plates inside a shape first, so a figure is paper, not a tint of its background.
3. `pressInkRiso` screens `tone`, moves each drum by its registration, adds pinholes and mottle, and overprints the inks on cotton paper in linear light. `only` (or `drums` on the canvas) prints one drum as a proof.

## Rules that decide the quality

- **Screens.** With round dots keep `cell` near 3 units on a 1200-unit page and put faces on the solid master, or dots eat the features. The grain screen prints tone as coverage; at 0.5–0.6 units it carries a whole wet drawing, blush included.
- **Registration** of about 1 unit reads as riso at print size and leaves the face sharp. The red drum moves against the teal one, never against the black.
- **Where two inks meet, wipe one** (`pen.lift`) or they overprint to near-black. Leave that trap on purpose only.
- **Widths are page units**; points are in the pen's own units.
- **Flying white needs width.** Below about 12 page units a dry stroke looks broken, not dry. Start loaded (`dry` 0–0.3) and end at `dryEnd` 1.02 or more, so the stroke leaves instead of stopping.
- `pen.line` writes to the solid master, so a lock drawn later does not cover it. Use `inkThread` for anything hair passes over.
- Neighbouring opaque shapes must overlap. A sliver between two `knock` shapes shows what was drawn behind them.

## Faces: place first, paint second

1. Take a measured head (`beautifulFace`, or 468 MediaPipe-ordered points) and pose it once with `poseInkHead`. Do not place features by eye.
2. Check `inkFaceRatios(head)` against `INK_FACE_RANGE` before painting.
3. Paint with marks a wrist can make. A lid is one pressed stroke, an iris one wet dab, a brow a soft wet shape, lips two fills and a parting. Jewels and pins are `inkDab`, not shaded spheres.

What separated a plain face from an attractive one, side by side with ink portraits at the same scale:

- **Leave the skin as paper.** A tint over the whole face takes the light out of it. Colour goes on the lids and under the eyes, a breath on each cheek (0.13, wide and soft) and less on the nose's tip and the chin (0.06, 0.05). With no warmth there the face is a mask. Grey goes on the lids, beside the bridge, under the nose, under the lip and, barely, at the jaw.
- **Eye shadow is grey and warm together.** Read off a portrait as two plates, it is a brown of about 0.15 warm over 0.1–0.2 grey, not a red. It lies in three places:
  - Over the eye: deepest along the fold, gone at the brow, greyer on the far lid and in the corner by the nose, which the grey goes round.
  - Between the fold and the lid's line: nothing. That strip of bare paper is what lights the eye.
  - Under the eye: one narrow crescent, a little way below the lower lid, with paper between the two. It runs out and up to the end of the lid's line. A wide red patch down the cheek reads as a flush.
- **The fold is one fine line, well clear of the lid.** It stands about three quarters of the eye's opening above the lid's edge, in thin grey with a little of the warm plate, and begins and ends inside the two corners. The skin between the fold and the lid's line stays paper. A fold close over the lid, or a heavy one, makes the eye look tired.
- **An eye is longer and more level than it is open.** In the swap test (below) the eyes' shape and the outline weighed more than the shading. With the irises level, in distances between the pupils, on the near eye:
  - The opening at the pupil is about 0.13–0.15, a quarter of the eye's length. At 0.18 the eye is round and stares.
  - The upper edge peaks a little inside the middle (0.047 above the pupil's level) and slopes down to the outer corner. The painted line on it thickens outward as fast as the edge falls, so the *top* of the line runs level. That level top is what reads as calm.
  - The inner corner is a fine point just under the pupil's level (0.03), without a hook. It was at 0.06 to 0.08, and the eyes slanted.
  - The lower lid is the curve of a leaf: lowest past the pupil (0.114), then straight up to the outer corner. The thread on it is nearly lost on the nose side and is found again toward the corner, where it runs on into the wing.
  - The wing leaves the corner along the lower lid, rises to about the upper edge's height and stops. It is about a fifth of the eye and is part of the lid's line, not a flick put on its end.
  - The near and the far eye of a portrait are one front curve, turned (`LIDS`, `WING`, `FOLD` are drawn once). Points read off both eyes came back to the same front curve.
- **Lids that rest on the iris.** The upper lid covers about the top three tenths of it and the lower one just meets its foot (`open` 1, `gaze` 0.02 down). At `open` 0.8 the lower lid cut the iris and the eye looked sleepy; a whole iris with white above it stares.
- **Lashes** leave along the lid and turn away from it. The upper ones sit on the outer quarter, start inside the lid's line, and are longest at the corner: about a seventh of the eye. Further in they cross the paper strip and look like thorns. The lower ones sit on the outer half, alternate long and short, and lengthen outward. A lash's base is narrower than its middle, or it leaves a bead on the lid. Thick, even lashes look like thorns: about 1.5 units for the upper ones, 1 to 1.4, short and paler for the lower.
- **An iris is dark, with light in three small places.** Black at the top under the lid, at the rim and in the pupil; the lower half only thins a little (0.86) over a breath of the warm plate. The light is paper: a small touch beside the pupil, and two thin flicks of a dry brush round its foot, one long and one short, lifted off both plates. Wide pale crescents, or crescents of bare warm ink, make cat's eyes; one flat grey is a button.
- **One turn for the whole face.** The nose's tip, the mouth and the chin lie on one midline that leans the way the head faces. A nose turned further than the chin looks unbalanced, although each part is right alone.
- **The eyes look at the viewer** (`gaze`), not where the face points. Each iris then lies straight over the middle of its eyeball, which is about 14 mm behind the lids. That puts the far one at about 0.44 of the opening from the inner corner and the near one at 0.55.
- **The far eye and brow are the near ones, turned.** Both sides are drawn once from the front, on a mask that falls away from the face's middle (`wrap`), and turn with the head. The brows' mask stands about 10 mm in front of the lids'. The turn then does what portraits do:
  - The far opening is about three quarters of the near one, and nearly all of the loss is on its outer half.
  - The far lid peaks over the pupil and comes down to its outer corner. It does not flick up.
  - The far brow is short and lies close to level on the page: a low rise to a peak two thirds out, then a tail that comes down to about its head's height. It does not take the eyes' slant (`brow.roll` −1 against `eyeRoll` 2.7). With the eyes' roll its tail flew up.
  - On a bowed head the far eye slants more and the near one less (`eyeRoll`): about 12 to 14 degrees and 5 to 6, with the head upright.
- **Measure an opening and its painted line apart, in distances between the pupils.** The line runs on a quarter of the opening past the corner. Reading that tail as part of the opening made the far eye a third too long outside its pupil, and pulled its end up.
- **No line down the bridge, and no upright bands beside it.** Two parallel greys make a box. On the far side the grey is one curve: from the brow's head in to the root of the nose, level with the pupils, then out, and gone below the eye's corner. The middle of the bridge is nearly bare. The line at the tip then leans out to the wing. The near side is fainter and stays above the eye's corner.
- **The nose's foot is four marks, and the two nostrils are not a pair.** The far one is a wedge, thick at its outer end and thin toward the middle. The near one is an open arch of one thickness with blunt ends, about a third of the nose's width. A pale water fills the plane under the tip, and a rounded patch, as wide as a nostril and crisp above, sits on the lip under the middle. The near wing is a soft turn, not an outline. A pointed crescent for the near nostril, or one line through both, looks like a symbol.
- **The far outline is one stroke from under the hair at the temple to the chin.** It starts thin and may thin again, and it never stops: a gap there loses the face. It is a brush stroke, so its width changes by two to three times: thin at the temple, pressed a little at the cheek's turn, most on the straight run to the chin, and lifted as it passes under the mouth's near side. One even width is a technical pen's line.
- **The near jaw is a straight line, not an arc.** It leaves the chin at about 30° and stays straight to the jaw's corner below the ear, with one small bow. It is as dark and as thick as the far line (0.03–0.04 of the distance between the pupils) to past the mouth's corner, then runs out of ink over the next 0.15 and stops before the corner, which is left to the paper, with no shade on the neck that would draw its edge. A jaw that bends up early is an egg's, and a line that thins evenly all the way to the ear looks weak.
- **Chin and jaw are one curve.** The contour and the jaw are cut from one spline at its lowest point. Two splines that meet there leave a kink.
- **The throat meets the jaw under the mouth's near corner** and drops nearly straight. A throat stroke that starts further back, or bends in under the jaw, gives a thick neck.
- **The face is long and tapers straight to a small chin.** In distances between the pupils, level with the pupils' line, the far cheek stands 0.86 out and falls almost straight to the nose's foot (0.80 at 0.6 below), turns there, and runs straight to the chin. Level with the mouth the outline stands about 0.65 out on the far side and 0.97 on the near one; 0.15 above the chin it is 0.31 and 0.40. The near side can be that wide because no line is drawn at that level: the jaw below it is straight, the hair borders the cheek, and the corner is paper. The same width behind a round, drawn jaw (0.74 and 0.99) reads as fat. Do not widen the jaw to make a face look softer: use less shade there.
- **The hairline sits high and wide.** Its top stands 1.37 of the distance between the pupils above them (it was 1.13), and the near hairline stays clear of the brow's end.
- **The hairline is an edge of hair, not a drawn arch.** Its highest point is the foot of the part, off the middle toward the far side (0.12). From there it falls unevenly: along the far temple as the inner edge of one lock, and on the near side behind strands that cross it. One hard dome from temple to temple reads as a hill behind the face, whatever its height.
- **Low, long, soft brows** that start pale by the nose and end in a point. Charcoal, not black (`brow` 0.74): the lids' lines stay the darkest marks of the face.
- **Crisp lips, uneven colour**: darkest at the parting, lightest in the middle of the lower lip. The colour stops short of the corners and the parting's line runs past it. The corners stand above the middle (`smile` 0.24, the near one a little more): a level parting filled to its corners is a mannequin's.

`INK_FACE_RANGE` was read by hand on grids over five ink portraits by different hands. The ranges are guides for this look, not population data, and they do not certify beauty. They passed for five rounds while the face still looked worse than the portraits: they say nothing about values, warmth, edges, expression or the brush. To find which part is at fault, paste parts between the drawing and a reference, aligned on the pupils ([reference-match](../reference-match.md), `swap`; never in anything that is kept or shown): the portrait kept its looks with all our features in it, and ours was better with the portrait's whole face but still not as good, so most of the fault was the hair, the outline and the colour round the features.

| Ratio | Portraits read (low–high) | Example head |
|---|---|---|
| Pupils' line to chin ÷ outer eye corners | 0.86–1.06 | 0.89 |
| Nose to parting ÷ parting to chin | 0.48–0.53 | 0.48 |
| Upper lip's skin ÷ lips' height | 0.28–0.71 | 0.68 |
| Gap between eyes ÷ eye, with the lid's line | 0.89–1.11 | 0.89 |
| Nose ÷ gap between eyes | 0.63–0.89 | 0.72 |
| Mouth ÷ nose (the golden-ratio claim is 1.618) | 1.33–1.61 | 1.55 |
| Lips' height ÷ mouth | 0.41–0.62 | 0.46 |

- **Do not tune a drawing to a face detector.** MediaPipe put the drawn chin about 10 % of the face too low and nose wings up to 60 % too wide, and the same drawing scored 0.49 to 0.60 on one ratio at different render sizes. Tuning to it made the chin too short and the upper lip too long. Measure the drawing from its own geometry, and read references by hand.

## Hair: where it starts, then masses, then paper

1. **All of it starts from one short part.** Over the forehead lies a ragged strip of paper, narrow at its foot, that ends in a star of five to seven tapered points. Every lock leaves the strip and runs *along* the hairline before it leaves it: the crown up and over, the near side out along the temple, the far lock down past the far brow. Hair combed straight back from the whole forehead edge, with soft grey roots, is the look this replaced. It was the largest difference from the portraits.
2. **Draw the part by taking away.** Let the crown, the near side and the far lock overlap under it as solid black, then cut strip and star out with `inkGap`. Two masses painted up to a strip leave an even, blurred band.
3. **Read guide hairs, then build.** Read five to nine single hairs off a drawing in the levelled frame (`head.level`: middle of the pupils, their distance as 1), each from its root to its end, and give them to `inkGuideSheet`. `lock` and `run` on that sheet then draw any lock or hair between two guides. `inkCombSheet` and `inkCoil` are the 3D way, for a head that has no drawing to read from or that must turn.
4. **Big shapes first.** One crown, one near side in four to six lobes, one bun with a wrap round its foot, one far lock, one fall. The base lobes are solid (`load` 0.9, `streak` 0.34): crown and fall are 0.97 covered. Then add paper, then single hairs. A lock laid over another replaces it (`inkHair` `cover`); a glaze opens a pale line in the dark below it.
5. **Paper is a wedge, not a thread.** `inkGap` is wide where two locks part, near the tie, and points into the mass. Lobes must overlap until that point, or a long even white line runs the length of the hair. A thread thinner than about 3 px closes in a riso print.
6. **Lobes hang like hammocks.** They sag below the straight way to the tie and come up to it. The lowest one, at the ear, is open: five or six loose hairs with paper between.
7. **A bun is one leaning mass with a wrap.** The wrap crosses the foot of the bun at a slant, and the tie (here a ribbon) lies along its front edge. One open loop stands behind the crown, a smaller one above the bun, a few thin loops behind it. A coil of even turns is a rope.
8. **The fall is one mass to the shoulder, then tails.** Below the shoulder it parts into five or six tails of different width and length, each an S, with one leaf of paper where they separate. Tails that end level look like a comb.
9. **The far lock follows the cheek.** It is two to three locks, as wide as a third of the distance between the pupils at eye level, with a paper slit between. Its inner edge stays 0.03–0.15 off the face's outline from the brow to the mouth, then hangs, and the tip swings out. A lock that hangs straight from the temple leaves a wide empty strip beside the cheek.
10. **The near front is strands.** Five leave the hairline just beside the part, part from each other, and cross the end of the brow: one broad, the rest 1 to 3 page units. They turn back in under the cheek. Root them inside the mass (`root` near 0.02), or each starts with a blunt, airbrushed end.
11. **Single hairs, few.** `inkFlyaways` and `inkWisps` on the outline, over the paper wedges, and from the tails. Every one starts from a lock and keeps its direction.
12. Let a free lock settle with `inkHang`: leave direction, stiffness, its own wave, and `avoid` for the cheek and the back. Draw one lock at a time, back to front, with `inkTress` or `inkSweep`.

Dark hair (luminance under 110 of 255) in four boxes of the levelled frame, as mean / spread / share covered, with every picture reduced to the portrait's 91 px between the pupils ([reference-match](../reference-match.md), `values`):

| | Crown | Near side | Bun | Fall |
|---|---|---|---|---|
| Portrait read | 35 / 6 / 0.99 | 37 / 9 / 0.93 | 41 / 14 / 0.91 | 38 / 9 / 0.98 |
| Example, combed back (rejected) | 37 / 23 / 0.89 | 36 / 19 / 0.86 | 33 / 18 / 0.82 | 35 / 20 / 0.83 |
| Example, ink | 32 / 13 / 0.97 | 40 / 16 / 0.92 | 35 / 19 / 0.87 | 33 / 13 / 0.97 |
| Example, riso | 36 / 10 / 0.98 | 38 / 11 / 0.92 | 36 / 14 / 0.87 | 33 / 12 / 0.97 |

The spread counts busyness: on the crown and the fall the rejected hair had two to four times the portrait's. The dark shapes of the head from crown to eye level overlap the portrait's by 0.79 (shared area over joint area; 0.58 before). Both numbers describe these drawings only, and neither certifies a good one.

## Body

- Turn the trunk well away from a head that looks back. The example's is about 66° away. A frontal, boxy trunk near 1.5 head heights wide makes the head look small and the figure short.
- Pose a measured body (ANAT1) at that angle and read its landmarks before drawing cloth. In the example's spans below the pupils' line: far shoulder 1.5, the breast at its widest 3.05, under the breast 3.4, sash 3.55.
- **The chest is round.** The far contour swells to its widest at the breast and comes back in by about a quarter of a span above the sash. Without that return the figure is a bottle.
- The near breast is shown by three things and no outline: the collar's edge that bows forward and turns down to the sash, folds drawn from the armpit and up out of the sash, and only a breath of grey (0.05) under it. A soft dark crescent under the breast is an airbrush's, and the cloth turns to plastic. The sleeve's edge falls nearly straight to the elbow first, or the arm covers the chest.
- A cloth tie is flat turns with pleats, a knot and two brushed ends that turn edge-on. An even tube looks like rubber.

## Cost

3000 × 4000 px with three drums: about 2.6 s to draw and 2.7 s to press on an Apple laptop, in Node. `InkRisoCanvas` works on the main thread and is for still pictures. For film, print once and move the result.

## Limits

- The example is one half figure in one view. Hands, legs and other views are not drawn. `poseInkHead` is built for three-quarter heads; a full profile is not drawn.
- The near eye, wing and lip strokes assume a face of about 70 units or more across on the 1200-unit page. Smaller faces need fewer marks.
- Colour above tone 0.6 closes in the print, so the riso keeps fewer strands than the ink picture.
- The portrait was reviewed on rendered frames by its author only. It has had no independent art review.
- No test checks beauty or likeness.
