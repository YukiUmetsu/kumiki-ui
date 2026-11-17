"""
Per face type (group and sex): the stars' landmarks averaged in the landmark model's measurement space. One photograph
a person: alone in the frame, |yaw| <= MAXYAW, the face at least MINW px wide, the eyes open; a calm one (mouth closed,
no smile) if the person has one, else the most frontal. The upper face from every photograph chosen; below the nose tip
only from calm ones (or closed mouths, if fewer than three are calm). mouthCorner: the corners' drop below the lips'
midline on calm mouths, mm (eye-centre distance taken as the mean pupil distance, ANSUR II).
Usage: targets.py OUT.json GEO.json exclude.json
"""
import json, sys, numpy as np
out, geo, excl = sys.argv[1:4]
G = {k: v for k, v in json.load(open(geo)).items() if v}
R = {}; X = set(json.load(open(excl)))
MAXYAW, MINW = 22, 120
def stats(Q):
    gap = float(np.linalg.norm(Q[13, :2] - Q[14, :2])); corners = 0.5 * (Q[61, 1] + Q[291, 1]) - 0.5 * (Q[13, 1] + Q[14, 1])
    width = float(np.linalg.norm(Q[61, :2] - Q[291, :2]))
    op = np.mean([(Q[u, 1] - Q[l, 1]) / np.linalg.norm(Q[o, :2] - Q[i, :2]) for o, i, u, l in ((33, 133, 159, 145), (263, 362, 386, 374))])
    return gap, corners, width, op
people = {}
for f, r in G.items():
    if not r or f in X: continue
    parts = f.split("__")
    if len(parts) == 4: key = f"{parts[0]}|{parts[1]}|"; name = parts[2]
    else: continue
    people.setdefault((parts[0], parts[1], name), []).append(f)
for key, fs in R.items():  # photographs measured earlier, under the old naming
    g, sx, name = key.split("|")
    for f in fs:
        if f in G and G[f] and f not in X: people.setdefault((g, sx, "old:" + name), []).append(f)
res = {}
for (g, sx, name), fs in people.items():
    best = None
    for f in fs:
        r = G[f]
        if abs(r["yaw"]) > MAXYAW or r.get("others", 0) > 0 or r.get("faceW", 999) < MINW: continue
        Q = np.array(r["Q"]); gap, corners, width, op = stats(Q)
        if op < 0.27: continue
        calm = gap < 0.035 and corners < 0.02 and width < 0.95
        k = (0 if calm else 1, abs(r["yaw"]) + 0.3 * abs(r["pitch"] - 10))
        if best is None or k < best[0]: best = (k, f, calm, gap < 0.035)
    if best: res.setdefault(f"{g}:{sx}", []).append((name, best[1], best[2], best[3]))
T = {}
for key, rows in sorted(res.items()):
    # the same person may come twice (new and old photographs): keep one
    seen, uniq = set(), []
    for name, f, calm, closed in sorted(rows, key=lambda r: (not r[2], r[0])):
        nm = name.replace("old:", "").replace("_", " ").lower().strip()
        if nm in seen: continue
        seen.add(nm); uniq.append((name, f, calm, closed))
    Qs = np.array([G[f]["Q"] for _, f, _, _ in uniq]); calm = np.array([c for *_, c, _ in uniq]); closed = np.array([c for *_, c in uniq])
    mean = Qs.mean(0); lower = mean[:, 1] < mean[1, 1]
    sub = calm if calm.sum() >= 3 else closed if closed.sum() >= 3 else np.ones(len(uniq), bool)
    mean = np.where(lower[:, None], Qs[sub].mean(0), mean)
    ipd = 61.7 if key.endswith("female") else 64.0
    cs = [(0.5 * (Q[61, 1] + Q[291, 1]) - 0.5 * (Q[13, 1] + Q[14, 1])) * ipd for Q in Qs[calm]] if calm.sum() else []
    T[key] = {"mean": mean.tolist(), "n": len(uniq), "calm": int(calm.sum()), "files": [f for _, f, _, _ in uniq],
              "people": [n.replace("old:", "").replace("_", " ") for n, *_ in uniq], "mouthCorner": round(float(-np.mean(cs)), 2) if len(cs) >= 2 else None}
    print(key, "n", len(uniq), "calm", int(calm.sum()), "lower face from", int(sub.sum()), "corner", T[key]["mouthCorner"])
json.dump(T, open(out, "w"))
