#!/usr/bin/env python3
"""Bake the MakeHuman CC0 body model into ANAT1's compact morphable human lattice.

The MakeHuman base mesh (hm08), macro targets, default skeleton and skin weights are CC0 (released September 2020;
LICENSE.ASSETS.md in https://github.com/makehumancommunity/makehuman). This script reads a local checkout of
`makehuman/data` (base.obj, targets/macrodetails/*.target, targets/macrodetails/height/*.target, rigs/default.mhskel,
rigs/default_weights.mhw) and writes one self-describing binary file:

    python3 scripts/anatomy/bake_makehuman.py <makehuman/data dir> assets/models/anatomy/human-body-lattice.bin

Needs numpy, scipy and fast-simplification (dev-time only; use a scratch virtualenv, nothing is added to the app).

What is stored
* A decimated body surface (about 3,400 vertices) whose every vertex is a fixed barycentric point of the original
  13,380-vertex surface, so every MakeHuman morph transfers exactly; plus the two eyeballs at full resolution.
* Lattice nodes: 72 macro corners (sex x age x muscle x weight, equal ethnic mix, average height) whose multilinear
  blend with MakeHuman's own piecewise-linear weights reproduces any macro setting; 16 height deltas (sex x age x
  min/max height) and 24 ethnic deltas (sex x age x African/Asian/Caucasian, relative to the equal mix).
* A 57-bone skeleton (MakeHuman default skeleton with face, twist and toe-segment bones merged into their nearest
  kept ancestor), joint head/tail points that morph with the body, and 4-bone skin weights.
* Named surface landmarks (ISO 7250 / ANSUR names) as exact original vertices.

Coordinates: metres, +x toward the figure's left, +y up, +z forward (the way the figure faces); origin on the floor
under the pelvis. Positions are int16 at 0.1 mm.
"""
import hashlib
import json
import os
import struct
import sys

import numpy as np
from scipy.spatial import cKDTree
import fast_simplification

QUANT = 1e-4  # metres per int16 step
DM = 0.1      # MakeHuman units are decimetres
TARGET_VERTS = 3400

SEXES = ["female", "male"]
AGES = ["baby", "child", "young", "old"]
LEVELS3 = ["min", "average", "max"]
ETHNICS = ["african", "asian", "caucasian"]

# Kept bones -> merged source bones are everything whose nearest kept ancestor is the key.
KEEP = [
    "root", "spine05", "spine04", "spine03", "spine02", "spine01", "neck01", "neck02", "neck03", "head", "jaw",
    "eye.L", "eye.R",
]
for s in ("L", "R"):
    KEEP += [f"clavicle.{s}", f"shoulder01.{s}", f"upperarm01.{s}", f"lowerarm01.{s}", f"lowerarm02.{s}", f"wrist.{s}",
             f"metacarpal1.{s}", f"metacarpal2.{s}", f"metacarpal3.{s}", f"metacarpal4.{s}",
             f"finger1-1.{s}", f"finger1-2.{s}", f"finger1-3.{s}", f"finger2-1.{s}", f"finger2-2.{s}", f"finger2-3.{s}",
             f"finger3-1.{s}", f"finger3-2.{s}", f"finger3-3.{s}", f"finger4-1.{s}", f"finger4-2.{s}", f"finger4-3.{s}",
             f"finger5-1.{s}", f"finger5-2.{s}", f"finger5-3.{s}",
             f"pelvis.{s}", f"upperleg01.{s}", f"lowerleg01.{s}", f"foot.{s}", f"toe1-1.{s}", f"toe2-1.{s}"]
# Chains whose tail is taken from the last merged descendant (a single anatomical segment).
TAIL_FROM = {}
for s in ("L", "R"):
    TAIL_FROM[f"upperarm01.{s}"] = f"upperarm02.{s}"
    TAIL_FROM[f"upperleg01.{s}"] = f"upperleg02.{s}"
    TAIL_FROM[f"lowerleg01.{s}"] = f"lowerleg02.{s}"
    TAIL_FROM[f"toe1-1.{s}"] = f"toe1-2.{s}"
    TAIL_FROM[f"toe2-1.{s}"] = f"toe2-3.{s}"
RENAME = {"upperarm01": "upperarm", "upperleg01": "thigh", "lowerleg01": "shin", "lowerarm01": "forearm", "lowerarm02": "forearm-twist",
          "toe1-1": "big-toe", "toe2-1": "toes", "shoulder01": "shoulder"}


