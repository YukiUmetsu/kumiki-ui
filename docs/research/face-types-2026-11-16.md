# Face types by ancestry from modern stars' photographs (ANAT1) — research, 2026-11-16

The owner asked:
- not to blend everyone into one average face;
- to make face types to pick from, by race and ethnicity;
- to take each from beautiful people of that group (popular actors, actresses, stars and celebrities), in modern
  photographs;
- to let bone structure and proportions differ between groups.

This note covers the reference sets, the method and the results. It supersedes the single
[film-star composite](beautiful-faces-2026-11-16.md). That note's rendering findings still hold: lids on the iris,
the mouth's corners and soft shadows.

Grades:
- **reported:** quoted from the source;
- **measured:** from photographs or data in the repository;
- **estimated:** chosen within what the sources support.

These are not approved realistic portraits (AGENTS rule 14): no human has reviewed them as such.

## Groups

Nine groups, by sex. A group is a set of reference photographs, not a claim about biology. Every group spans many
skin tones, features and mixed ancestries, and each type's look (skin, eyes, hair) can be changed.

| Group | Includes | Base norm |
| --- | --- | --- |
| East Asian | Chinese, Japanese, Korean | North American white (Farkas) |
| Southeast Asian | Filipino, Thai, Vietnamese, Indonesian, Malay | North American white |
| South Asian | Indian, Pakistani, Bangladeshi, Sri Lankan | North American white |
| Middle Eastern & North African | Arab, Persian, Turkish, Egyptian and others | Saudi (Al-Sebaei 2015) |
| Black | West, East and Southern African, African American, Afro-Caribbean | African American (Farkas 2007) |
| Latin American | Mexican, Brazilian, Argentine, Caribbean and other (mestizo and mixed) | North American white |
| Northern & Western European | British, Irish, Scandinavian, German, Dutch, French and descendants | North American white |
| Southern European | Italian, Spanish, Portuguese, Greek | North American white |
| Eastern European | Russian, Polish, Ukrainian, Czech, Serbian and other Slavic | North American white |

## References

- **Names:** 596 film, television and music stars and models widely described as beautiful or handsome, active from
  the 1990s on (`scripts/anatomy/face-types/groups.json`).
- **Photographs:** found on Wikimedia Commons through its API.
  - Kept only if dated 1995 or later (where the file gives a date) and licensed public domain, CC0, CC BY or CC BY-SA.
  - Used to measure only, never copied into the library.
  - Each one is credited (title, author, licence, page) in `data/face-types.json`; the Beautiful faces story lists
    them.
- **Selection:** one photograph a person.
  - Alone in the frame, turned under 22°, the face at least 120 px wide, the eyes open.
  - Each type's picks were checked by eye on a contact sheet of face crops. Left out: sunglasses or glasses, caps
    and hats, a veil over the face, microphones over the mouth, hands over the chin, two drawings that were filed as
    photographs, and a few photographs from later in life.

## Method

1. **Measure.** MediaPipe's face landmarker on every photograph.
   - Frontalised by the inverse head rotation.
   - Centred on the eyes' centres (the middle of each eye's corners) and scaled to put them one unit apart.
2. **Average per type.** The upper face comes from every photograph chosen. Below the nose tip, only calm mouths
   (closed, not smiling) count.
3. **Fit the type in the landmark model's own space.**
   - Render the face with no makeup and the hair off the face.
   - Read it the same way and move the vertices by half the remaining difference (x and y), symmetrised and smoothed
     over 4 mm. Repeat eight times and keep the best iteration.
   - Lid margins and the inner lip line are left out. The lids sit on the iris by measured margin-to-pupil
     distances; the mouth's corners sit at the type's measured height.
4. **Brows.** Drawn in the band between the face's own upper and lower brow edges, so each type's brow shape and
   thickness carry through. A fixed drawn arch kept the fit from matching straight brows.
5. **Bone structure in depth.** See below.
6. **Face-shape variants.** Within each type, the stars split in two by face shape (k-means on the outline, brows, eye
   corners, nose and mouth corners). Each variant comes from four people or more and is named by the measures it
   changes most.

## Bone structure

The landmark model also estimates depth. Averaged over each type's photographs and compared with the Northern European
stars, it gives:

