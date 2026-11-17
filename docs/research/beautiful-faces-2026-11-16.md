# Beautiful faces from film stars' portraits (ANAT1) — research, 2026-11-16

> **Superseded** by [Face types](face-types-2026-11-16.md): one type per ancestry group from modern photographs, never
> blended. The fitting method and the rendering findings below still hold.

The owner asked for more references from celebrities widely seen as beautiful or handsome, because the Face lab still
did not show beautiful faces. This note covers the larger reference set, how the face is now fitted to it, and the
rendering faults that hid it. It supersedes the [first composite](face-composite-2026-11-16.md).

Grades:
- **reported:** quoted from the source;
- **measured:** from photographs or data in the repository;
- **estimated:** chosen within what the sources support.

These are not approved realistic portraits (AGENTS rule 14): no human has reviewed them as such.

## What was wrong

Three portraits were rendered and measured with the same landmark model as the photographs, then compared with the
stars' average side by side (overlays of both landmark sets).

| Fault | How it showed | Cause |
| --- | --- | --- |
| The Face lab was the measurement mask | clay, androgynous (sex 0.5), no skin, eyes or hair | it was built as a study, never as a portrait |
| A startled stare | white above and below the iris | the fit opened the lids to the photographs' lash lines and liner; the iris sat centred in a 12–13 mm opening |
| A sad mouth | the corners 1.5 mm (women) and 2.5 mm (men) below the lips' midline | the composite left them low |
| Polygonal lips with a pale outline | a V-shaped lower lip, a light line round dark-skinned lips, red "lipstick" on men | the lip mask followed the mesh's straight edges; the white roll and philtrum were painted a fixed light colour |
| A pillar of skin below the neck | a strip of neck down to the frame's edge | the neck cylinder ran 175 mm down in front of the garment |
| A hard nose shadow and a bright parting seam | a dark wedge from the nose to the lip; a pale stripe up the head | the shadows had a fixed 1 mm edge; the parting's bare scalp was too bright |
| The men's fit diverged | the lips got further away each iteration | moving inner-lip points apart opens the mouth, which the landmark model reads differently |

## The references

| What | Grade | Source |
| --- | --- | --- |
| 117 names of classic film stars widely described as beautiful or handsome (57 women, 60 men; Hollywood, European, Mexican, Indian and Japanese cinema) | — | `scripts/anatomy/face-composite/names.json` |
| 52 public-domain studio portraits used: 29 actresses, 23 actors | measured | Wikimedia Commons; each file's page and licence in `data/face-composite.json` (`sources`) |

From about 170 downloaded photographs, a photograph was used only if it showed one face (no second face over a third
of its width), turned under 22°, at least 140 px wide, with the mouth closed and not smiling and the eyes open and
looking ahead. Each was checked by eye on a contact sheet of face crops; eyes-closed and squinting photographs, a
child's photograph and two from later in an actor's life were left out. One photograph a person.

The average is mostly that of Hollywood's studio era: of the photographs used, one actress (Mexico) and two actors
(Egypt, Mexico) worked mainly outside Europe and the United States. The Japanese and Indian stars' public-domain
portraits found were smiling, turned, group or full-length shots, so none passed.

## Method: fitting in the landmark model's own space

The earlier composite moved the mesh toward landmark positions measured on photographs. But the landmark model reads a
rendered face differently from the mesh's own points (lash lines, lip edges, the jaw's silhouette). So now:

1. Every photograph is measured by MediaPipe's face landmarker, frontalised by the inverse head rotation, centred on
   the midpoint of the eyes' centres (each eye's centre the middle of its corners, so gaze does not move it), scaled
   to put them one unit apart and levelled. The mean per sex is the target.
2. The face is rendered (no makeup, hair off the face) and measured the same way.
3. Each vertex moves by half its remaining difference (x and y; depth comes from the form step), symmetrised and
   smoothed over about 4 mm; points the landmark model does not follow are left alone. Repeated six times, the best
   iteration kept.
4. The lid margins and the inner lip line are left out of the fit: the lids are placed by measured margin-to-pupil
   distances, and the lips' closure is not a shape.

| Result | Grade | Value |
| --- | --- | --- |
| Women: root-mean-square landmark residual | measured | 1.83 mm before the fit, 1.07 mm after (brows 1.37, eyes 0.53, nose 0.41, lips 0.60, contour 2.13) |
| Men: root-mean-square landmark residual | measured | 2.12 mm before, 1.82 mm after (brows 2.23, eyes 0.71, nose 0.75, lips 2.24, contour 3.04) |
| Against North American white norms (Farkas 2005), the fitted woman | measured | nose width −1.8 SD, lower face (sn–gn) −1.4 SD, eye width (ex–en) −1.1 SD; eye spacing and nose height within 0.2 SD |
| The fitted man | measured | every listed measure within about half an SD |
| The stars' mouth corners, below the lips' midline | measured | 0.74 mm (actresses), 0.86 mm (actors); per photograph median −1.16 and −0.78 mm |

The contour (jaw and temples) fits least: its landmarks follow the silhouette, which moving its own points barely
changes.

## Rendering

| Change | Grade | Source |
| --- | --- | --- |
| Lids on the iris: the upper margin MRD1 above the pupil, the lower MRD2 below it | reported | MRD1 about 4.0 mm in adults in their twenties (3.70 ± 0.10 mm over 20–59 years, anterior-segment OCT), Ogasawara et al. 2020, [Clin. Ophthalmol. 14](https://dx.doi.org/10.2147/OPTH.S246731); MRD1 3.5 and MRD2 5.2 mm in 380 adults (mean age 58), [Rana et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10371930); MRD2 5.5 mm, Putterman via [EyeWiki](https://eyewiki.aao.org/Margin_to_Reflex_Distance_1,2,3) |
| MRD1 3.9 + 0.4 (women) + 0.4 × femininity mm, MRD2 5.3 + 0.1 (men) mm | estimated | within the measured values; women a little more open |
| The mouth's corners at the stars' height | measured | the table above |
| Lip outline a smooth curve corner to corner, with a 0.2 mm soft edge | estimated | — |
| Men's lips nearer the skin's colour, darker skin's lips browner (they carry its melanin) | estimated | — |
| The white roll and the philtrum's columns lighten the skin by up to 7% instead of painting a fixed light colour | estimated | — |
| Soft shadows that widen with the distance to the caster (0.35 of it, a softbox of about 20°) | estimated | percentage-closer soft shadows (Fernando 2005) |
| The neck ends under the garment; the chest comes forward of it | estimated | — |
| A parting is a thin, shaded line (the scalp darkened, most of its cover kept) | estimated | — |

## The Face lab

The **Face lab** story now opens on the rendered face: woman or man (and in between), how much of the attractiveness
findings and of the stars' average to apply (up to 150%, which exaggerates it), makeup, skin, iris, eye shape, hair,
head turn and key light; the norm z-score sliders shape the same face. The measures are tabled against a norm, and
**Measurement study** shows the calibrated clay mask with its guides. Changes render half a second after the last
one; a status line says when it is rendering.

## Limits

- The landmark model reads made-up eyes and renders differently; the lids are therefore placed by measurement, not by
  the fit.
- Hair still limits the portraits: flat crowns, hard hairlines, and some styles (side wave, buzz cut) render poorly.
- No human has reviewed these as realistic portraits.
