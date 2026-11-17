# The real-face composite (ANAT1)

These scripts build `registry/anatomy/data/face-composite.json`, the shape of real faces that `beautifulFace` applies
(`realFaces`). They are not part of the build.

Method and results: [research note](../../../docs/research/face-composite-2026-11-16.md).

Requirements:
- Python 3 with numpy, OpenCV and mediapipe;
- MediaPipe's face landmarker model (`face_landmarker.task`, Apache 2.0) from
  `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`.

Steps (work in a scratch folder; downloaded images stay out of the repository):

1. `python 1-find-portraits.py names.json candidates.json`: public-domain or CC0 portraits per name on Wikimedia
   Commons, with the licence read from the API.
2. `python 2-download-thumbnails.py candidates.json candidates2.json img/`: standard-size thumbnails, ten seconds
   apart. Commons rate-limits bursts, so keep the pace.
3. `npx vite-node targets.ts targets.json`: the face mesh's neutral vertices by sex.
4. `python 3-landmarks.py face_landmarker.task img/ landmarks.json`: 478 landmarks and the head pose per photograph.
5. `python 4-composite.py targets.json landmarks.json composite.json`:
   - one single-person, near-frontal photograph per person;
   - Procrustes alignment on the upper face;
   - the jaw from closed mouths;
   - the mouth left out and the nose wings damped;
   - symmetrised and smoothed.
6. `python 5-export.py composite.json candidates.json candidates2.json landmarks.json face-composite.json`: offsets and
   the provenance of every photograph.

Rules:
- Measure only public-domain or CC0 photographs, and record each one's title, page and licence.
- Use one photograph per person and many people, so that no one's likeness survives the average.
- Never name a preset or option after a person.
