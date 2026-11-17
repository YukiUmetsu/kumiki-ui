# MAKEUP1 photo pipeline (Python)

Learn makeup from openly licensed reference photographs and paint it onto other faces. The TypeScript library
(`registry/anatomy/makeup-*.ts`) reads the same zone atlas (`registry/anatomy/data/makeup-zones.json`) and the learned
aggregates (`registry/anatomy/data/makeup-learned.json`). Spec: [docs/component-specs/makeup.md](../../docs/component-specs/makeup.md).

## Set up

Use a scratch virtual environment. Do not install into the system Python.

```sh
uv venv --python 3.12 .venv-makeup
uv pip install --python .venv-makeup/bin/python -r scripts/makeup/requirements.txt
.venv-makeup/bin/python -I scripts/makeup/makeup.py --help
```

The first run downloads two MediaPipe models (Apache-2.0) into `local-assets/makeup/models` (git-ignored) and checks
their SHA-256. `--models` or `$KUMIKI_MAKEUP_MODELS` choose another folder.

Always run with `-I`. It keeps the working folder off the import path. Keep downloaded images in their own folder.
They are untrusted data and the scripts only read them as images.

## Phase 1: ingest references

```sh
# bare faces with attractiveness ratings (download neutral_front.zip and the two CSV files from figshare 5047666)
python3 -I scripts/makeup/makeup.py ingest frl-london --root <FRL folder> --out work/refs
# made-up references, CC0 and public domain, through Openverse's API and image proxy
python3 -I scripts/makeup/makeup.py ingest openverse --query "makeup portrait" --limit 40 --makeup yes --downloads work/dl --out work/refs
# any folder with one licence (a sources.json beside the images overrides per file)
python3 -I scripts/makeup/makeup.py ingest folder --root <photos> --licence cc0-1.0 --makeup yes --out work/refs
# research-only sets: opt in explicitly; 'learn --ship' refuses them
python3 -I scripts/makeup/makeup.py ingest mt --root <MT> --allow research-only --out work/refs
python3 -I scripts/makeup/makeup.py geometry photo.jpg      # facial architecture of one photo
```

Each record goes through the licence gate (`sources.LICENCES`). Then it gets 478 landmarks, the head pose and a
skin/hair segmentation. Quality checks follow: face size, pose, eyes open, mouth closed, skin cover, sharpness and
clipping. Last, a similarity alignment to 512 x 512 levels the pupils. `manifest.jsonl` records every decision and measurement.

Review what the search returned before you learn from it. `reference-labels.json` holds the review of the shipped run:
makeup or bare, style, zones to leave out, pictures to exclude.

## Phase 2: blueprints and learning

```sh
python3 -I scripts/makeup/makeup.py analyze work/refs --overlays                  # blueprints/<id>.blueprint.json
python3 -I scripts/makeup/makeup.py learn work/refs --out work/learned.json      # bare prior, effects, correlations
python3 -I scripts/makeup/makeup.py analyze work/refs --prior work/learned.json  # adds each zone's makeup effect
python3 -I scripts/makeup/makeup.py learn work/refs --prior work/learned.json --out work/learned.json \
  --ship registry/anatomy/data/makeup-learned.json
```

A blueprint (`kumiki.makeup.blueprint/1`) holds:

- **geometry:** facial thirds, fifths, canthal tilt, palpebral ratio, lip ratio, brow map, cheekbone apex, asymmetry,
  face shape.
- **skin:** CIELAB, ITA, undertone, evenness.
- **light:** the fitted model and the key direction.
- **zones:** per zone, the observed dL*, da*, db* against the skin and the effect after the bare prior. Each zone also
  has its placement: centroid, angle and spread in eye widths.
- **palettes:** k-means in CIELAB of lips, lids and cheeks, with each colour's chroma (saturation) and share.
- **contrast:** facial contrast after Porcheron et al. 2013.
- **finish:** specular share, peak, sparkle, the local variance of fine texture, and the class.

## Phase 3: paint

