---
name: kumiki-facial-expressions
description: Use when drawing, animating or reviewing a facial expression or emotion on any character in Kumiki in any art style (woodblock, ink, pencil, crayon, riso, 3D), especially when faces look blank or wrong for the beat, smiles look fake, sad and angry brows are confused, creases are missing or misplaced, or a style needs a new mood.
---

# Kumiki facial expressions (EXPR1)

The pack `facial-expressions` decides *which muscles move and what the face does*. Your style decides *how it looks*.
Read the [spec](../../docs/component-specs/facial-expressions.md) for the API; this is the working order.

1. **Name the beat as an expression.** Pick a prototype from `EMOTIONS` (smile, sad, surprise, fear, angry, disgust,
   contempt, laugh, cry, shy, pain, sleepy, determined, mie), or compose action units. Read its `notes`.
2. **Get the anatomy.** `expressEmotion(id, intensity)` moves ANAT1's measured face. `expressionFeatures` gives:
   - brows: inner, outer, knit;
   - lid opening;
   - cheek, nose and upper-lip lift;
   - mouth corners, width and opening;
   - jaw;
   - one-sidedness.

   Map these onto your style. Don't invent: a sad brow lifts at the inner end, an angry brow drops there.
3. **Smiles reach the eyes.** A felt smile needs the cheeks raised and the eyes narrowed (AU 6, Duchenne). Without
   it, the smile reads as polite or posed. Use that on purpose.
4. **Creases.** Draw `expressionMarks` (forehead lines, glabella lines, crow's feet, nasolabial folds, nose wrinkles,
   chin crease, dimples) in your medium's weight. For kabuki, paint them as kumadori in the role's colour (`KUMADORI`).
5. **Gaze and head.** Use the gaze and head pose units (61–66, 53–56). In Noh, tilting the face up brightens it toward
   a smile; bowing it clouds it.
6. **Motion.** Blend with `blendWeights`; ease in and out over 4–8 frames; layer blinks (43) on top. Never snap between
   prototypes.
7. **Check.** Measure your drawn face's features, or derive them from your style's parameters, and run
   `nearestEmotion`. The first result should be the expression you meant. Then compare with the PD references
   (Duchenne, Darwin, Le Brun, Sharaku).
8. **Add an expression.** Add a prototype with the units and weights, a grade (`reported` only with a source) and
   notes. `tests/facial-expressions.test.tsx` must pass.
