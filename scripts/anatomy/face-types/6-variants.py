"""
Face-shape variants within each face type: the type's stars split into two clusters by face shape (k-means on the
identity landmarks: the face's outline, brows, eye corners, nose, mouth corners; never the lids or the lips' closure),
each cluster of at least MIN people. A variant is the type plus the difference between its cluster's average and the
whole type's, mapped to millimetres (same measurement space, so the landmark model's reading of renders cancels),
symmetrised and smoothed. Named by the measures it changes most.
Usage: variants.py targets.json geo.json face-types.json MODEL   (writes "variants" into each type)
"""
import json, os, sys, fcntl, subprocess
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from facegeo import detector, measure, frontal
targets, geo, data_path, model = sys.argv[1:5]
T = json.load(open(targets)); G = {k: v for k, v in json.load(open(geo)).items() if v}
MIN = 4
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
IDENT = OVAL + [70, 63, 105, 66, 107, 300, 293, 334, 296, 336, 46, 53, 52, 65, 55, 276, 283, 282, 295, 285, 33, 133, 263, 362, 1, 2, 4, 6, 168, 98, 327, 129, 358, 61, 291]
LIDS = [246, 161, 160, 159, 158, 157, 173, 7, 163, 144, 145, 153, 154, 155, 466, 388, 387, 386, 385, 384, 398, 249, 390, 373, 374, 380, 381, 382]
LIPS = [0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 409, 415]
def measures(Q):
    d = lambda a, b: float(np.linalg.norm(Q[a, :2] - Q[b, :2]))
    return {"face length": float(Q[10, 1] - Q[152, 1]), "cheek width": d(234, 454), "jaw width": d(172, 397), "chin width": d(149, 378),
            "eye width": 0.5 * (d(33, 133) + d(263, 362)), "nose width": d(129, 358), "brow height": 0.5 * (float(Q[105, 1] - Q[33, 1]) + float(Q[334, 1] - Q[263, 1]))}
WORDS = {"face length": ("a longer face", "a shorter face"), "cheek width": ("wider cheekbones", "narrower cheekbones"), "jaw width": ("a wider jaw", "a narrower jaw"),
         "chin width": ("a broader chin", "a finer chin"), "eye width": ("longer eyes", "shorter eyes"), "nose width": ("a wider nose", "a narrower nose"), "brow height": ("higher brows", "lower brows")}
def kmeans2(X, seed):
    rng = np.random.default_rng(seed); best = None
    for _ in range(30):
        c = X[rng.choice(len(X), 2, replace=False)]
        for _ in range(50):
            lab = np.argmin(((X[:, None] - c[None]) ** 2).sum(-1), 1)
            if min((lab == 0).sum(), (lab == 1).sum()) == 0: break
            c = np.array([X[lab == j].mean(0) for j in (0, 1)])
        if min((lab == 0).sum(), (lab == 1).sum()) < MIN: continue
        inertia = sum(((X[lab == j] - c[j]) ** 2).sum() for j in (0, 1))
        if best is None or inertia < best[0]: best = (inertia, lab.copy())
    return None if best is None else best[1]
# the mesh's frame: x and y of the canonical face against the landmark frame (from one render, as the fit does)
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
det = detector(model)
def render_frame(group, sex):
    out = f"{HERE}/fit/var-{group}-{sex}"; os.makedirs(f"{HERE}/fit", exist_ok=True)
    opts = {"sex": 0 if sex == "female" else 1, "faceType": group, "width": 640, "height": 800, "supersample": 2, "hairStyle": "bun" if sex == "female" else "buzz", "hairStrands": 6000, "makeup": "none"}
    subprocess.run(["npx", "vite-node", f"{HERE}/fit_face.ts", json.dumps(opts), out], cwd=REPO, check=True, capture_output=True)
    d = json.load(open(out + ".verts.json")); import cv2
    rgba = np.frombuffer(open(out + ".rgba", "rb").read(), np.uint8).reshape(d["h"], d["w"], 4); cv2.imwrite(out + ".jpg", cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR))
    Q = frontal(measure(det, out + ".jpg"))[:468]; V = np.array(d["vertices"])
    A, B = Q[:, :2], V[:, :2]; ma, mb = A.mean(0), B.mean(0); U, S_, Vt = np.linalg.svd((A - ma).T @ (B - mb)); M = (U @ Vt).T
    return S_.sum() / ((A - ma) ** 2).sum() * M, V
results = {}
for key, tg in T.items():
    files = tg["files"]
    if len(files) < 2 * MIN: continue
    Qs = np.array([G[f]["Q"] for f in files])[:, :468, :2]
    X = Qs[:, IDENT, :].reshape(len(files), -1); X = X - X.mean(0)
    lab = kmeans2(X, 7)
    if lab is None: continue
    group, sex = key.split(":")
    SR, V = render_frame(group, sex)
    mir = np.array([np.argmin(((V - V[i] * np.array([-1, 1, 1])) ** 2).sum(1)) for i in range(468)])
    d2 = ((V[:, None, :] - V[None, :, :]) ** 2).sum(-1); W = np.exp(-d2 / (2 * 4.0 ** 2)); W /= W.sum(1, keepdims=True)
    allm = Qs.mean(0); per = [measures(q) for q in Qs]; sd = {k: np.std([p[k] for p in per]) + 1e-9 for k in per[0]}
    vs = []
    for j in (0, 1):
        D = (Qs[lab == j].mean(0) - allm) @ SR.T
        D[LIDS] = 0; D[LIPS] = 0  # lids and lips are the face's own (lids on the iris; the lips' fullness from the findings)
        D3 = np.zeros((468, 3)); D3[:, :2] = D
        D3 = 0.5 * (D3 + D3[mir] * np.array([-1, 1, 1])); D3 = W @ D3
        mc = measures(Qs[lab == j].mean(0)); ma_ = measures(allm)
        z = sorted(((mc[k] - ma_[k]) / sd[k], k) for k in mc)
        top = sorted(z, key=lambda t: -abs(t[0]))[:2]
        label = ", ".join(WORDS[k][0 if v > 0 else 1] for v, k in top)
        vs.append({"label": label[0].upper() + label[1:], "n": int((lab == j).sum()), "offsets": np.round(D3[:, :2], 2).tolist()})
        print(key, "variant", j + 1, int((lab == j).sum()), "people:", label, "| max", round(float(np.abs(D3).max()), 2), "mm", flush=True)
    results[key] = vs
lock = open(data_path + ".lock", "w"); fcntl.flock(lock, fcntl.LOCK_EX)
data = json.load(open(data_path))
for key, vs in results.items():
    if key in data["types"]: data["types"][key]["variants"] = vs
json.dump(data, open(data_path + ".tmp", "w"), separators=(",", ":"), ensure_ascii=False); os.replace(data_path + ".tmp", data_path)
fcntl.flock(lock, fcntl.LOCK_UN)
print("variants written for", len(results), "types")