```sh
python3 -I scripts/makeup/makeup.py apply target.jpg --plan plan.json --out out.png --before-after
python3 -I scripts/makeup/makeup.py apply target.jpg --blueprint work/refs/blueprints/<id>.blueprint.json --out out.png
python3 -I scripts/makeup/makeup.py apply target.jpg --blueprint <...> --warp tps --out out.png   # dense transfer
python3 -I scripts/makeup/makeup.py landmarks photo.jpg --out photo.json   # for the TypeScript paintPhoto
```

`--warp atlas` (the default) turns the blueprint's zones into plan layers. Each layer is a film with its product's
hide. The reference's made-up colour, laid over the colour that bare faces show in that zone (the prior), gives the
pigment. The film puts that pigment over the target's own colour: an opaque lipstick covers the target's lips and a
stain tints them. Each layer also takes the measured placement and finish.

Effects that break product physics are dropped: contour must darken, highlight and concealer must lighten, blush must
redden. The zones that the visual review excluded (`exclude_zones` in `reference-labels.json`) are not transferred.
One photo cannot fully separate makeup from the person's own colouring and the photo's light. A reference with no eye
makeup can still give eyeshadow and liner from its natural lid and lash-line darkness. Review each reference and list
such zones in `exclude_zones`.

`--warp mesh` carries the per-pixel effect through the shared mesh (piecewise affine). `--warp tps` carries it through
a thin-plate spline on 86 landmarks. With `--adapt relative`, both dense warps add the measured change in CIELAB,
without a film. They are denoised and gated, and they are still noisier than `atlas`.

`--adapt relative` (the default) solves the pigment on the target's skin colour, so the look follows the target's skin
and exposure. `--adapt pigment` lays the reference's pigment without a change.

## Check against before/after pairs

Photos of the same people with and without makeup test what unpaired references cannot: the person and, in one photo
session, the light cancel out. Keep a set local when its licence does not let it ship.

```sh
python3 -I scripts/makeup/makeup.py ingest paired --root <set> --metadata <set>/pairs.csv --licence cc-by-nc-nd-4.0 --out work/pairs
python3 -I scripts/makeup/makeup.py analyze work/pairs --prior work/learned.json
python3 -I scripts/makeup/makeup.py pairs work/pairs --transfer --out local-assets/makeup/paired-validation.json
```

The CSV has one row per person. The columns `no_makeup` and `with_makeup` name the two photos, in the folders
`no_makeup/` and `with_makeup/`. An optional column `part` names what was made up: lips, eyes or skin.

`pairs` reports the change (made up minus bare) in each zone that the part covers. The other zones give the noise
between two photos of one bare face. The report puts the change beside the shipped effects and contrast. `pairs` does
not write under `registry/`.

`--transfer` paints each made-up blueprint onto the same person's bare photo. It gives the CIEDE2000 from the real
made-up photo before and after, and how far the transfer moved the zones that had no makeup. The plan ignores the
reference's labels, so the second number shows what an unreviewed reference carries over.

## Files

| File | Phase | What |
|---|---|---|
| `makeup.py` | all | the command line |
| `kumiki_makeup/models.py` | 1 | model download and SHA-256 check |
| `kumiki_makeup/sources.py` | 1 | dataset adapters, `LICENCES`, the gate |
| `kumiki_makeup/landmarks.py` | 1 | MediaPipe FaceLandmarker and the multiclass segmenter |
| `kumiki_makeup/ingest.py` | 1 | quality checks, alignment, manifest |
| `kumiki_makeup/geometry.py` | 1 | rest frame, rasteriser, facial architecture |
| `kumiki_makeup/zones.py` | 2, 3 | the shared atlas on a face |
| `kumiki_makeup/color.py` | 2 | CIELAB, CIEDE2000, ITA, undertone, palettes, contrast |
| `kumiki_makeup/shading.py` | 2, 3 | the light model: occluded SH9 plus the shadowed key |
| `kumiki_makeup/analyze.py` | 2 | blueprints and debug overlays |
| `kumiki_makeup/learn.py` | 2 | prior, thresholds, effects, placement, contrast, correlations |
| `kumiki_makeup/paint.py` | 3 | films, frequency separation, finish, mesh and TPS warps, transfer |
