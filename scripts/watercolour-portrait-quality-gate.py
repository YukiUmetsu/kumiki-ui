#!/usr/bin/env python3
"""Fail-closed pixel and critical-feature audit for AUTHORIZED reference-aligned art.

This is a numeric component of ArtCraft v6, not a substitute for artistic
approval. It compares the *same* subject/pose/crop, never different artists'
faces. The visual assessment of semantic topology and style stays separate.
"""
from __future__ import annotations
import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import cv2
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity

REQUIRED = frozenset(("full-face", "near-eye", "far-eye", "nose", "mouth", "hairline", "jaw"))
METRIC_KEYS = frozenset(("min_ssim", "min_edge_f1", "min_detail_ratio", "max_detail_ratio", "max_color_mae"))

def file_sha(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()

def as_image(path: Path) -> tuple[np.ndarray, np.ndarray]:
    if not path.is_file():
        raise ValueError(f"Missing image: {path}")
    with Image.open(path) as im:
        if im.width < 500 or im.height < 500:
            raise ValueError("Both source and render must be native images at least 500x500")
        rgba = np.asarray(im.convert("RGBA"))
        return rgba[:, :, :3], rgba[:, :, 3]

def assert_manifest(m: dict) -> None:
    if m.get("schemaVersion") != 1 or m.get("mode") != "same-subject-same-pose":
        raise ValueError("Require schemaVersion=1, mode=same-subject-same-pose")
    if m.get("rights") not in ("user-owned", "licensed-derivative", "public-domain"):
        raise ValueError("Source must be authorized for faithful derived comparison")
    if not isinstance(m.get("reference"), str) or not isinstance(m.get("candidate"), str):
        raise ValueError("Missing source/candidate paths")
    if not isinstance(m.get("sourceCode"), str) or not m["sourceCode"].strip():
        raise ValueError("A source code path is required: no untraceable bitmap-only acceptance")
    regions = m.get("regions")
    if not isinstance(regions, list) or len(regions) < len(REQUIRED):
        raise ValueError("Critical anatomy and material regions are mandatory")
    if set(r.get("id") for r in regions) != REQUIRED:
        raise ValueError("Exactly seven region IDs required: " + ", ".join(sorted(REQUIRED)))
    for r in regions:
        b = r.get("bbox")
        if not isinstance(b, list) or len(b) != 4 or any(type(v) is not int for v in b):
            raise ValueError(f"Invalid bbox for {r['id']}")
        if b[2]-b[0] < 60 or b[3]-b[1] < 40:
            raise ValueError(f"Crop too small to support face review for {r['id']}")
        t = r.get("thresholds")
        if not isinstance(t, dict) or set(t) != METRIC_KEYS:
            raise ValueError(f"Incomplete frozen thresholds for {r['id']}")
        if not (.65 <= t["min_ssim"] <= .99 and .65 <= t["min_edge_f1"] <= .99):
            raise ValueError("Numeric similarity bounds must be strict")
        if not (.5 <= t["min_detail_ratio"] <= 1 <= t["max_detail_ratio"] <= 1.5):
            raise ValueError("Missing conservative texture detail envelope")
        if not (0 < t["max_color_mae"] <= 22):
            raise ValueError("Color error bound must be narrow (RGB 0..255)")

def metrics(src: np.ndarray, cand: np.ndarray) -> dict:
    gray_src = cv2.cvtColor(src, cv2.COLOR_RGB2GRAY)
    gray_cand = cv2.cvtColor(cand, cv2.COLOR_RGB2GRAY)
    sim = float(structural_similarity(src, cand, data_range=255, channel_axis=2,
                                      gaussian_weights=True, sigma=1.5))
    # Freeze edge thresholds using the SOURCE's gradient distribution; don't
    # tune thresholds to a low-detail candidate to artificially boost its score.
    sobel_x = cv2.Sobel(gray_src, cv2.CV_32F, 1, 0)
    sobel_y = cv2.Sobel(gray_src, cv2.CV_32F, 0, 1)
    values = cv2.magnitude(sobel_x, sobel_y)
    high = max(20, min(140, float(np.quantile(values, .8))))
    low = max(10, high*.4)
    se = cv2.Canny(gray_src, low, high)>0
    ce = cv2.Canny(gray_cand, low, high)>0
    element = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5,5))
    dil_src = cv2.dilate(se.astype(np.uint8), element)>0
    dil_cand = cv2.dilate(ce.astype(np.uint8), element)>0
    # Blank/flat results cannot pass an undefined precision/recall.
    precision = float(np.count_nonzero(ce & dil_src)/max(1,np.count_nonzero(ce)))
    recall = float(np.count_nonzero(se & dil_cand)/max(1,np.count_nonzero(se)))
    f1 = 2*precision*recall/max(1e-9, precision+recall)
    lap_ref = cv2.Laplacian(gray_src, cv2.CV_32F,ksize=3)
    lap_out = cv2.Laplacian(gray_cand, cv2.CV_32F,ksize=3)
    sd_ref = max(1e-8, float(np.mean(np.abs(lap_ref))))
    detail = float(np.mean(np.abs(lap_out)))/sd_ref
    color_mae = float(np.mean(np.abs(src.astype(np.float32)-cand.astype(np.float32))))
    return dict(ssim=round(sim,4),edge_f1=round(f1,4),edge_precision=round(precision,4),
                edge_recall=round(recall,4),detail_ratio=round(detail,4),
                color_mae=round(color_mae,3),source_edges=int(np.count_nonzero(se)),
                render_edges=int(np.count_nonzero(ce)))

