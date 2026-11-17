# Face types (ANAT1)

These scripts fit `registry/anatomy/data/face-types.json`: for each ancestry group and sex, per-vertex offsets that
bring `beautifulFace` to the shape of modern stars widely seen as beautiful or handsome (`faceType`). Groups are never
blended. They are not part of the build.

Method and results: [research note](../../../docs/research/face-types-2026-11-16.md).

Requirements:
- Python 3 with numpy, OpenCV and mediapipe;
- MediaPipe's face landmarker model (`face_landmarker.task`, Apache 2.0) from
  `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`.

Licences: public domain, CC0, CC BY and CC BY-SA photographs only. They are measured, never copied into the library;
each one is credited (author, licence, page) in the data file.

Steps (downloaded images stay in a scratch folder of their own, out of the repository; run Python with `-I`):

1. `python 1-find-portraits.py groups.json candidates.json [group ...]`: modern photographs (1995 or later where the
   file is dated) per name on Wikimedia Commons, through the API, with author, licence and date.
2. `python 2-download-thumbnails.py img/ 0 1 skip.json candidates.json`: the best-scored 960 px thumbnail a person,
   a few seconds apart, with `img/sources.json`. Run again with `1 2` for a second photograph where the first failed.
3. `python 3-measure.py face_landmarker.task geo.json img/`: 478 landmarks per photograph, frontalised by the inverse
   head rotation, centred on the eyes' centres and scaled to put them one unit apart; the head pose, the face's width
   and how many other faces the frame holds.
4. `python 4-targets.py targets.json geo.json exclude.json`: per type, one photograph a person (alone, |yaw| <= 22°,
   the face at least 120 px wide, the eyes open); the upper face from all, below the nose tip from calm mouths.
   Look at each type with `python contact-sheet.py face_landmarker.task targets.json east-asian:female sheet.jpg img/`
   and list in `exclude.json` the photographs that mislead: glasses, a hat or veil over the face, a microphone over
   the mouth, a much older photograph, the wrong person.
5. `python 5-fit.py face_landmarker.task targets.json east-asian:female 6 img/sources.json geo.json` for each type:
   renders the face (`fit_face.ts`, run with `npx vite-node` from the repository), reads it the same way, moves the
   vertices by half the remaining difference (symmetrised, smoothed), keeps the best iteration, and writes the type
   with its credits. Lid margins and the inner lip line are left out.
6. `python 6-variants.py targets.json geo.json ../../../registry/anatomy/data/face-types.json face_landmarker.task`: two
   face-shape variants a type (k-means on the identity landmarks, four people or more each), at most 5 mm.

Helpers: `usable.py` lists the people who already have a usable photograph (for the second download pass);
`rebuild-sources.py` rebuilds `img/sources.json` from the candidates if two download passes overwrote each other.
