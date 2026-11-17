# The shape of beautiful real faces (ANAT1)

These scripts fit `registry/anatomy/data/face-composite.json`: per-vertex offsets that bring `beautifulFace` to the
average shape of film stars' faces (`realFaces`), measured on public-domain studio portraits. They are not part of the
build.

Method and results: [research note](../../../docs/research/beautiful-faces-2026-11-16.md).

Requirements:
- Python 3 with numpy, OpenCV and mediapipe;
- MediaPipe's face landmarker model (`face_landmarker.task`, Apache 2.0) from
  `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`.

Steps (downloaded images stay in a scratch folder of their own, out of the repository; run Python with `-I`):

1. `python 1-find-portraits.py names.json candidates.json`: public-domain or CC0 portraits per name on Wikimedia
   Commons (the API only), with the licence read from it. One query every eight seconds.
2. `python 2-download-thumbnails.py candidates.json img/ 2`: standard 960 px thumbnails, a few seconds apart, with
   `img/sources.json`. Commons rate-limits bursts; if it keeps answering 429, wait, or fetch the listed URLs another way.
3. `python facegeo.py face_landmarker.task geo.json img/*`: 478 landmarks per photograph, frontalised by the inverse
   head rotation, centred on the eyes' centres (the middle of each eye's corners) and scaled to put them one unit
   apart; the head pose, the face's width and how many other faces the frame holds.
4. Look at the photographs the next step picks (a contact sheet of the face crops) and list in `excluded.json` the
   ones to leave out: closed or squinting eyes, a child's photograph, an older age, the wrong person.
   `python 4-targets.py targets.json geo.json --exclude excluded.json`: per sex, one photograph a person (the most
   frontal, |yaw| ≤ 22°, alone in the frame, the face at least 140 px wide), only closed, unsmiling mouths; the mean.
5. `python 5-fit.py face_landmarker.task targets.json female 6`, then `male`: renders the face (`fit_face.ts`, run
   with `npx vite-node` from the repository), reads it the same way and moves the vertices by half the remaining
   difference, symmetrised and smoothed, keeping the best iteration. Lid margins and the inner lip line are left out.
6. `python 6-export.py targets.json geo.json img/sources.json registry/anatomy/data/face-composite.json`: the
   photographs used and the counts.