def audit(m: dict, base: Path) -> dict:
    assert_manifest(m)
    reference = (base/m["reference"]).resolve()
    candidate = (base/m["candidate"]).resolve()
    code = (base/m["sourceCode"]).resolve()
    if not code.is_file() or code.stat().st_size<256:
        raise ValueError("A substantial source-code artifact is required")
    src,sa = as_image(reference)
    dst,da = as_image(candidate)
    if src.shape!=dst.shape:
        raise ValueError("Source and candidate must be in identical pixel coordinates/pose")
    source_hash,render_hash = file_sha(reference),file_sha(candidate)
    if source_hash==render_hash or np.array_equal(src,dst):
        raise ValueError("Identical copied source image is not a code-generated portrait")
    h,w=src.shape[:2]
    result={"schemaVersion":1,"sourceSha256":source_hash,"renderSha256":render_hash,
            "sourceCodeSha256":file_sha(code),"machinePass":False,
            "artistApproved":False,"regions":[],"failures":[]}
    for r in m["regions"]:
        x1,y1,x2,y2=r["bbox"]
        if not (0<=x1<x2<=w and 0<=y1<y2<=h):
            raise ValueError(f"Region out of image bounds: {r['id']}")
        a,b=src[y1:y2,x1:x2],dst[y1:y2,x1:x2]
        out=metrics(a,b)
        t=r["thresholds"]
        fails=[]
        if out["ssim"]<t["min_ssim"]: fails.append("ssim")
        if out["edge_f1"]<t["min_edge_f1"]: fails.append("edge_f1")
        if not t["min_detail_ratio"]<=out["detail_ratio"]<=t["max_detail_ratio"]:
            fails.append("detail_ratio")
        if out["color_mae"]>t["max_color_mae"]: fails.append("color_mae")
        if np.min(da[y1:y2,x1:x2])<254: fails.append("transparent_pixels")
        if out["source_edges"]<20 or out["render_edges"]<20:
            fails.append("critical_feature_edge_absent")
        result["regions"].append({"id":r["id"],**out,"pass":not fails,"failures":fails})
        result["failures"] += [r["id"]+":"+x for x in fails]
    result["machinePass"]=not result["failures"]
    result["releaseReady"]=False # A reviewer must independently approve render/structure.
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest",type=Path,required=True)
    parser.add_argument("--report",type=Path,required=True)
    args=parser.parse_args()
    m=json.loads(args.manifest.read_text())
    try:
        result=audit(m,args.manifest.parent)
    except Exception as exc:
        result={"schemaVersion":1,"machinePass":False,"artistApproved":False,
                "releaseReady":False,"failures":["manifest:"+str(exc)]}
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({k:result[k] for k in ("machinePass","artistApproved","releaseReady","failures")},indent=2))
    return 0 if result["machinePass"] else 1
if __name__=="__main__":
    sys.exit(main())
