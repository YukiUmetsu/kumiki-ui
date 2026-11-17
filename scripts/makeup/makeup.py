#!/usr/bin/env python3
"""MAKEUP1 photo pipeline: learn makeup from licensed reference photographs and paint it onto other faces.

  # Phase 1: ingest references (each adapter knows its licence; the gate keeps CC0, PDM, US-Gov and CC BY by default)
  python3 -I scripts/makeup/makeup.py ingest frl-london  --root <FRL folder>                 --out <work>/refs
  python3 -I scripts/makeup/makeup.py ingest openverse   --query "makeup portrait" --limit 40 --out <work>/refs --downloads <work>/dl
  python3 -I scripts/makeup/makeup.py ingest folder      --root <photos> --licence cc0-1.0 --makeup yes --out <work>/refs
  python3 -I scripts/makeup/makeup.py geometry <image>                     # facial architecture of one photo (JSON)
  python3 -I scripts/makeup/makeup.py landmarks <image> --out face.json    # for the TypeScript paintPhoto

  # Phase 2: blueprints, then what many references teach
  python3 -I scripts/makeup/makeup.py analyze <work>/refs [--prior <work>/learned.json] [--overlays]
  python3 -I scripts/makeup/makeup.py learn   <work>/refs --out <work>/learned.json [--ship registry/anatomy/data/makeup-learned.json]
  python3 -I scripts/makeup/makeup.py pairs   <work>/pairs --out local-assets/makeup/paired-validation.json [--transfer]   # before/after check

  # Phase 3: paint a blueprint (transfer) or a plan (from the TypeScript designMakeup) onto a new face
  python3 -I scripts/makeup/makeup.py apply <target.jpg> --blueprint <ref>.blueprint.json --out out.png [--warp atlas|mesh|tps] [--adapt pigment|relative]
  python3 -I scripts/makeup/makeup.py apply <target.jpg> --plan plan.json --out out.png

Run it from a virtual environment with scripts/makeup/requirements.txt installed. -I keeps the working folder off
the import path (downloads are untrusted); this file adds only its own package folder.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from kumiki_makeup import sources  # noqa: E402


def _records(a) -> object:
    if a.adapter == "frl-london":
        return sources.frl_london(a.root)
    if a.adapter == "folder":
        made = None if a.makeup == "unknown" else a.makeup == "yes"
        return sources.folder(a.root, a.licence, a.credit or "", made)
    if a.adapter == "openverse":
        return sources.openverse(a.query, a.downloads, a.licences, a.limit, True if a.makeup in ("yes", "unknown") else False)
    if a.adapter == "paired":
        return sources.paired(a.root, a.metadata, a.licence, a.credit or "")
    if a.adapter == "ffhq":
        return sources.ffhq(a.root, a.metadata)
    if a.adapter == "celebahq":
        return sources.celebahq(a.root, a.metadata)
    if a.adapter == "mt":
        return sources.mt(a.root)
    raise SystemExit(f"unknown adapter {a.adapter}")


def cmd_ingest(a):
    from kumiki_makeup.ingest import ingest

    allow = tuple(a.allow.split(","))
    print(json.dumps(ingest(_records(a), a.out, allow, a.models, a.white_balance, a.max), indent=1))


def cmd_geometry(a):
    import cv2
    import numpy as np

    from kumiki_makeup.geometry import camera_points, face_metrics, rest_frame
    from kumiki_makeup.landmarks import FaceAnalyzer

    rgb = cv2.cvtColor(cv2.imread(a.image), cv2.COLOR_BGR2RGB)
    det = FaceAnalyzer(a.models).detect(rgb, segment=False)
    if det.landmarks is None:
        raise SystemExit("no face found")
    rf = rest_frame(camera_points(det.landmarks, rgb.shape[1], rgb.shape[0]))
    print(json.dumps({"pose": rf["pose"], "fit_residual_mm": round(rf["residual_mm"], 2), **face_metrics(rf["rest"])}, indent=1, default=float))


LABELS = Path(__file__).resolve().parent / "reference-labels.json"


def reviewed(recs: list, labels_path: str | None) -> list:
    """Apply the visual-review labels: merge them into each record and drop the excluded ones."""
    path = Path(labels_path) if labels_path else LABELS
    review = json.loads(path.read_text())["labels"] if path.exists() else {}
    out = []
    for rec in recs:
        lab = review.get(rec["id"])
        if lab and lab.get("exclude"):
            continue
        if lab:
            rec["labels"] = {**rec.get("labels", {}), **{k: v for k, v in lab.items() if k not in ("credit", "licence", "url")}}
        out.append(rec)
    return out


def cmd_landmarks(a):
    """The JSON the TypeScript paintPhoto reads: 478 landmarks in pixels and the face-skin mask as runs."""
    import cv2
    import numpy as np

    from kumiki_makeup.landmarks import SEG_LABELS, FaceAnalyzer

    rgb = cv2.cvtColor(cv2.imread(a.image), cv2.COLOR_BGR2RGB)
    an = FaceAnalyzer(a.models)
    det = an.detect(rgb)
    an.close()
    if det.landmarks is None:
        raise SystemExit("no face found")
    h, w = rgb.shape[:2]
    skin = (det.segmentation.reshape(-1) == SEG_LABELS.index("face-skin")).astype(np.int8)
    edges = np.flatnonzero(np.diff(np.concatenate([[0], skin, [0]])))
    runs = [[int(s), int(e - s)] for s, e in zip(edges[::2], edges[1::2])]
    out = {"schema": "kumiki.makeup.photo-landmarks/1", "width": w, "height": h,
           "landmarks": np.round(det.landmarks * np.array([w, h, w]), 2).tolist(), "skinRuns": runs}
    Path(a.out).write_text(json.dumps(out))
    print(f"wrote {a.out}: {len(out['landmarks'])} landmarks, {len(runs)} skin runs")


def cmd_parity(a):
    """Zone weights at sample points on the canonical face: a fixture the TypeScript tests compare with."""
    import numpy as np

    from kumiki_makeup.geometry import canonical
    from kumiki_makeup.zones import atlas, weight

    V, _ = canonical()
    rng = np.random.default_rng(7)
    idx = np.arange(0, 468, 6)
    pts = V[idx] + rng.normal(0, 2.0, (len(idx), 3))
    out = {"schema": "kumiki.makeup.zone-parity/1", "points": np.round(pts, 4).tolist(),
           "weights": {z["id"]: np.round(weight(z["id"], np.round(pts, 4), V), 6).tolist() for z in atlas()["zones"]}}
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(out) + "\n")
    print(f"wrote {a.out}: {len(pts)} points x {len(out['weights'])} zones")


def cmd_analyze(a):
    import cv2

    from kumiki_makeup.analyze import analyze, overlay, prepare
    from kumiki_makeup.ingest import load_face, load_kept

    learned = json.loads(Path(a.prior).read_text()) if a.prior else {}
    out = Path(a.refs) / "blueprints"
    out.mkdir(exist_ok=True)
    if a.overlays:
        (Path(a.refs) / "overlays").mkdir(exist_ok=True)
    recs = reviewed(load_kept(a.refs), a.labels)
    if a.only:
        recs = [r for r in recs if any(r["id"].startswith(o) for o in a.only.split(","))]
    for k, rec in enumerate(recs):
        rgb, lm, mask = load_face(a.refs, rec)
        face = prepare(rgb, lm, mask)
        bp = analyze(face, learned.get("prior"), rec.get("labels"), learned.get("finish_thresholds"), learned.get("shape_reference"))
        bp["source"] = {key: rec.get(key) for key in ("id", "source", "licence", "credit", "url", "sha256", "ship")}
        bp["files"] = {k: str((Path(a.refs) / v).resolve()) for k, v in rec["files"].items()}
        if learned.get("prior"):
            bp["prior_used"] = learned["prior"]
        (out / f"{rec['id']}.blueprint.json").write_text(json.dumps(bp, indent=1))
        if a.overlays:
            cv2.imwrite(str(Path(a.refs) / "overlays" / f"{rec['id']}.png"), overlay(face, bp))
        print(f"[{k + 1}/{len(recs)}] {rec['id']}: skin {bp['skin']['hex']} {bp['skin']['undertone']['class']}, shape {bp['geometry']['face_shape']['class']}", flush=True)


def cmd_learn(a):
    from kumiki_makeup.learn import learn

    learned = learn(a.refs, a.prior, a.labels)
    Path(a.out).write_text(json.dumps(learned, indent=1))
    print(json.dumps(learned["summary"], indent=1))
    if a.ship:
        from kumiki_makeup.learn import shippable

        Path(a.ship).write_text(json.dumps(shippable(learned), indent=1) + "\n")
        print(f"wrote {a.ship} (licences that may ship only)")


def cmd_pairs(a):
    """Before/after pairs of the same people: what makeup changed, the measurement noise, and the shipped data beside
    them. The result derives from the pairs' licence, so it is written outside the library."""
    from kumiki_makeup.learn import paired_report

    out = Path(a.out).resolve()
    if (Path(__file__).resolve().parents[2] / "registry") in out.parents:
        raise SystemExit("pairs: write the report outside registry/ (it derives from the pairs' licence, which may not ship)")
    shipped = json.loads(Path(a.compare).read_text()) if a.compare else None
    report = paired_report(a.refs, shipped)
    if a.transfer:
        from kumiki_makeup.learn import paired_transfer

        report["transfer"] = paired_transfer(a.refs)
        report["summary"]["transfer dE00 to the made-up photo (before, after, n)"] = {
            z: [d["before"]["median"], d["after"]["median"], d["n"]] for z, d in report["transfer"]["made_up"].items()}
        report["summary"]["transfer dE00 moved where nothing was made up"] = {z: d["median"] for z, d in report["transfer"]["moved_untouched"].items()}
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=1))
    print(json.dumps(report["summary"], indent=1))


