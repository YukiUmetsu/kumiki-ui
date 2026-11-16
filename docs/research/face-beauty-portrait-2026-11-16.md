# Beautiful faces and rendered portraits (ANAT1, EXPR1) — research, 2026-11-16

The owner said the faces were too ugly and asked for the mathematics of handsome and beautiful faces, mirrored in the
framework, and for research on the golden ratio face.

Grades:
- **reported:** quoted from the source;
- **measured:** from data in the repository;
- **estimated:** an amount chosen within what the sources support.

## What makes a face attractive

| Finding | Source | Grade | Applied as |
| --- | --- | --- | --- |
| Faces blended from many faces are more attractive than their constituents; the more faces in a composite, the more attractive it is | Little, Jones & DeBruine 2011, *Phil. Trans. R. Soc. B* 366:1638 (review: Galton; Langlois & Roggman 1990) | reported | Start from population means (Farkas norms, ANSUR II) |
| Increasing symmetry alone is sufficient to increase attractiveness | Little et al. 2011 | reported | Every vertex averaged with its mirror |
| Feminine features increase female attractiveness across cultures; the public prefers above-average femininity in women | Little et al. 2011; Holland 2008 | reported | Women +25% of the female–male difference (amount estimated) |
| For men the evidence is mixed: feminised male faces were preferred in two cultures (Perrett et al. 1998); other studies found preferences for large jaws | Little et al. 2011 | reported | Men +15% (estimated) |
| Male faces have larger jawbones, more prominent cheekbones and thinner cheeks; masculinising enlarges the jaw and thins the lips | Little et al. 2011 | reported | Jaw narrowed and lips fuller with femininity |
| Best eye-to-mouth distance about 36% of face length (hairline to chin); best distance between the pupils about 46% of face width (inner edges of the ears); both match the average face (40 Caucasian female faces) | Pallett, Link & Lee 2010, *Vision Research* 50:149 | reported | Hairline placed at the 36% ratio; the 46% ratio follows from ANSUR breadths |
| Most attractive upper : lower lip 1:2, lip area 53.5% above average (morphs of 20 white women, 18–25) | Popenko et al. 2017, *JAMA Facial Plast. Surg.* 19:261 | reported | Vermilion heights below |
| Attractive young Caucasian women: upper vermilion 6.47 ± 1.36 mm, lower 11.64 ± 1.46 mm | "The Concept of Ideal Lips of Caucasian Female", 2024 (PubMed 39198279) | reported | Women 6.5 / 11.6 mm, men a little thinner (estimated) |
| Adult palpebral fissure height about 8.5 mm (women) and 9 mm (men) in Australia; 9.7–9.9 mm Turkish; 8.0–8.2 mm Korean; about 11.5 mm South Indian | Palpebral fissure anthropometry studies, 2022–2023 | reported | Opened from the mask's 6.8 mm to 9–9.6 mm |
| Faces edited to exaggerate the medial canthal tilt were preferred 93% of the time | Bashour & Geist 2007, *Ophthal. Plast. Reconstr. Surg.* | reported | About +2.5° of tilt (amount estimated) |
| Homogeneous skin colour is attractive; skin redness and yellowness read as healthy | Little et al. 2011 (Fink et al. 2006; Stephen et al.) | reported | Even mottling (±3.5%); a natural cheek flush |
| Cheekbone breadth 133.8 ± 5.6 mm (women), 142.6 ± 6.2 mm (men); pupils 61.7 ± 3.6 and 64.0 ± 3.4 mm apart | ANSUR II, U.S. Army 2012 (summary in `data/ansur-ii-ranges.json`) | measured | The mask (153 mm wide) narrowed outside the eyes |

**A convergence worth noting.** With ANSUR's mean breadth and pupil distance, the pupil ratio is 61.7 / 133.8 = 0.461,
which is Pallett's 46%. The ideal ratio is the average face's, as Pallett said.

## The golden ratio face

**The claim.**
- Stephen Marquardt built a mask from golden decagons and pentagons.
- He states that in a beautiful face "the width of the nose to the width of the mouth is a ratio of 1:1.618".
- He states that the mask fits attractive faces of every race and period.
- Source: interview, *Journal of Clinical Orthodontics* 36(6):339, 2002.
- Popular versions add face length : width = φ and similar ratios; no primary source was found for those.

**The evidence:**
- **Holland 2008** (*Aesthetic Plast. Surg.* 32:200–208; Procrustes and thin-plate spline analysis): the mask best
  describes masculinised white women, as in fashion models. It is inconsistent with the preference for above-average
  femininity, so women seeking surgery "would be ill-advised to aim toward a better fit with Marquardt's mask".
- **Londono, Dashti et al. 2024** (*J. Prosthet. Dent.* 131(5):804–810; systematic review): the golden proportion was not
  consistently present in natural faces, and conformance was not associated with facial evaluation scores in any
  ethnic group.
- **Pallett et al. 2010:** the best spacings are those of the average face, not φ. The press release adds that
  hairstyles change the ratios.

**What the library does.**
- It does not build faces on φ.
- `goldenRatioReport` measures any face's φ ratios beside Pallett's. The evidence-built face sits at mouth : nose
  1.53 (women) and 1.40 (men), against 1.618.

## What the renders changed

**References compared** (CC0 and public domain, Wikimedia Commons):
- "Face portrait" (Unsplash, CC0): a frontal man, soft light;
- "Monochrome woman face glitter" (Unsplash, CC0);
- Kusakabe Kimbei's hand-coloured portraits (public domain).

| First render | Fixed by |
| --- | --- |
| Neck as far forward as the chin, hiding the jaw | The throat 34 mm behind the chin, the neck's sides behind the jaw angles |
| Mouth open | The canonical mask's lips are about 4.7 mm apart: closed to 0.3 mm. A bug moved the stomion itself, so the lips were measured against the inner upper-lip line |
| Lashes standing 8 mm off the lid like a second brow | Lashes point forward and are foreshortened from the front |
| Two round nostrils (a pig nose) | Small crescents beside the columella |
| Faceted jaw and blotchy shading | Two levels of Loop subdivision, with exact boundaries at the openings |
| Slit eyes (the mask's 6.8 mm opening) and bright, staring sclera | Measured palpebral height; a shaded sclera, darker at the corners; lid shadow; a softbox catchlight; a darker limbal ring and a textured iris |
| Flat, pale lips | Rose colour, a lit lower lip, a shaded upper lip, a fine border |
| Hair as a flat helmet with white stripes | A rounded hairline, side curtains, a normal rounded at the edges, weaker occluded highlights, a ragged outline, fine hairline hairs |
| Wide neck and no shoulders | Neck width about 0.7 of face width; a trapezius slope |
| Very light skin washed toward white | Lower exposure |
| Slow (11 s), mostly polygon filling | A scanline filler: about 3–4 s at 384 × 480 with 2× supersampling, 0.4 s for a 220 px draft |

## Limits

- One average mask: individuals differ only by the parameters.
- No teeth or tongue modelling beyond a painted band.
- The ears are painted shapes.
- The hair is a 2.5D construction.
- The yaw range is about ±25°.
- No human visual review yet. This is not an approved realistic portrait (AGENTS.md rule 14).
