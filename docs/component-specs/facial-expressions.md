# EXPR1 — facial expressions for any art style

**Registry item:** `facial-expressions` · **Files:** `registry/anatomy/expression-*.ts(x)` · **Storybook:** Video
production → Art Foundations → Facial Expressions (Atlas, Sheet, Action unit lab) · **Skill:**
[kumiki-facial-expressions](../../skills/kumiki-facial-expressions/SKILL.md) · **Research:**
[facial expressions, 2026-11-15](../research/facial-expressions-framework-2026-11-15.md)

EXPR1 holds what stays true about an expression in every art style: which muscles move, what that does to the brows,
lids, cheeks and mouth, and which creases appear. A woodblock beauty's sorrow, a crayon child's laugh and a pencil
portrait's anger then share the same anatomy. It builds on ANAT1's measured face and shares the art-foundations module
with ANIM1 and FLORA1.

## Layers

| Layer | File | What it holds |
|---|---|---|
| Data | `expression-facs.ts` | `ACTION_UNITS` (FACS names and muscles, with what each changes for a draughtsman), `INTENSITY` (A–E as 0.2–1), `EMOTIONS` (the seven EMFACS prototypes, reported; drawing extras, estimated), `KUMADORI` (colours and patterns), `NOH_TILT`. |
| Face | `expression-face.ts` | `expressFace(weights)` and `expressEmotion(id, intensity)` move ANAT1's 468-point face. `expressionFeatures` returns style-neutral numbers, `expressionMarks` the creases, `irisPositions` the gaze. Also `blendWeights` and `nearestEmotion`. |
| Painters | `expression-react.tsx` | `ExpressionFace` (front-view line study; creases as lines or kumadori), `ExpressionAtlas`, `ExpressionSheet`. ANAT1's `renderMeshFrame` and `HumanFigure` render the moved mesh in clay. |

## How a style uses it

1. **Choose the expression.** Use `expressEmotion("sad", 0.7)`, or compose units with `expressFace({ 1: .8, 4: .5, 15: .9 })`.
   Blend expressions over time with `blendWeights`.
2. **Read `expressionFeatures`.** Movements are in eye widths (+ up); lid opening and mouth width are ratios against
   neutral. Map each onto your own drawing:
   - brow inner and outer heights and knit;
   - lid opening;
   - cheek, nose-wing and upper-lip lift;
   - mouth corners, width and opening;
   - chin drop;
   - one-sidedness.
3. **Draw the creases** from `expressionMarks`: forehead lines, the lines between the brows, crow's feet, nasolabial
   folds, nose-bridge lines, the chin crease, dimples. In kabuki, kumadori strokes follow the same lines, in the role's
   colour (red heroes, blue villains and ghosts, brown monsters).
4. **Check** that the drawn face reads as intended. Measure the features off the drawing (or set them from the
   style's parameters), then run `nearestEmotion`.

## Evidence

- **Action units and muscles:** from Wikipedia, Facial Action Coding System (retrieved 2026-11-15). FACS describes
  appearance changes, so the millimetre displacements are estimates for drawing. One interaction is modelled: AU 4
  stops pulling the brows down when AU 1 lifts them, giving the oblique grief brow.
- **EMFACS combinations:** from the same article.
  - happiness 6 + 12;
  - sadness 1 + 4 + 15;
  - surprise 1 + 2 + 5B + 26;
  - fear 1 + 2 + 4 + 5 + 7 + 20 + 26;
  - anger 4 + 5 + 7 + 23;
  - disgust 9 + 15 + 17 (some versions 16);
  - contempt R12A + R14A, drawn at C so it reads.
- **Duchenne and polite smiles** (zygomatic major alone versus with orbicularis oculi): from Wikipedia, Duchenne smile.
- **Noh brightening** (tilting the mask up reads as smiling): from Wikipedia, Noh mask. The downward "clouding" is
  marked estimated.
- **Kumadori colours and patterns:** from Wikipedia, Kumadori.
- **Universality of facial expressions is debated** (Wikipedia, Facial expression): treat the prototypes as a starting
  point, and let display rules and the story shape them.

**References (public domain or CC0):**

- Duchenne de Boulogne's 1862 plates (Cleveland Museum of Art, CC0);
- Darwin's *The Expression of the Emotions* plates (1872);
- Le Brun's *Passions of the Soul* (MET, CC0);
- Sharaku's actor prints (MET, CC0).

## Limits

- The face is ANAT1's mask: no hair, teeth, tongue or eyeballs. Irises are drawn at the gaze.
- Front-view line studies only; turn the clay render with ANAT1's camera.
- Amounts are estimates and not yet calibrated against measured landmark displacement data.
- Applied to UKIYO1: its fourteen moods are drawn from these features (`moodShape` in `ukiyoe-face.ts`); other styles
  still map their own.
