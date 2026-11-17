# Makeup and beauty theory (MAKEUP1) — research, 2026-11-16

The owner asked for a makeup and beauty engine that learns beauty principles from real photographs and applies them to
other faces in code. The engine must ground each operation in classical beauty theory, so that any agent can make
beautiful faces and makeup.

Grades:
- **reported:** quoted from a study.
- **learned:** measured by this pack's Python pipeline on openly licensed photographs.
- **convention:** makeup-artist and cosmetology practice, consistent across sources, not tested experimentally.
- **estimated:** an amount chosen within what the sources support.

## What makeup does to how a face reads

| Finding | Source | Grade | Applied as |
| --- | --- | --- | --- |
| Women judged eye makeup the largest single contributor to a full makeover; for men, foundation and eye makeup both mattered (10 women; bare, foundation, eye, lip, full) | Mulhern et al. 2003, Int. J. Cosmet. Sci. 25(4):199 | reported (abstract) | Looks put contrast in the eyes first |
| Women have more luminance contrast between eyes, lips and skin than men; cosmetics increase it | Russell 2009, Perception 38:1211 | reported | Lips and eyes darkened on an evened skin |
| 44 women made up "for a night out": eye contrast rose (d = 1.46), mouth contrast rose, brow contrast fell (d = 0.52); the skin under the brow darkened by about 6 L* | Jones, Russell & Ward 2015, Evol. Psychol. 13:210 | reported | Lid and crease 6-15 L* below the skin |
| Contrast falls with age; faces with contrast raised were judged younger in 93% of choices (about 1.3 years) | Porcheron, Mauger & Russell 2013, PLoS ONE 8:e57985 | reported | Intensity keeps contrast |
| Observers made faces healthiest by raising db* +5.25, da* +1.62, dL* +1.21 (51 Caucasian faces) | Stephen, Law Smith, Stirrat & Perrett 2009, Int. J. Primatol. 30:845 | reported | Foundation carries 30% of this shift |
| Lighter periorbital skin and redder cheeks each raised perceived health (manipulations of about +/-4.8 L* and a*) | Jones, Porcheron, Sweda, Morizot & Russell 2016, Body Image 17:57 | reported | Concealer about +5 L*, blush +5 to +10 a* |
| Raising lip redness contrast made women's faces more feminine and attractive | Stephen & McKeegan 2010, Perception 39:1104 | reported | Lipstick reddens against the skin |
| Eyeliner or mascara makes eyes look up to 6% larger (13% in area), not additive; eyeshadow about 5% | Matsushita, Morikawa & Yamanami 2015, J. Cosmet. Sci. 66:161 | reported | Liner and mascara in eye looks |
| With makeup, eyes and brows looked larger; professional makeup made noses look smaller; lips barely changed | Jones, Porcheron & Russell 2018, Psychol. Aesthet. Creat. Arts 12:359 | reported | Nose contour in sculpted looks |
| All three professional looks raised attractiveness at a glance; with unlimited viewing the high-contrast glamour look lost trust | Etcoff et al. 2011, PLoS ONE 6:e25656 (P&G co-author) | reported | Glamour labelled; intensity 1 is professional |
| Homogeneous skin colour relates to perceived youth, health and attractiveness | Matts, Fink, Grammer & Burquest 2007, JAAD 57:977 (P&G co-authors) | reported | Foundation evens colour first |
| Observers preferred the brow peak at 71% of the eye width (about the lateral limbus); Westmore put it above the limbus, Byrd on the nose wing-limbus line; Cook et al. 1989 above the lateral canthus | Griffin & Kim, Ideal Female Brow Aesthetics, Clin. Plast. Surg. (review) | reported | Atlas brow peak at 71% |
| Cheek hue 53.6 +/- 7.7 degrees across Caucasian, Chinese, Kurdish and Thai adults (spectrophotometer, n = 960) | Xiao et al. 2017, Skin Res. Technol. 23:21, Table 2 | reported (data), estimated (split) | Undertone terciles |
| Light advances, shadow recedes: contour in the hollows, highlight on the high planes | Chiaroscuro; makeup practice (Aucoin 1997) | convention | Contour, highlight, bronzer zones |
| Face-shape placement: steeper contour and lifted blush for round faces, horizontal for long faces, jaw corners for square, temples for heart | Brand and artist guides; consistent, not tested | convention | `FACE_SHAPE_RULES` |
| Eye-shape placement: crease shade above the natural crease on hooded lids, gradients on single lids, lifted wings on downturned eyes | Makeup practice | convention | `EYE_SHAPE_RULES` |

**No study found** tests blush placement or cheek contour position on perceived face shape. The placement rules are
convention. They are graded so.

## Reference datasets and their licences