def rename(b):
    base, _, side = b.partition(".")
    base = RENAME.get(base, base)
    return f"{base}.{side}" if side else base


def read_obj(path):
    V, groups, cur = [], {}, None
    with open(path) as f:
        for line in f:
            if line.startswith("v "):
                V.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("g "):
                cur = line.split()[1]
            elif line.startswith("f "):
                groups.setdefault(cur, []).append([int(p.split("/")[0]) - 1 for p in line.split()[1:]])
    return np.array(V, dtype=np.float64), {k: np.array(v) for k, v in groups.items()}


def read_target(path, n):
    D = np.zeros((n, 3))
    if not os.path.exists(path):
        return None
    with open(path) as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            p = line.split()
            D[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    return D


def tri_closest(p, a, b, c):
    """Closest point on triangle abc to p; returns (point, (u, v, w)) barycentric."""
    ab, ac, ap = b - a, c - a, p - a
    d1, d2 = ab @ ap, ac @ ap
    if d1 <= 0 and d2 <= 0:
        return a, (1, 0, 0)
    bp = p - b; d3, d4 = ab @ bp, ac @ bp
    if d3 >= 0 and d4 <= d3:
        return b, (0, 1, 0)
    vc = d1 * d4 - d3 * d2
    if vc <= 0 and d1 >= 0 and d3 <= 0:
        v = d1 / (d1 - d3); return a + v * ab, (1 - v, v, 0)
    cp = p - c; d5, d6 = ab @ cp, ac @ cp
    if d6 >= 0 and d5 <= d6:
        return c, (0, 0, 1)
    vb = d5 * d2 - d1 * d6
    if vb <= 0 and d2 >= 0 and d6 <= 0:
        w = d2 / (d2 - d6); return a + w * ac, (1 - w, 0, w)
    va = d3 * d6 - d5 * d4
    if va <= 0 and (d4 - d3) >= 0 and (d5 - d6) >= 0:
        w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return b + w * (c - b), (0, 1 - w, w)
    denom = 1 / (va + vb + vc); v = vb * denom; w = vc * denom
    return a + ab * v + ac * w, (1 - v - w, v, w)


def main():
    data_dir, out = sys.argv[1:3]
    V, G = read_obj(os.path.join(data_dir, "3dobjs/base.obj"))
    n = len(V)
    quads = G["body"]
    tris = np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]])
    body_idx = np.unique(quads.ravel())

    # ---- targets -> lattice nodes (in MakeHuman units, absolute for corners, deltas otherwise)
    tdir = os.path.join(data_dir, "targets/macrodetails")
    eth = {}
    for e in ETHNICS:
        for s in SEXES:
            for a in AGES:
                eth[(e, s, a)] = read_target(os.path.join(tdir, f"{e}-{s}-{a}.target"), n)
    corners, corner_keys = [], []
    for s in SEXES:
        for a in AGES:
            mix = sum(eth[(e, s, a)] for e in ETHNICS) / 3
            for m in LEVELS3:
                for w in LEVELS3:
                    U = read_target(os.path.join(tdir, f"universal-{s}-{a}-{m}muscle-{w}weight.target"), n)
                    corners.append(V + mix + (U if U is not None else 0))
                    corner_keys.append(f"{s}/{a}/{m}muscle/{w}weight")
    heights, height_keys = [], []
    for s in SEXES:
        for a in AGES:
            for h in ("min", "max"):
                H = read_target(os.path.join(tdir, f"height/{s}-{a}-averagemuscle-averageweight-{h}height.target"), n)
                heights.append(H if H is not None else np.zeros((n, 3)))
                height_keys.append(f"{s}/{a}/{h}height")
    ethnic, ethnic_keys = [], []
    for s in SEXES:
        for a in AGES:
            mix = sum(eth[(e, s, a)] for e in ETHNICS) / 3
            for e in ETHNICS:
                ethnic.append(eth[(e, s, a)] - mix)
                ethnic_keys.append(f"{s}/{a}/{e}")

    # ---- decimate the neutral body (equal blend of all corners is a good average shape for quadric placement)
    neutral = V
    verts_b = neutral[body_idx]
    remap = -np.ones(n, dtype=np.int64); remap[body_idx] = np.arange(len(body_idx))
    tris_b = remap[tris]
    reduction = 1 - TARGET_VERTS / len(body_idx)
    pts, faces = fast_simplification.simplify(verts_b.astype(np.float32), tris_b.astype(np.int32), target_reduction=reduction)
    pts = pts.astype(np.float64)
    # map every decimated vertex to the closest point of the original surface
    tree = cKDTree(verts_b)
    vert_tris = [[] for _ in range(len(verts_b))]
    for ti, t in enumerate(tris_b):
        for v in t:
            vert_tris[v].append(ti)
    bary_idx = np.zeros((len(pts), 3), dtype=np.int64); bary_w = np.zeros((len(pts), 3))
    for i, p in enumerate(pts):
        _, near = tree.query(p, k=10)
        cand = set()
        for v in near:
            cand.update(vert_tris[v])
        best = None
        for ti in cand:
            a, b, c = verts_b[tris_b[ti]]
            q, uvw = tri_closest(p, a, b, c)
            d = np.sum((q - p) ** 2)
            if best is None or d < best[0]:
                best = (d, ti, uvw)
        bary_idx[i] = body_idx[tris_b[best[1]]]
        bary_w[i] = best[2]

    # ---- eyes (full resolution), triangulated
    eye_faces, eye_idx = [], []
    for g in ("helper-l-eye", "helper-r-eye"):
        q = G[g]; t = np.concatenate([q[:, [0, 1, 2]], q[:, [0, 2, 3]]])
        eye_faces.append(t); eye_idx.append(np.unique(q.ravel()))
    eye_idx = np.concatenate(eye_idx)

    # ---- skeleton
    skel = json.load(open(os.path.join(data_dir, "rigs/default.mhskel")))
    bones = skel["bones"]; joints = skel["joints"]
    def kept_ancestor(b):
        while b not in KEEP:
            b = bones[b]["parent"]
        return b
    joint_names = []
    kept = []
    for b in KEEP:
        parent = bones[b]["parent"]
        parent = kept_ancestor(parent) if parent else None
        tail_src = TAIL_FROM.get(b, b)
        kept.append({"id": rename(b), "parent": rename(parent) if parent else None, "head": bones[b]["head"], "tail": bones[tail_src]["tail"]})
        joint_names += [bones[b]["head"], bones[tail_src]["tail"]]
    joint_names = list(dict.fromkeys(joint_names))
    joint_vidx = [np.array(joints[j]) for j in joint_names]

    # skin weights merged to kept bones
    mhw = json.load(open(os.path.join(data_dir, "rigs/default_weights.mhw")))["weights"]
    kid = {b: i for i, b in enumerate(KEEP)}
    W = np.zeros((n, len(KEEP)))
    for b, pairs in mhw.items():
        k = kid[kept_ancestor(b)]
        for v, w in pairs:
            W[v, k] += w
    s = W.sum(1, keepdims=True); s[s == 0] = 1; W /= s

    # ---- landmarks (indices into the original mesh), chosen geometrically on the neutral body
    lm = landmarks(V, body_idx, {k["id"]: (np.mean(V[joints[k["head"]]], 0), np.mean(V[joints[k["tail"]]], 0)) for k in kept})
    lm_names = list(lm.keys()); lm_vidx = np.array([lm[k] for k in lm_names])

    # ---- point layout: [decimated body | eyes | joints | landmarks]
    def points_of(M):
        body = (M[bary_idx] * bary_w[:, :, None]).sum(1)
        jp = np.array([M[ix].mean(0) for ix in joint_vidx])
        return np.concatenate([body, M[eye_idx], jp, M[lm_vidx]]) * DM
    ground = lambda M: np.array([0.0, (M[body_idx][:, 1]).min(), 0.0])
    nodes = []
    for M in corners:
        g = ground(M); nodes.append(points_of(M - g))
    for D in heights + ethnic:
        nodes.append(points_of(D))  # deltas: no ground shift (re-grounded at runtime)
    nodes = np.array(nodes)
    q = np.round(nodes / QUANT)
    assert np.abs(q).max() < 32767, np.abs(q).max()
    q = q.astype("<i2")

    nb = len(pts); ne = len(eye_idx); nj = len(joint_names); nl = len(lm_names)
    eye_local = {v: i for i, v in enumerate(eye_idx)}
    eye_tris = np.vectorize(lambda v: eye_local[v] + nb)(np.concatenate(eye_faces))
    all_faces = np.concatenate([faces, eye_tris]).astype("<u2")
    # weights for rendered points (body + eyes): barycentric blend, top 4
    # every point carries weights except joint points (posed by forward kinematics, rows left empty)
    Wb = (W[bary_idx] * bary_w[:, :, None]).sum(1)
    Wp = np.concatenate([Wb, W[eye_idx], np.zeros((nj, len(KEEP))), W[lm_vidx]])
    top = np.argsort(-Wp, 1)[:, :4]
    tw = np.take_along_axis(Wp, top, 1); tw /= np.maximum(tw.sum(1, keepdims=True), 1e-9)
    tw8 = np.round(tw * 255).astype(np.int64)
    tw8[:, 0] += 255 - tw8.sum(1)
    tw8[nb + ne:nb + ne + nj] = 0
    sk_idx = top.astype("<u1"); sk_w = tw8.astype("<u1")

    jindex = {j: i for i, j in enumerate(joint_names)}
    header = {
        "schema": "kumiki.anatomy.body-lattice/1",
        "source": {
            "name": "MakeHuman hm08 base mesh, macro targets, default skeleton and weights",
            "url": "https://github.com/makehumancommunity/makehuman",
            "revision": os.environ.get("MH_REVISION", "unknown"),
            "license": "CC0-1.0",
            "note": "Artist-sculpted parametric body; ANAT1 calibrates it against ANSUR II measurements (see docs).",
        },
        "units": "metres", "axes": "+x figure's left, +y up, +z forward; origin on the floor", "quant": QUANT,
        "counts": {"body": nb, "eyes": ne, "joints": nj, "landmarks": nl, "points": nb + ne + nj + nl, "faces": len(all_faces), "bodyFaces": len(faces)},
        "nodes": {"corners": corner_keys, "heights": height_keys, "ethnic": ethnic_keys},
        "bones": [{"id": k["id"], "parent": k["parent"], "head": nb + ne + jindex[k["head"]], "tail": nb + ne + jindex[k["tail"]]} for k in kept],
        "landmarks": {name: nb + ne + nj + i for i, name in enumerate(lm_names)},
        "eyes": {"L": [nb, nb + len(np.unique(G['helper-l-eye'].ravel()))], "R": [nb + len(np.unique(G['helper-l-eye'].ravel())), nb + ne]},
        "ageYears": {"min": 1, "child": 10, "young": 25, "max": 90},
    }
    sections = [("positions", q.tobytes()), ("faces", all_faces.tobytes()), ("skinIndex", sk_idx.tobytes()), ("skinWeight", sk_w.tobytes())]
    offset = 0; layout = {}
    blobs = []
    for name, b in sections:
        layout[name] = [offset, len(b)]
        pad = (-len(b)) % 4
        blobs.append(b + b"\0" * pad); offset += len(b) + pad
    header["layout"] = layout
    hj = json.dumps(header, separators=(",", ":")).encode()
    hj += b" " * ((-len(hj)) % 4)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(b"ANAT"); f.write(struct.pack("<I", len(hj))); f.write(hj)
        for b in blobs:
            f.write(b)
    print("wrote", out, os.path.getsize(out), "bytes", header["counts"], "sha256", hashlib.sha256(open(out, "rb").read()).hexdigest())


