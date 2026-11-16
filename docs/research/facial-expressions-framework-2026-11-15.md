# Facial expressions framework (EXPR1) — research, 2026-11-15

Second in the order of missing frameworks the owner approved (plants, expressions, then the ANIM1 gaps). The owner's
earlier UKIYO1 quality ask included facial expressions; ANAT1 placed the face's features but had no expressions.

## Sources

- **Facial Action Coding System** (Wikipedia, retrieved 2026-11-15, including the wikitext tables):
  - **Action units** with their muscles: 1 inner brow raiser (frontalis, pars medialis), 2 outer brow raiser, 4 brow
    lowerer (corrugator, depressors), 5 upper lid raiser, 6 cheek raiser (orbicularis oculi, pars orbitalis), 7 lid
    tightener, 9 nose wrinkler, 10 upper lip raiser, 12 lip corner puller (zygomaticus major), 14 dimpler, 15 lip corner
    depressor, 16 lower lip depressor, 17 chin raiser, 20 lip stretcher, 23 lip tightener, 24 lip pressor, 25 lips
    part, 26 jaw drop, 27 mouth stretch, 41 lid droop, 43 eyes closed, and the eye and head positions.
  - **Intensity** is scored A–E.
  - **The EMFACS table:** happiness 6 + 12, sadness 1 + 4 + 15, surprise 1 + 2 + 5B + 26, fear 1 + 2 + 4 + 5 + 7 + 20 +
    26, anger 4 + 5 + 7 + 23, disgust 9 + 15 + 17, contempt R12A + R14A.
  - The article notes FACS describes appearance, not degrees of muscle activation.
- **Duchenne smile** (Wikipedia): a Duchenne smile contracts both zygomatic major (raises the corners) and orbicularis
  oculi (raises the cheeks, makes crow's feet). A non-Duchenne smile uses zygomatic major only.
- **Noh mask** (Wikipedia): "Facing slightly upward, or 'brightening' the mask, will let the mask capture more light,
  revealing more features that appear laughing or smiling."
- **Kumadori** (Wikipedia):
  - **Colours:** red for a powerful hero (virtue, courage); blue for villains and negative emotions (fear, jealousy),
    ghosts and fox spirits; brown for monsters and non-human spirits; black to exaggerate brows and the mouth line.
  - **Patterns** (over 50): nihon-guma, suji-guma, mukimi, zare-guma, kuge.
- **Facial expression** (Wikipedia): universality is debated, and cultures differ in display rules such as eye contact.

## References (public domain or CC0, Wikimedia Commons)

- Duchenne de Boulogne, *Mécanisme de la physionomie humaine* (1862), figures 7, 32, 45, 51, 54 (Cleveland Museum of
  Art, CC0).
- Darwin, *The Expression of the Emotions in Man and Animals* (1872), plates I–VII.
- Le Brun, *Heads Representing the Various Passions of the Soul*: sadness, laughter, terror, hatred, desire, bodily
  pain (MET, CC0).
- Sharaku, kabuki actor prints, including Ōtani Oniji III as Yakko Edobei (MET, CC0).

## Build

- **Units are displacement fields on ANAT1's face.** Each moves named landmarks and feature loops (brows, lids, cheeks,
  nose wings, lips, chin) with a smooth falloff, mirrored by side.
- **Jaw and lids.** The jaw drops from the lip line, which runs from the stomion out to the corners, so a laughing
  mouth keeps its raised corners. Lids close by carrying each upper-lid point to its partner on the lower lid.
- **One interaction is modelled.** With AU 1, AU 4 stops lowering the brows: the oblique grief brow of 1 + 4.
- **Amounts** in mm at full intensity are estimates for drawing.

**Verification.** Line studies of all 15 prototypes were rendered and checked; fixes along the way:

- the smile's corners lifted too little;
- the angry brow was not a V;
- the sad brow did not slant;
- contempt was invisible at trace intensity;
- laughter's dropping jaw dragged the smiling corners down.

`nearestEmotion` reads each of the seven EMFACS prototypes back as itself (tested).

No owner review yet.

## Applied to UKIYO1 (2026-11-15)

UKIYO1's moods are now drawn from EXPR1: each mood's units move ANAT1's face, and the features set the woodblock
face's brows, lids, iris and mouth (`moodShape`). The eight old moods gained six (disgust, contempt, pain, sleepy,
determined, mie).

**Busts were compared before and after** in profile, three-quarter and front, for a woman, a townsman and an elder,
plus frame-by-frame strips of a mood easing in. Fixes along the way:

- The first mapping lost two print conventions: laughter's closed crescents (EXPR1 only narrows the eyes to slits) and
  the surprised or frightened stare (AU 7 holds the lids in). The drawing now closes laughing eyes and widens the stare
  more than it narrows.
- The anatomy's knitted brows drew an old man's nose-to-mouth fold on young women. Expression creases are now separate
  from age lines and drawn on men only.
- A shy smile no longer draws the fold.
- AU 9 (disgust) barely moved the lids, so the drawing adds its narrowing and its lowered inner brows.
- The front view's fold is drawn on both sides, weighted by each mouth corner.
- Small irises drew as two lobes. The arc radius was rounded apart from its span, so `circleD` and `ellipseD` now
  round the radius once (UKIYO1-wide).

No owner review yet.