| Set | What | Licence | Use here |
| --- | --- | --- | --- |
| Face Research Lab London Set (DeBruine & Jones 2017) | 102 adults, bare, neutral front views, 1350 px, 1-7 attractiveness ratings by 2,513 raters | CC BY 4.0 (figshare API); consent for studies and to illustrate research | Bare prior, beauty correlations; photos kept local |
| Openverse (CC0, PDM) | Stock portraits (StockSnap, Flickr) through the Openverse API and its image proxy | CC0 1.0, PDM 1.0 | Made-up references; labels reviewed by eye |
| FFHQ (Karras et al. 2019) | 70,000 Flickr faces, 1024 px | Dataset CC BY-NC-SA 4.0; each image keeps its Flickr licence | Adapter keeps the CC0, PDM, US-Gov and CC BY images |
| FFHQ-Makeup (2025) | 18,000 FFHQ identities x 5 synthetic makeup styles | Inherits FFHQ: non-commercial | Not used (synthetic, NC) |
| MT (BeautyGAN, Li et al. 2018) | 2,719 makeup, 1,115 bare faces | Research use (no licence stated) | Adapter, research-only flag |
| CelebA-HQ | 30,000 celebrity faces with CelebA's Heavy_Makeup and Wearing_Lipstick labels | Non-commercial research | Adapter, research-only flag |

`learn --ship` writes `data/makeup-learned.json` only when every source may ship.

## Method decisions

- **Python for the photo pipeline, TypeScript for the library.** MediaPipe Tasks (1.2.3) and OpenCV process batches of
  photographs offline. The library needs no runtime dependency: plans, zones and paint are plain TypeScript.
- **One rest frame for every face.** Zones evaluate on the face's own rest-frame landmarks, so ANAT1 faces and photo
  faces use the same code. The 468-point mesh is the UV map: a pixel's triangle and barycentric weights name the same
  place on every face.
- **Separate the light from the paint.** A robust fit (Tukey biweight) finds the face's own light. The model is
  ambient-occluded order-2 spherical harmonics plus the key light's shadowed Lambert term. Occlusion and shadows are
  ray-traced on the mesh. Image / shading is the albedo the makeup changed. A first version without occlusion read the
  bare lids at -13 L*. With occlusion they read -10.
- **Subtract what bare faces show.** Natural lip, cheek and lid colour is not makeup. The bare prior (median over 104
  bare faces per zone) is subtracted.
- **Calibrate finish on bare skin.** Fixed sparkle thresholds called studio-lit bare skin "glitter" (pores read as
  points). The thresholds now come from the bare faces' own percentiles.
- **Average-face shape reference.** Photo landmarks put the face outline on the visible cheek, the canonical mesh behind
  it. Fixed prototypes therefore called most faces "oblong". The reference is now the bare faces' mean.
- **Gate transfers by product physics.** One photo cannot fully separate makeup from light and colour grading. A first
  dense transfer carried orange, green and purple patches from the reference's light. The default transfer is now
  parametric (zone colour, placement and finish as plan layers). Contour must darken, highlight and concealer must
  lighten, and blush must redden. Lipstick goes over the target's own lips.
- **Keep relief under paint.** Foundation first flattened the light on the cheeks. Real foundation evens colour more
  than form. A film's pigment now takes 85% of the luminance relief under it. The relief is measured within the film's
  own cover: the darkness of the lips against the skin is their colour, not relief.
- **Lay a transfer as a film.** The first transfer added the measured change in CIELAB to the target's lips. When the
  target's lips differed from the bare average, it counted their colour twice. The transfer now solves the product's
  pigment over the bare prior. Then it lays that pigment with the product's hide over the target's own colour. A local
  before/after check found this (`makeup.py pairs --transfer`: the same people with and without makeup). The check's
  photos and results do not ship.

## What the renders changed

| First result | Fixed by |
| --- | --- |
| The deep-skin reference read L* 56 (the brightest 40% is mostly shine on dark skin) | The skin's local colour in light: shading percentiles 40-85, shine removed (L* 46) |
| Bare studio skin classified as "glitter" | Finish thresholds from bare-skin percentiles |
| Almost every face "oblong" | The bare faces' mean as the oval reference |
| The brow fill collapsed to 0.6 mm at its peak | The peak anchor on the upper brow edge |
| Contour mostly on the turned-away side of ANAT1's narrower face | Its front end brought forward toward the iris (it still stops before it) |
| Face-chart numbers stacked on the nose | One number per zone on its own side, moved apart where they would overlap |
| Lipstick read as a flat sticker | Relief kept under the film |
| A lipstick transfer counted the target's own lip colour twice (too red on red lips, too yellow on yellow lips) | The pigment solved over the bare prior and laid with the product's hide |
| Transferred lipstick came out darker than on the reference | The relief measured within the film's cover, not against the skin around the lips |
| `paintPhoto` darkened lipstick and brow colour by the bare feature's own darkness | The feature's darkness kept in its colour, and the film lit like the skin around it |
| A reference with glasses gave eyeshadow from the frames | The transfer leaves out the review's `exclude_zones` |

## Limits

- The prior comes from studio-lit faces. Directional light leaves some shadow in the jaw, temple and socket zones.
- 17 made-up references show directions, not effect sizes. Different people and cameras sit in the two groups.
- A transfer from one reference can carry the reference's own lid and lash-line darkness as eyeshadow and liner.
- Exploratory correlations: 18 features per sex, n = 49 and 53.
- Undertone classes and face-shape classes are estimates and conventions.
- No human visual review yet.