Depth (mm, forward +) against the Northern European stars, women's and men's differences averaged (measured: the landmark model's estimates):

| Group | Brow ridge | Nasal root | Cheekbones | Nose tip | Upper lip | Lower lip | Chin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| East Asian | -2.7 | -1.5 | +0.9 | -0.2 | +1.4 | +2.0 | +2.7 |
| Southeast Asian | -1.9 | -0.8 | +1.2 | +0.9 | +2.1 | +2.4 | +3.5 |
| South Asian | -1.9 | -0.7 | +1.3 | +1.4 | +2.1 | +2.4 | +4.4 |
| Middle Eastern & North African | -0.8 | -0.2 | +0.5 | +0.6 | +1.4 | +1.9 | +1.9 |
| Black (African and African diaspora) | -1.9 | -1.5 | +0.1 | -1.2 | +0.4 | +0.1 | +0.2 |
| Latin American | -1.3 | -0.8 | +0.8 | +0.3 | +1.2 | +0.7 | +1.8 |
| Northern & Western European | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| Southern European | -0.8 | -0.2 | +0.8 | +1.1 | +1.6 | +1.5 | +2.2 |
| Eastern European | -0.9 | -0.4 | +0.1 | -0.1 | +0.7 | +0.8 | +1.2 |

- **Used as measured:** the brow ridge, nasal root and cheekbone values. The directions agree with the anthropological
  literature: lower nasal roots and brow ridges in East Asian and African-descended faces, more forward cheekbones in
  Asian faces.
- **Not used:** the nose tip, lip and chin estimates. They are erratic (the chin moves with head pitch), and for lips
  they contradict the literature (Black faces read as no more protrusive than European ones).

Lips and nose come from the literature instead:

| Feature | Grade | Value used | Source |
| --- | --- | --- | --- |
| Lips against the E-line (nose tip to chin), Caucasian | reported | upper −4, lower −2 mm (Ricketts) | [IIUM 2019](https://journals.iium.edu.my/ktn/index.php/ijohs/article/download/164/103/2863) |
| Malaysian Chinese | reported | upper −0.04, lower +1.66 mm | as above |
| Malay women | reported | upper −1.3, lower +0.19 mm | as above |
| North Indians | reported | close to white American norms except nasal prominence | [PMC3955467](https://pmc.ncbi.nlm.nih.gov/articles/PMC3955467) |
| Black adults | reported | more prominent lips (lip thickness, bimaxillary protrusion); no adult numbers retrieved | reviews as cited by the search above |
| Lip protrusion applied | estimated | 0.6 of the E-line difference (part of it comes from the nose and chin): East Asian +2.4 / +2.2, Southeast Asian +1.6 / +1.3, Black +2.5 / +2.5, others 0–1 mm | — |
| Nasal bridge and tip | estimated | lower and less projecting in East Asian, Southeast Asian and Black faces (−1.5 mm), slightly in Latin American (−0.8) and South Asian (−0.5), higher in Middle Eastern (+1.0 / +0.5) | the rhinoplasty literature's descriptions; no common numeric table found |
| Chin | — | unchanged | no reliable numbers |

## Results

Each type, with its photographs' licences (the per-photograph credits are in the data file and the Beautiful faces story):

| Group | Sex | Stars | Calm mouths | Residual (mm) | Mouth corners below the midline (mm) | Licences |
| --- | --- | --- | --- | --- | --- | --- |
| East Asian | women | 31 | 12 | 1.42 | -0.11 | 17 CC BY, 14 CC BY-SA |
| East Asian | men | 27 | 18 | 1.37 | 0.71 | 18 CC BY, 9 CC BY-SA |
| Southeast Asian | women | 26 | 6 | 1.12 | 1.09 | 13 CC BY, 9 CC BY-SA, 4 public domain / CC0 |
| Southeast Asian | men | 17 | 10 | 1.81 | 1.58 | 11 CC BY, 5 CC BY-SA, 1 public domain / CC0 |
| South Asian | women | 26 | 9 | 2.07 | 0.30 | 21 CC BY, 5 CC BY-SA |
| South Asian | men | 17 | 11 | 2.32 | 1.02 | 13 CC BY, 4 CC BY-SA |
| Middle Eastern & North African | women | 20 | 11 | 0.98 | 0.33 | 9 CC BY, 11 CC BY-SA |
| Middle Eastern & North African | men | 9 | 7 | 1.17 | 1.78 | 6 CC BY, 2 CC BY-SA, 1 public domain / CC0 |
| Black (African and African diaspora) | women | 25 | 9 | 1.38 | 0.44 | 10 CC BY, 13 CC BY-SA, 2 public domain / CC0 |
| Black (African and African diaspora) | men | 11 | 2 | 1.64 | -0.40 | 3 CC BY, 7 CC BY-SA, 1 public domain / CC0 |
| Latin American | women | 20 | 3 | 1.40 | 0.19 | 8 CC BY, 10 CC BY-SA, 2 public domain / CC0 |
| Latin American | men | 8 | 2 | 2.28 | 1.71 | 5 CC BY, 2 CC BY-SA, 1 public domain / CC0 |
| Northern & Western European | women | 28 | 13 | 1.34 | 0.56 | 8 CC BY, 20 CC BY-SA |
| Northern & Western European | men | 21 | 12 | 1.48 | 0.73 | 6 CC BY, 15 CC BY-SA |
| Southern European | women | 20 | 9 | 1.19 | 0.78 | 3 CC BY, 16 CC BY-SA, 1 public domain / CC0 |
| Southern European | men | 17 | 13 | 1.51 | 1.02 | 3 CC BY, 14 CC BY-SA |
| Eastern European | women | 17 | 5 | 1.39 | 0.14 | 8 CC BY, 9 CC BY-SA |
| Eastern European | men | 8 | 5 | 1.24 | 0.94 | 3 CC BY, 5 CC BY-SA |

Face-shape variants (each from the stars of one cluster):

- East Asian, women: a wider jaw, a broader chin (11); a narrower jaw, a finer chin (20)
- East Asian, men: a wider nose, higher brows (17); a narrower nose, lower brows (10)
- Southeast Asian, women: wider cheekbones, longer eyes (14); narrower cheekbones, a narrower jaw (12)
- Southeast Asian, men: wider cheekbones, a wider jaw (8); narrower cheekbones, a narrower jaw (9)
- South Asian, women: higher brows, a wider nose (11); lower brows, a narrower nose (15)
- South Asian, men: longer eyes, a finer chin (10); a broader chin, shorter eyes (7)
- Middle Eastern & North African, women: a finer chin, a narrower jaw (15); a broader chin, a wider jaw (5)
- Middle Eastern & North African, men: shorter eyes, a broader chin (4); longer eyes, a finer chin (5)
- Black (African and African diaspora), women: a longer face, a wider nose (4); a shorter face, a narrower nose (21)
- Black (African and African diaspora), men: a longer face, a wider nose (6); a shorter face, a narrower nose (5)
- Latin American, women: higher brows, a narrower nose (9); lower brows, a wider nose (11)
- Latin American, men: a shorter face, shorter eyes (4); a longer face, longer eyes (4)
- Northern & Western European, women: a broader chin, wider cheekbones (6); a finer chin, a narrower jaw (22)
- Northern & Western European, men: a shorter face, narrower cheekbones (13); a longer face, wider cheekbones (8)
- Southern European, women: narrower cheekbones, a shorter face (15); wider cheekbones, a longer face (5)
- Southern European, men: wider cheekbones, a wider nose (13); a narrower nose, narrower cheekbones (4)
- Eastern European, women: a shorter face, a narrower nose (6); a longer face, a wider nose (11)
- Eastern European, men: a finer chin, a longer face (4); a broader chin, a shorter face (4)

## Limits

- Group averages are still averages: each type is several people, so it copies no one's likeness. The variants keep
  more of each group's real range.
- Depth comes from a single-image landmark model (brow, nasal root, cheek) or from sparse literature (lips, nose). It
  is estimated, not scanned.
- Event photographs vary in focal length, and closer cameras exaggerate noses. The averages dilute this but do not
  remove it.
- The photographs show makeup, styling and lighting. The fit measures shape only.
- Hair is still the weakest part of the portraits.