def landmarks(V, body_idx, J):
    """Named surface landmarks on the neutral mesh (MakeHuman units). Each is an original vertex index."""
    B = V[body_idx]
    def pick(score, mask=None):
        s = score(B).astype(float)
        if mask is not None:
            s = np.where(mask(B), s, -np.inf)
        return int(body_idx[int(np.argmax(s))])
    def near(p, mask=None):
        return pick(lambda b: -np.sum((b - p) ** 2, 1), mask)
    x, y, z = 0, 1, 2
    head_h, head_t = J["head"]; neck_h = J["neck01"][0]
    L = {}
    mid = lambda b: np.abs(b[:, x]) < 0.05
    L["vertex"] = pick(lambda b: b[:, y], mid)
    eye = J["eye.L"][0]
    L["pronasale"] = pick(lambda b: b[:, z], lambda b: mid(b) & (b[:, y] > eye[y] - 1.0) & (b[:, y] < eye[y]))
    nose = V[L["pronasale"]]
    L["sellion"] = pick(lambda b: -b[:, z], lambda b: mid(b) & (b[:, y] > eye[y] - 0.15) & (b[:, y] < eye[y] + 0.35) & (b[:, z] > nose[z] - 0.9))
    L["glabella"] = pick(lambda b: b[:, z], lambda b: mid(b) & (b[:, y] > V[L["sellion"]][y] + 0.08) & (b[:, y] < V[L["sellion"]][y] + 0.35))
    L["subnasale"] = pick(lambda b: -b[:, z], lambda b: mid(b) & (b[:, y] < nose[y]) & (b[:, y] > nose[y] - 0.45) & (b[:, z] > nose[z] - 0.6))
    L["menton"] = pick(lambda b: -b[:, y], lambda b: mid(b) & (b[:, z] > head_h[z] + 0.4) & (b[:, y] > neck_h[y] + 0.2) & (b[:, y] < nose[y] - 0.5))
    L["pogonion"] = pick(lambda b: b[:, z], lambda b: mid(b) & (b[:, y] > V[L["menton"]][y]) & (b[:, y] < V[L["menton"]][y] + 0.3))
    L["stomion"] = pick(lambda b: -b[:, z], lambda b: mid(b) & (b[:, y] > V[L["pogonion"]][y] + 0.25) & (b[:, y] < V[L["subnasale"]][y] - 0.12) & (b[:, z] > V[L["pogonion"]][z] - 0.2))
    L["opisthocranion"] = pick(lambda b: -b[:, z], lambda b: mid(b) & (b[:, y] > eye[y] - 0.2))
    L["tragion.L"] = near(np.array([head_h[x] + 0.68, eye[y] - 0.25, head_h[z] + 0.05]) * [1, 1, 1], lambda b: b[:, x] > 0.5)
    L["tragion.R"] = mirror(V, body_idx, L["tragion.L"])
    L["zygion.L"] = pick(lambda b: b[:, x], lambda b: (b[:, y] > eye[y] - 0.45) & (b[:, y] < eye[y] - 0.1) & (b[:, z] > head_h[z] + 0.35))
    L["zygion.R"] = mirror(V, body_idx, L["zygion.L"])
    L["gonion.L"] = pick(lambda b: b[:, x] - 0.6 * b[:, y], lambda b: (b[:, y] > V[L["menton"]][y]) & (b[:, y] < nose[y] - 0.3) & (b[:, z] > head_h[z] - 0.2) & (b[:, x] > 0) & (b[:, x] < 0.75))
    L["gonion.R"] = mirror(V, body_idx, L["gonion.L"])
    # C7 spinous process: back midline at the base of the neck (neck01 joint). Jugular notch: front midline between
    # the sternal ends of the clavicles.
    c7 = J["neck01"][0]
    L["cervicale"] = pick(lambda b: -np.abs(b[:, y] - c7[y]), lambda b: mid(b) & (b[:, z] < c7[z]))
    cl = J["clavicle.L"][0]
    L["suprasternale"] = pick(lambda b: -np.abs(b[:, y] - cl[y]), lambda b: mid(b) & (b[:, z] > cl[z]))
    sh = J["upperarm.L"][0] if "upperarm.L" in J else None
    sh = J["shoulder.L"][1] if sh is None else sh
    # acromion: lateral tip of the shoulder roof, above the humeral head (head centre + ~3 cm)
    L["acromion.L"] = pick(lambda b: b[:, x], lambda b: (b[:, y] > sh[y] + 0.3) & (np.abs(b[:, z] - sh[z]) < 0.5) & (b[:, x] < sh[x] + 1.0))
    L["acromion.R"] = mirror(V, body_idx, L["acromion.L"])
    sp = J["spine02"][0]
    L["thelion.L"] = pick(lambda b: b[:, z], lambda b: (b[:, x] > 0.5) & (b[:, x] < 1.4) & (b[:, y] > sp[y] - 0.8) & (b[:, y] < sp[y] + 1.2))
    L["thelion.R"] = mirror(V, body_idx, L["thelion.L"])
    pel = J["root"][0]
    L["omphalion"] = pick(lambda b: -b[:, z], lambda b: mid(b) & (b[:, z] > pel[z] + 0.4) & (b[:, y] > pel[y] + 0.4) & (b[:, y] < pel[y] + 1.6))
    hip = J["thigh.L"][0]
    # iliac crest: supracristal plane through L4 (midpoint of the spine04 bone); the lateral surface at that level
    l4 = (J["spine04"][0] + J["spine04"][1]) / 2
    L["iliocristale.L"] = pick(lambda b: b[:, x], lambda b: (np.abs(b[:, y] - l4[y]) < 0.06) & (b[:, x] < hip[x] * 2.2) & (np.abs(b[:, z]) < 1.2))
    L["iliocristale.R"] = mirror(V, body_idx, L["iliocristale.L"])
    L["trochanterion.L"] = pick(lambda b: b[:, x], lambda b: np.abs(b[:, y] - (hip[y] - 0.3)) < 0.25)
    L["trochanterion.R"] = mirror(V, body_idx, L["trochanterion.L"])
    L["buttock.L"] = pick(lambda b: -b[:, z], lambda b: (b[:, x] > 0.3) & (b[:, y] < hip[y] + 0.3) & (b[:, y] > hip[y] - 1.6))
    L["buttock.R"] = mirror(V, body_idx, L["buttock.L"])
    L["crotch"] = pick(lambda b: -b[:, y], lambda b: mid(b) & (b[:, y] > hip[y] - 2.0) & (b[:, y] < hip[y] + 0.2))
    knee = J["shin.L"][0]
    L["patella.L"] = pick(lambda b: b[:, z], lambda b: (np.abs(b[:, y] - knee[y]) < 0.06) & (np.abs(b[:, x] - knee[x]) < 0.6))
    L["patella.R"] = mirror(V, body_idx, L["patella.L"])
    L["femoral-epicondyle.L"] = pick(lambda b: b[:, x], lambda b: (np.abs(b[:, y] - knee[y]) < 0.12) & (np.abs(b[:, x] - knee[x]) < 0.8))
    L["femoral-epicondyle.R"] = mirror(V, body_idx, L["femoral-epicondyle.L"])
    ank = J["foot.L"][0]
    L["lateral-malleolus.L"] = pick(lambda b: b[:, x], lambda b: (np.abs(b[:, y] - ank[y]) < 0.12) & (np.abs(b[:, x] - ank[x]) < 0.6) & (np.abs(b[:, z] - ank[z]) < 0.4))
    L["lateral-malleolus.R"] = mirror(V, body_idx, L["lateral-malleolus.L"])
    L["medial-malleolus.L"] = pick(lambda b: -b[:, x], lambda b: (np.abs(b[:, y] - ank[y]) < 0.15) & (b[:, x] > 0.4) & (np.abs(b[:, x] - ank[x]) < 0.6) & (np.abs(b[:, z] - ank[z]) < 0.4))
    L["medial-malleolus.R"] = mirror(V, body_idx, L["medial-malleolus.L"])
    L["pternion.L"] = pick(lambda b: -b[:, z], lambda b: (b[:, y] < ank[y]) & (np.abs(b[:, x] - ank[x]) < 0.6))
    L["pternion.R"] = mirror(V, body_idx, L["pternion.L"])
    L["acropodion.L"] = pick(lambda b: b[:, z], lambda b: (b[:, y] < ank[y]) & (np.abs(b[:, x] - ank[x]) < 0.8))
    L["acropodion.R"] = mirror(V, body_idx, L["acropodion.L"])
    el = J["forearm.L"][0]
    L["olecranon.L"] = pick(lambda b: -b[:, z], lambda b: np.sum((b - el) ** 2, 1) < 0.3 ** 2)
    L["olecranon.R"] = mirror(V, body_idx, L["olecranon.L"])
    wr = J["wrist.L"][0]
    L["stylion.L"] = near(wr, lambda b: b[:, x] > 0)
    L["stylion.R"] = mirror(V, body_idx, L["stylion.L"])
    tip = J["finger3-3.L"][1]
    L["dactylion.L"] = near(tip + (tip - J["finger3-3.L"][0]) * 0.3, lambda b: b[:, x] > 0)
    L["dactylion.R"] = mirror(V, body_idx, L["dactylion.L"])
    return L


def mirror(V, body_idx, i):
    p = V[i] * [-1, 1, 1]
    B = V[body_idx]
    return int(body_idx[int(np.argmin(np.sum((B - p) ** 2, 1)))])


if __name__ == "__main__":
    main()
