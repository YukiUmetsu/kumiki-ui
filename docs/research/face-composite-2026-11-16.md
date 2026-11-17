# The shape of real faces: an actor composite (ANAT1) — research, 2026-11-16

> **Superseded** by [Beautiful faces from film stars' portraits](beautiful-faces-2026-11-16.md): more portraits, and a fit
> in the landmark model's own measurement space. Kept for the record.

The owner asked for faces with more sophistication, based on real faces, using famous actors' faces as references.
`beautifulFace` now starts from the shape of a composite of real faces: public-domain portraits of film actors,
measured with face landmarks and averaged by sex. The measured targets that follow (breadths, the eyes' opening, lips,
symmetry) are kept.

Grades:
- **reported:** quoted from the source;
- **measured:** from photographs or data in the repository;
- **estimated:** chosen within what the sources support.

## Why a composite

| What | Grade | Source |
| --- | --- | --- |
| Blends of many faces are more attractive than the faces in them, and more so the more faces are blended | reported | Little, Jones & DeBruine 2011 (review; Galton; Langlois & Roggman 1990) |
| A composite of many people shows no one person's likeness | — | The design rule here: one photograph a person, many people |

Using attractive faces (film actors) as the inputs gives an attractive average of real faces, not the average of the
calibrated mask. No preset is named after a person.

## Method

The scripts are in `scripts/anatomy/face-composite/`.

1. **Search.** Wikimedia Commons, for 60 classic film actors (30 women, 30 men, from several backgrounds). Only
   public-domain or CC0 files are kept, with the licence read from the API.
2. **Landmarks.** MediaPipe's face landmarker (478 points, plus the head pose from its transformation matrix) on each
   photograph. The model (Apache 2.0) is used to measure only.
3. **Selection.** Per person, the most frontal photograph of that person alone (photographs of two people were left
   out), with:
   - |yaw| ≤ 15°;
   - pitch within MediaPipe's offset band (−6° to 26°; its zero is not the camera's axis);
   - a face at least 150 px wide.
4. **Alignment.** Each face is aligned to ANAT1's calibrated mask by a similarity Procrustes fit on the stable upper
   face (above the nose), so a smile or an open mouth does not tilt or scale it.
5. **Averaging,** by sex:
   - the lower face (jaw, chin) comes only from photographs with the mouth closed;
   - the mouth itself is left out, because publicity photographs smile;
   - the nose wings are damped to a fifth, because smiles flare them and shadows blur their edge.
6. **Cleaning.** The offsets are symmetrised and smoothed over about 6 mm. Depth is damped by half, because a single
   photograph's depth is uncertain.

The result is per-vertex offsets (mm) on the 468-vertex mesh, in `registry/anatomy/data/face-composite.json`, with
the provenance of every photograph.

## What the composite measures

| Measure | Calibrated mask | Composite, women (11) | Composite, men (12) | Check |
| --- | --- | --- | --- | --- |
| Cheekbone breadth (zygion) | 153 mm | 133 mm | 138 mm | ANSUR II: 134 / 143 mm (measured population) |
| Eye opening (palpebral height) | 6.8 / 7.5 mm | 8.9 mm | 8.3 mm | Reported 8–11.5 mm; more open is preferred |
| Nose width (alare), after damping | 31.4 / 34.9 mm | 32.7 mm | 36.8 mm | Within published norms |
| Brow above the upper lid | 20.9 / 21.1 mm | 21.6 mm | 17.7 mm | Lower brows in men (a dimorphic trait) |
| Canthal tilt after the beauty steps | 4.2° / 3.7° | 3.8° | 1.9° | The men's eyes sit flatter |

So the actors' composite lands on the measured population breadths, which the raw mask does not. The beauty steps
then set the breadths, the eyes' opening and the lips to their measured values. What the composite contributes is
the shape between them: the contours, cheeks, brows and nose.

## Sources

23 photographs: 11 women, 12 men. All public domain or CC0, from Wikimedia Commons; titles, pages and licences are
in `face-composite.json`. They include studio portraits and publicity stills of:
- Anna May Wong, Ava Gardner, Gene Tierney, Joan Fontaine, Lana Turner, Lauren Bacall, Merle Oberon, Rita Moreno,
  Sophia Loren, Veronica Lake and Vivien Leigh;
- Anthony Quinn, Burt Lancaster, Cesar Romero, Clark Gable, Gary Cooper, James Stewart, Kirk Douglas, Marlon Brando,
  Sidney Poitier, Toshiro Mifune, Tyrone Power and William Holden.

## Limits

- **Small sample.** Wikimedia rate-limited the downloads, so about 50 more candidate photographs were not fetched. A
  larger composite (20 or more a sex) would be steadier; the scripts make it repeatable.
- **The sample's bias.** Mostly mid-century Hollywood, mostly of European descent; studio lighting and lenses.
- **Expression.** Smiles are handled by leaving out the mouth and damping the nose wings; residual expression may
  remain in the cheeks.
- **Landmark bias.** MediaPipe's landmarks are fitted by its own model; contour points follow the visible silhouette.
- **Review.** Agent review only. Not an approved realistic portrait (AGENTS.md rule 14).