def cmd_apply(a):
    from kumiki_makeup.paint import apply_file

    print(json.dumps(apply_file(a.target, a.out, blueprint=a.blueprint, plan=a.plan, warp=a.warp, adapt=a.adapt, strength=a.strength, models=a.models,
                                before_after=a.before_after, prior=a.prior), indent=1))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--models", help="MediaPipe model cache folder (default local-assets/makeup/models)")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("ingest", help="Phase 1: licence-gated ingestion, landmarks, quality, alignment")
    s.add_argument("adapter", choices=["frl-london", "folder", "paired", "openverse", "ffhq", "celebahq", "mt"])
    s.add_argument("--root")
    s.add_argument("--metadata", help="ffhq-dataset-v2.json (ffhq), list_attr_celeba.txt (celebahq) or the pairs CSV (paired)")
    s.add_argument("--licence", default="unknown", help="folder and paired adapters: the set's licence id (see sources.LICENCES)")
    s.add_argument("--credit")
    s.add_argument("--makeup", choices=["yes", "no", "unknown"], default="unknown")
    s.add_argument("--query", default="makeup portrait")
    s.add_argument("--licences", default="cc0,pdm", help="openverse licence filter")
    s.add_argument("--limit", type=int, default=40)
    s.add_argument("--downloads", help="openverse: download folder (untrusted data, kept apart from code)")
    s.add_argument("--allow", default=",".join(sources.DEFAULT_ALLOW), help="licence ids that pass the gate (add research-only on purpose)")
    s.add_argument("--white-balance", choices=["none", "grayworld"], default="none")
    s.add_argument("--max", type=int, help="stop after this many kept faces")
    s.add_argument("--out", required=True)
    s.set_defaults(fn=cmd_ingest)

    s = sub.add_parser("geometry", help="Phase 1: facial architecture of one photo")
    s.add_argument("image")
    s.set_defaults(fn=cmd_geometry)

    s = sub.add_parser("landmarks", help="landmarks and a skin mask for the TypeScript paintPhoto (Storybook: Makeup, On a photograph)")
    s.add_argument("image")
    s.add_argument("--out", required=True)
    s.set_defaults(fn=cmd_landmarks)

    s = sub.add_parser("parity", help="write the zone-weight fixture that tests/makeup.test.ts compares with")
    s.add_argument("--out", default=str(Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "makeup-zone-parity.json"))
    s.set_defaults(fn=cmd_parity)

    s = sub.add_parser("analyze", help="Phase 2: a blueprint per ingested face")
    s.add_argument("refs")
    s.add_argument("--prior", help="learned.json: the bare-skin prior (adds each zone's makeup effect), finish thresholds and the average face shape")
    s.add_argument("--overlays", action="store_true", help="also write debug pictures")
    s.add_argument("--labels", help="visual-review labels (default scripts/makeup/reference-labels.json)")
    s.add_argument("--only", help="comma-separated id prefixes to analyse")
    s.set_defaults(fn=cmd_analyze)

    s = sub.add_parser("learn", help="Phase 2: bare prior, look statistics and beauty correlations from blueprints")
    s.add_argument("refs")
    s.add_argument("--prior", help="an earlier learned.json to reuse its bare prior")
    s.add_argument("--out", required=True)
    s.add_argument("--ship", help="also write the shippable subset (CC0/PDM/US-Gov/CC BY sources only) here")
    s.add_argument("--labels", help="visual-review labels (default scripts/makeup/reference-labels.json)")
    s.set_defaults(fn=cmd_learn)

    s = sub.add_parser("pairs", help="Phase 2: validate against before/after pairs of the same people (local report)")
    s.add_argument("refs")
    s.add_argument("--compare", default=str(Path(__file__).resolve().parents[2] / "registry" / "anatomy" / "data" / "makeup-learned.json"),
                   help="the shipped learned data to compare with")
    s.add_argument("--out", required=True, help="the report (outside registry/: it derives from the pairs' licence)")
    s.add_argument("--transfer", action="store_true", help="also paint each made-up blueprint onto the same person's bare photo and compare")
    s.set_defaults(fn=cmd_pairs)

    s = sub.add_parser("apply", help="Phase 3: paint a blueprint or a plan onto a face")
    s.add_argument("target")
    s.add_argument("--blueprint")
    s.add_argument("--plan")
    s.add_argument("--warp", choices=["atlas", "mesh", "tps"], default="atlas",
                   help="atlas: the blueprint's zones as plan layers (robust); mesh or tps: its per-pixel effect map, warped")
    s.add_argument("--adapt", choices=["relative", "pigment"], default="relative",
                   help="pigment: the same products on a new skin (they look different on it); relative: the same change of colour relative to the target's skin")
    s.add_argument("--prior", help="learned.json whose bare-skin prior is subtracted from the reference (default: the one the blueprint was analysed with)")
    s.add_argument("--strength", type=float, default=1.0)
    s.add_argument("--before-after", action="store_true")
    s.add_argument("--out", required=True)
    s.set_defaults(fn=cmd_apply)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
